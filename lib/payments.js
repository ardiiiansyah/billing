import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  closePaymentRequest,
  createInvoice,
  expireInvoice,
  getInvoice,
  getPaymentRequest,
  getTransaction,
  isPaidGatewayStatus,
  MayarError,
  toExpirationIso,
} from '@/lib/mayar'
import { capturePaymentError } from '@/lib/monitoring'

export class PaymentError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PaymentError'
    this.status = status
  }
}

// PRD FR-3.4: estimasi fee gateway QRIS ~Rp 800, 30% dibebankan ke pelanggan.
const GATEWAY_FEE_ESTIMATE = 800
export const CUSTOMER_FEE = Math.ceil(GATEWAY_FEE_ESTIMATE * 0.30) // Rp 240
const ACTIVE_STATUSES = ['PENDING', 'OPEN']
const EXPIRED_STATUSES = ['EXPIRED', 'CANCELLED', 'CLOSED']

export function calculateInvoiceTotal(baseAmount, customerFee = CUSTOMER_FEE) {
  return Number(baseAmount) + Number(customerFee)
}

function readMetadata(attempt) {
  return attempt?.payment_metadata && typeof attempt.payment_metadata === 'object'
    ? attempt.payment_metadata
    : {}
}

function isAttemptExpired(attempt) {
  const expiresAt = readMetadata(attempt).expires_at
  if (!expiresAt) return false
  const timestamp = new Date(expiresAt).getTime()
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

/**
 * Mayar invoices require an email. RT/RW Net customers are billed over
 * WhatsApp, so a stable placeholder is derived from the customer code instead
 * of asking the admin to maintain email addresses.
 */
function buildCustomerEmail(invoice, tagihanId) {
  const code = String(invoice.pelanggan?.kode_pelanggan || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
  const localPart = code || `tagihan-${tagihanId.slice(0, 8)}`
  return `${localPart}@pelanggan.example.com`
}

export async function getActiveAttempt(tagihanId) {
  const { data, error } = await supabaseAdmin.from('payment_attempts')
    .select('*').eq('tagihan_id', tagihanId).eq('provider', 'mayar')
    .in('status', ACTIVE_STATUSES).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, operation: 'getActiveAttempt' })
    throw error
  }
  return data
}

export async function getLatestAttempt(tagihanId) {
  const { data, error } = await supabaseAdmin.from('payment_attempts')
    .select('*').eq('tagihan_id', tagihanId).eq('provider', 'mayar')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, operation: 'getLatestAttempt' })
    throw error
  }
  return data
}

/**
 * Close/expire the previous gateway link (best effort) and mark the local
 * attempt as expired. Used by "Perpanjang & Kirim Ulang Link" (PRD edge case #2).
 */
export async function expireAttempt(attempt, { closeAtGateway = true } = {}) {
  if (!attempt?.id) return

  if (closeAtGateway && attempt.gateway_order_id) {
    try {
      if (readMetadata(attempt).provider_type === 'invoice') {
        await expireInvoice(attempt.gateway_order_id, attempt.amount)
      } else {
        await closePaymentRequest(attempt.gateway_order_id)
      }
    } catch (error) {
      // 409 means the request is already paid/closed; that is fine for us.
      console.warn('[PAYMENT] Tidak dapat menutup link pembayaran lama:', {
        attempt_id: attempt.id,
        code: error.code,
        status: error.status,
      })
    }
  }

  const { error } = await supabaseAdmin.from('payment_attempts')
    .update({ status: 'EXPIRED' })
    .eq('id', attempt.id)
  if (error) {
    capturePaymentError(error, { attempt_id: attempt.id, operation: 'expireAttempt' })
    throw error
  }
}

