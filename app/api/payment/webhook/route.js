import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyWebhookSignature } from '@/lib/mayar'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const requestId = crypto.randomUUID()
  try {
    const rawBody = await request.clone().text()
    if (rawBody.length > 256 * 1024) return Response.json({ error: 'Payload terlalu besar' }, { status: 413 })
    let body
    try {
      body = await request.json()
      // Log only non-sensitive diagnostics. Never log the raw body or header values:
      // either may contain personal data or the webhook signature.
      console.log('[WEBHOOK MAYAR] Request received', {
        event: typeof body?.event === 'string' ? body.event : undefined,
        hasData: Boolean(body?.data),
        signatureHeaderPresent: Boolean(
          request.headers.get('x-mayar-signature') || request.headers.get('x-signature')
        ),
      })
      if (body?.event === 'testing' || body?.data?.id === '123456789') {
        return Response.json({ success: true, message: 'Test webhook received' }, { status: 200 })
      }
    } catch {
      // Ignore early parse errors here; invalid payloads are rejected below.
    }
    if (!body) {
      try { body = JSON.parse(rawBody) } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
    }

    const signature = request.headers.get('x-mayar-signature') || request.headers.get('x-signature')
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[WEBHOOK ERROR] Signature mismatch', { requestId, payloadHash })
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const eventId = String(body.event_id || body.eventId || body.id || '')
    const gatewayOrderId = String(body.reference || body.reference_id || body.data?.reference || body.data?.id || '')
    const status = String(body.status || body.event || body.data?.status || '').toUpperCase()
    const amount = Number(body.amount ?? body.data?.amount)
    if (!eventId || !gatewayOrderId || !Number.isSafeInteger(amount)) return Response.json({ error: 'Invalid webhook payload' }, { status: 400 })

    const { data: attempt, error: attemptError } = await supabaseAdmin.from('payment_attempts')
      .select('id, tagihan_id, gateway_order_id, amount, status')
      .eq('provider', 'mayar').eq('gateway_order_id', gatewayOrderId).maybeSingle()
    if (attemptError) throw attemptError
    if (!attempt) return Response.json({ error: 'Referensi gateway tidak sesuai' }, { status: 422 })
    if (Number(attempt.amount) !== amount) return Response.json({ error: 'Nominal pembayaran tidak sesuai' }, { status: 422 })

    if (!['PAID', 'SUCCESS', 'SETTLEMENT'].includes(status)) {
      return Response.json({ sukses: true, ignored: true })
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc('process_gateway_payment', {
      p_tagihan_id: attempt.tagihan_id, p_event_id: eventId, p_reference: gatewayOrderId,
      p_amount: amount, p_method: body.payment_method || body.data?.payment_method || 'mayar',
      p_paid_at: body.paid_at || body.data?.paid_at || new Date().toISOString(),
    })
    if (rpcError) {
      console.error('[WEBHOOK MAYAR] Processing failed', { requestId, code: rpcError.code })
      return Response.json({ error: 'Gagal memproses pembayaran' }, { status: 500 })
    }
    return Response.json({ sukses: true, already_processed: Boolean(result?.already_processed) })
  } catch (error) {
    console.error('[WEBHOOK MAYAR] Error', { requestId, message: error.message })
    return Response.json({ error: 'Webhook processing error', request_id: requestId }, { status: 500 })
  }
}
