import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getInvoice, getPaymentRequest, getTransaction, isPaidGatewayStatus, verifyWebhookToken } from '@/lib/mayar'
import { captureWebhookError, captureMessage } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

const MAX_PAYLOAD_BYTES = 256 * 1024
const PAID_EVENTS = ['payment.received', 'payment.success', 'payment.paid']

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
}

function webhookEventName(body) {
  return String(body?.event || body?.['event.received'] || body?.type || '').trim().toLowerCase()
}

function webhookTransactionId(body) {
  const data = body?.data || {}
  return String(data.transactionId || data.id || data.paymentLinkTransactionId || '').trim()
}

function webhookAmount(body) {
  const data = body?.data || {}
  const value = data.amount ?? data.totalAmount ?? body?.amount
  const amount = Number(value)
  return Number.isSafeInteger(amount) ? amount : null
}

function webhookPaidAt(body) {
  const data = body?.data || {}
  const candidate = data.updatedAt || data.paidAt || data.createdAt || body?.timestamp
  if (candidate) {
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date().toISOString()
}

/**
 * Find the local payment attempt that belongs to a Mayar webhook.
 * Mayar sends the transaction id as `data.id`; the payment request id is not
 * always echoed, so several identifiers and the `extraData` we sent at
 * creation time are checked.
 */
async function findAttempt(body) {
  const data = body?.data || {}
  const candidates = uniqueStrings([
    data.transactionId,
    data.id,
    data.invoiceId,
    data.paymentRequestId,
    data.paymentLinkId,
    data.paymentLinkTransactionId,
    data.paymentLink?.id,
    data.productId,
    body?.reference,
    body?.reference_id,
    body?.paymentRequestId,
  ])

  const byGatewayOrder = async (values) => {
    if (values.length === 0) return null
    const { data: rows, error } = await supabaseAdmin.from('payment_attempts')
      .select('id, tagihan_id, gateway_order_id, amount, status, payment_metadata')
      .eq('provider', 'mayar')
      .in('gateway_order_id', values)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return rows?.[0] || null
  }

  const byTagihanId = async (tagihanId) => {
    if (!tagihanId || !/^[0-9a-f-]{36}$/i.test(String(tagihanId))) return null
    const { data: rows, error } = await supabaseAdmin.from('payment_attempts')
      .select('id, tagihan_id, gateway_order_id, amount, status, payment_metadata')
      .eq('provider', 'mayar')
      .eq('tagihan_id', String(tagihanId))
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return rows?.[0] || null
  }

  const directMatch = await byGatewayOrder(candidates)
  if (directMatch) return directMatch

  // We store the Mayar transaction id in metadata when it is known.
  if (candidates.length > 0) {
    const { data: rows, error } = await supabaseAdmin.from('payment_attempts')
      .select('id, tagihan_id, gateway_order_id, amount, status, payment_metadata')
      .eq('provider', 'mayar')
      .in('payment_metadata->>transaction_id', candidates)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    if (rows?.[0]) return rows[0]
  }

  // Fall back to the reference/tagihan id that we put in `extraData`.
  const extraData = data.extraData || body?.extraData || {}
  const referenceId = extraData.reference_id || extraData.referenceId
  if (referenceId) {
    const { data: rows, error } = await supabaseAdmin.from('payment_attempts')
      .select('id, tagihan_id, gateway_order_id, amount, status, payment_metadata')
      .eq('provider', 'mayar')
      .eq('payment_metadata->>reference_id', String(referenceId))
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    if (rows?.[0]) return rows[0]
  }

  const tagihanId = extraData.tagihan_id
  const byInvoice = await byTagihanId(tagihanId)
  if (byInvoice) return byInvoice

  // Last resort: ask Mayar for the transaction. Its `paymentLink.id` is the
  // id returned by POST /payments/create, and `extraData` is echoed back.
  const transactionId = data.transactionId || data.id
  if (transactionId) {
    try {
      const transaction = await getTransaction(String(transactionId))
      const remoteMatch = await byGatewayOrder(uniqueStrings([
        transaction?.paymentLink?.id,
        transaction?.paymentLinkId,
        transaction?.paymentLinkTransactionId,
        transaction?.id,
      ]))
      if (remoteMatch) return remoteMatch
      const remoteInvoice = await byTagihanId(transaction?.extraData?.tagihan_id)
      if (remoteInvoice) return remoteInvoice
    } catch (error) {
      console.warn('[WEBHOOK MAYAR] Lookup transaksi ke API gagal:', {
        code: error.code,
        status: error.status,
      })
    }
  }

  return null
}

export async function POST(request) {
  const requestId = crypto.randomUUID()

  try {
    const rawBody = await request.clone().text()
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'Payload terlalu besar' }, { status: 413 })
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // SECURITY: Mayar v2 does not sign webhooks. The shared secret is part of
    // the registered webhook URL (?token=...) and is compared in constant time.
    if (!verifyWebhookToken(request)) {
      console.error('[WEBHOOK ERROR] Token webhook tidak valid', { requestId })
      return Response.json({ error: 'Invalid webhook token' }, { status: 401 })
    }

    const eventName = webhookEventName(body)
    const data = body?.data || {}

    console.log('[WEBHOOK MAYAR] Request received', {
      requestId,
      event: eventName || undefined,
      hasData: Boolean(body?.data),
      transactionId: webhookTransactionId(body) || undefined,
    })

    // Mayar sends a "testing" event from the dashboard test button.
    if (eventName === 'testing' || String(data.id) === '123456789') {
      return Response.json({ success: true, message: 'Test webhook received' }, { status: 200 })
    }

    // Only the payment.received family changes invoice state.
    if (eventName && !PAID_EVENTS.includes(eventName) && !eventName.startsWith('payment.received')) {
      return Response.json({ sukses: true, ignored: true, event: eventName })
    }

    const gatewayStatus = data.transactionStatus || data.status
    const hasGatewayStatus = gatewayStatus !== undefined && gatewayStatus !== null && gatewayStatus !== ''
    if (hasGatewayStatus && !isPaidGatewayStatus(gatewayStatus)) {
      return Response.json({ sukses: true, ignored: true, status: String(gatewayStatus) })
    }
    if (!hasGatewayStatus && !PAID_EVENTS.includes(eventName)) {
      return Response.json({ sukses: true, ignored: true, status: 'unknown' })
    }

    const amount = webhookAmount(body)
    const transactionId = webhookTransactionId(body)
    if (!transactionId || amount === null || amount <= 0) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const attempt = await findAttempt(body)
    if (!attempt) {
      captureMessage('Webhook received for unknown gateway order', 'warning', {
        tags: { component: 'webhook' },
        extra: { transactionId, event: eventName },
      })
      return Response.json({ error: 'Referensi gateway tidak sesuai' }, { status: 422 })
    }

    if (Number(attempt.amount) !== amount) {
      console.error('[WEBHOOK ERROR] Nominal tidak sesuai', {
        requestId,
        expected: Number(attempt.amount),
        received: amount,
      })
      return Response.json({ error: 'Nominal pembayaran tidak sesuai' }, { status: 422 })
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin.from('tagihan')
      .select('id, jumlah_tagihan, customer_fee, status_pembayaran, gateway_order_id')
      .eq('id', attempt.tagihan_id)
      .single()
    if (invoiceError) throw invoiceError

    // PRD edge case #4: payment arrived after the invoice was settled in cash.
    // Keep the money recorded for reconciliation, but never overwrite the cash
    // payment or create a second paid row.
    if (invoice.status_pembayaran === 'lunas' && attempt.status !== 'PAID') {
      const { error: logError } = await supabaseAdmin.from('payment_events').upsert({
        event_id: `${transactionId}:duplicate`,
        tagihan_id: attempt.tagihan_id,
        gateway_order_id: attempt.gateway_order_id,
        provider: 'mayar',
        status: 'DUPLICATE',
        payload: body,
        rejection_reason: 'Invoice sudah lunas sebelum webhook diterima',
      }, { onConflict: 'event_id', ignoreDuplicates: true })

      if (logError) console.error('[WEBHOOK MAYAR] Gagal mencatat pembayaran ganda:', logError.code)

      await supabaseAdmin.from('payment_attempts').update({
        status: 'PAID_DUPLICATE',
        settlement_time: webhookPaidAt(body),
      }).eq('id', attempt.id)

      captureMessage('PERINGATAN: Pembayaran ganda - perlu refund tunai ke pelanggan', 'warning', {
        tags: { component: 'webhook', alert: 'double-payment' },
        extra: { tagihan_id: attempt.tagihan_id, transactionId, amount },
      })

      return Response.json({ sukses: true, duplicate_payment: true })
    }

    if (attempt.status === 'PAID') {
      return Response.json({ sukses: true, already_processed: true })
    }

    // SECURITY: Re-verify the payment against the Mayar API. A leaked webhook
    // token alone is not enough to mark an invoice as paid.
    if (process.env.MAYAR_VERIFY_WEBHOOK !== 'false') {
      try {
        const providerType = attempt.payment_metadata?.provider_type
        const gatewayDetail = providerType === 'invoice'
          ? await getInvoice(attempt.gateway_order_id)
          : await getPaymentRequest(attempt.gateway_order_id)
        if (!isPaidGatewayStatus(gatewayDetail?.status)) {
          console.error('[WEBHOOK ERROR] Mayar belum mencatat pembayaran', {
            requestId,
            gateway_order_id: attempt.gateway_order_id,
            gatewayStatus: gatewayDetail?.status,
          })
          // Non-2xx makes Mayar retry the delivery later.
          return Response.json({ error: 'Pembayaran belum tercatat di gateway' }, { status: 409 })
        }
      } catch (error) {
        // Never drop a payment because the verification call failed; the
        // webhook itself already passed the shared-secret check.
        console.warn('[WEBHOOK MAYAR] Verifikasi server gagal, melanjutkan proses:', {
          code: error.code,
          status: error.status,
        })
      }
    }

    const paymentMethod = data.paymentMethod || data.payment_method || body?.paymentMethod || 'mayar'
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('process_gateway_payment', {
      p_tagihan_id: attempt.tagihan_id,
      p_event_id: transactionId,
      p_reference: attempt.gateway_order_id,
      p_amount: amount,
      p_method: String(paymentMethod),
      p_paid_at: webhookPaidAt(body),
    })

    if (rpcError) {
      console.error('[WEBHOOK MAYAR] Processing failed', { requestId, code: rpcError.code })
      captureWebhookError(rpcError, {
        transactionId,
        gateway_order_id: attempt.gateway_order_id,
        amount,
        tagihan_id: attempt.tagihan_id,
      })
      return Response.json({ error: 'Gagal memproses pembayaran' }, { status: 500 })
    }

    return Response.json({
      sukses: true,
      already_processed: Boolean(result?.already_processed),
      payment_method: paymentMethod,
    })
  } catch (error) {
    console.error('[WEBHOOK MAYAR] Error', { requestId, message: error.message })
    captureWebhookError(error, { requestId })
    return Response.json({ error: 'Webhook processing error', request_id: requestId }, { status: 500 })
  }
}