export async function createAttemptForInvoice(tagihanId, { forceRenew = false } = {}) {
  // SECURITY: Always fetch invoice amount from database, NEVER trust client-provided values
  const { data: invoice, error } = await supabaseAdmin.from('tagihan')
    .select('id, jumlah_tagihan, bulan, tahun, tanggal_jatuh_tempo, status_pembayaran, customer_fee, pelanggan:pelanggan_id(nama, no_wa, kode_pelanggan, paket:paket_id(nama_paket, kecepatan))')
    .eq('id', tagihanId).single()

  if (error?.code === 'PGRST116' || !invoice) throw new PaymentError('Tagihan tidak ditemukan', 404)
  if (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, operation: 'fetchInvoice' })
    throw error
  }

  // Validate invoice status - only allow payment for unpaid invoices
  if (!['belum_bayar', 'UNPAID', 'OVERDUE'].includes(invoice.status_pembayaran)) {
    throw new PaymentError('Tagihan tidak tersedia untuk pembayaran', 409)
  }

  const active = await getActiveAttempt(tagihanId)
  if (active) {
    if (!forceRenew && !isAttemptExpired(active)) {
      return { invoice, attempt: active, reused: true }
    }
    // The previous link is expired or the admin asked for a new one.
    await expireAttempt(active)
  } else if (forceRenew) {
    const latest = await getLatestAttempt(tagihanId)
    if (latest && !EXPIRED_STATUSES.includes(latest.status) && latest.status !== 'PAID') {
      await expireAttempt(latest, { closeAtGateway: false })
    }
  }

  // SECURITY: Validate amount from database is a valid positive integer
  const amount = Number(invoice.jumlah_tagihan)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new PaymentError('Nominal tagihan tidak valid', 409)
  }

  const customerFee = Number.isFinite(Number(invoice.customer_fee)) && Number(invoice.customer_fee) > 0
    ? Number(invoice.customer_fee)
    : CUSTOMER_FEE
  const total = calculateInvoiceTotal(amount, customerFee)

  // PRD FR-4.1: link expires on the invoice due date (billing_date + 3 days).
  // Overdue invoices get a fresh 3-day window when renewed.
  const dueDate = invoice.tanggal_jatuh_tempo
  const expiresAt = toExpirationIso(dueDate, { fallbackDays: 3 })
  const referenceId = `SULTAN-${tagihanId.slice(0, 8)}-${Date.now()}`
  const paket = invoice.pelanggan?.paket
  const itemDescription = paket?.nama_paket
    ? `${paket.nama_paket} - ${invoice.bulan}/${invoice.tahun}`
    : `Internet ${invoice.bulan}/${invoice.tahun}`

  let payment
  try {
    payment = await createInvoice({
      amount: total,
      referenceId,
      customerName: invoice.pelanggan?.nama || 'Pelanggan',
      customerEmail: buildCustomerEmail(invoice, tagihanId),
      customerPhone: invoice.pelanggan?.no_wa,
      description: `Tagihan WiFi ${invoice.bulan}/${invoice.tahun}`,
      itemDescription,
      expiresAt,
      metadata: { tagihan_id: tagihanId },
    })
  } catch (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, amount: total, provider: 'mayar' })
    if (error instanceof MayarError) {
      if (error.code === 'MAYAR_DUPLICATE_REQUEST') {
        throw new PaymentError('Transaksi serupa baru saja dibuat. Tunggu 1 menit lalu coba lagi.', 429)
      }
      if (error.code === 'MAYAR_UNAUTHORIZED') {
        throw new PaymentError('API key Mayar tidak valid untuk environment ini.', 502)
      }
      if (error.code === 'MAYAR_CONFIG') {
        throw new PaymentError('Payment gateway belum dikonfigurasi.', 503)
      }
    }
    throw new PaymentError('Gagal membuat link pembayaran Mayar.', 502)
  }

  const { data: attempt, error: attemptError } = await supabaseAdmin.from('payment_attempts').insert({
    tagihan_id: tagihanId,
    provider: 'mayar',
    gateway_order_id: payment.gatewayOrderId,
    payment_url: payment.paymentUrl,
    amount: total,
    customer_fee: customerFee,
    status: 'PENDING',
    payment_metadata: {
      reference_id: referenceId,
      provider_type: payment.providerType || 'payment_request',
      request_id: payment.requestId,
      payment_link_id: payment.paymentLinkId,
      transaction_id: payment.transactionId,
      expires_at: payment.expiresAt,
      environment: payment.environment,
      mayar_status: payment.status,
    },
  }).select().single()

  if (attemptError?.code === '23505') {
    const concurrentAttempt = await getActiveAttempt(tagihanId)
    if (concurrentAttempt) return { invoice, attempt: concurrentAttempt, reused: true }
    throw new PaymentError('Payment attempt bentrok dengan transaksi lain; coba lagi', 409)
  }
  if (attemptError) {
    capturePaymentError(attemptError, { tagihan_id: tagihanId, gateway_order_id: payment.gatewayOrderId })
    throw attemptError
  }

  const { error: updateError } = await supabaseAdmin.from('tagihan').update({
    payment_url: payment.paymentUrl,
    gateway_order_id: payment.gatewayOrderId,
    gateway_provider: 'mayar',
    customer_fee: customerFee,
  }).eq('id', tagihanId)
  if (updateError) {
    capturePaymentError(updateError, { tagihan_id: tagihanId, operation: 'updateTagihan' })
    throw updateError
  }

  return { invoice, attempt, reused: false }
}

function extractPaidTransaction(detail) {
  const transactions = Array.isArray(detail?.transactions) ? detail.transactions : []
  return transactions.find((item) => isPaidGatewayStatus(item?.status)) || transactions[0] || null
}

/**
 * PRD edge case #3 ("Cek Status Manual"): ask Mayar for the current state of the
 * payment request and reconcile the invoice if it has been paid.
 */
export async function syncPaymentAttempt(tagihanId) {
  const attempt = await getLatestAttempt(tagihanId)
  if (!attempt) return { synced: false, reason: 'NO_ATTEMPT', gatewayStatus: null }

  const metadata = readMetadata(attempt)
  const providerType = metadata.provider_type === 'invoice' ? 'invoice' : 'payment_request'

  let detail
  try {
    detail = providerType === 'invoice'
      ? await getInvoice(attempt.gateway_order_id)
      : await getPaymentRequest(attempt.gateway_order_id)
  } catch (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, operation: 'syncGatewayStatus' })
    throw new PaymentError('Gagal menghubungi Mayar untuk cek status.', 502)
  }

  const gatewayStatus = String(detail?.status || '').toLowerCase()

  if (EXPIRED_STATUSES.includes(gatewayStatus.toUpperCase())) {
    if (ACTIVE_STATUSES.includes(attempt.status)) {
      await supabaseAdmin.from('payment_attempts').update({ status: 'EXPIRED' }).eq('id', attempt.id)
    }
    return { synced: false, gatewayStatus, attempt }
  }

  if (attempt.status === 'PAID') {
    return { synced: true, alreadyProcessed: true, gatewayStatus, attempt }
  }

  if (!isPaidGatewayStatus(gatewayStatus)) {
    return { synced: false, gatewayStatus: gatewayStatus || 'unpaid', attempt }
  }

  let transactionId
  let paymentMethod = 'QRIS'
  let paidAt = new Date().toISOString()

  if (providerType === 'invoice') {
    // Invoice transactions are created up-front; `transactionId` is the id to
    // fetch for the exact channel and settlement time.
    transactionId = detail?.transactionId || metadata.transaction_id || attempt.gateway_order_id
  } else {
    const transaction = extractPaidTransaction(detail)
    transactionId = transaction?.id || metadata.transaction_id || attempt.gateway_order_id
    paymentMethod = transaction?.paymentMethod || paymentMethod
    if (transaction?.updatedAt) paidAt = new Date(transaction.updatedAt).toISOString()
  }

  // Best effort: the transaction endpoint exposes the exact channel and time.
  try {
    const transactionDetail = await getTransaction(transactionId)
    if (transactionDetail?.paymentMethod) paymentMethod = transactionDetail.paymentMethod
    if (transactionDetail?.updatedAt) {
      paidAt = new Date(Number(transactionDetail.updatedAt)).toISOString()
    }
  } catch (error) {
    console.warn('[PAYMENT] Detail transaksi Mayar tidak tersedia:', { code: error.code, status: error.status })
  }

  const { data: result, error: rpcError } = await supabaseAdmin.rpc('process_gateway_payment', {
    p_tagihan_id: tagihanId,
    p_event_id: `manual-${transactionId}`,
    p_reference: attempt.gateway_order_id,
    p_amount: Number(attempt.amount),
    p_method: paymentMethod,
    p_paid_at: paidAt,
  })

  if (rpcError) {
    capturePaymentError(rpcError, { tagihan_id: tagihanId, operation: 'processGatewayPayment' })
    throw new PaymentError('Gagal memperbarui status pembayaran.', 500)
  }

  return {
    synced: true,
    alreadyProcessed: Boolean(result?.already_processed),
    gatewayStatus,
    paymentMethod,
    paidAt,
  }
}
