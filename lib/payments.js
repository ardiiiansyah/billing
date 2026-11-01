import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPaymentRedirectUrl, createPaymentLink } from '@/lib/mayar'
import { capturePaymentError } from '@/lib/monitoring'

export class PaymentError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PaymentError'
    this.status = status
  }
}

// Customer fee adalah porsi 30% dari estimasi gateway fee yang dibebankan ke pelanggan
// 70% sisanya diserap oleh admin saat settlement
const CUSTOMER_FEE = 240 // Rp 240 untuk QRIS/e-wallet

export async function getActiveAttempt(tagihanId) {
  const { data, error } = await supabaseAdmin.from('payment_attempts')
    .select('*').eq('tagihan_id', tagihanId).eq('provider', 'mayar')
    .in('status', ['PENDING', 'OPEN']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, operation: 'getActiveAttempt' })
    throw error
  }
  return data
}

export async function createAttemptForInvoice(tagihanId, { forceRenew = false } = {}) {
  // SECURITY: Always fetch invoice amount from database, NEVER trust client-provided values
  const { data: invoice, error } = await supabaseAdmin.from('tagihan')
    .select('id, jumlah_tagihan, bulan, tahun, tanggal_jatuh_tempo, status_pembayaran, pelanggan:pelanggan_id(nama, no_wa)')
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
  if (active && !forceRenew) return { invoice, attempt: active, reused: true }
  if (active && forceRenew) throw new PaymentError('Payment link aktif sudah tersedia', 409)

  // SECURITY: Validate amount from database is a valid positive integer
  const amount = Number(invoice.jumlah_tagihan)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new PaymentError('Nominal tagihan tidak valid', 409)
  }
  
  // Calculate total: base amount + customer fee (30% of gateway fee)
  const total = amount + CUSTOMER_FEE
  const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const referenceId = `SULTAN-${tagihanId.slice(0, 8)}-${Date.now()}`
  let payment
  try {
    payment = await createPaymentLink({
      amount: total, referenceId, customerName: invoice.pelanggan?.nama,
      customerPhone: invoice.pelanggan?.no_wa, description: `Tagihan WiFi ${invoice.bulan}/${invoice.tahun}`,
      dueDate, redirectUrl: buildPaymentRedirectUrl(tagihanId),
      metadata: { tagihan_id: tagihanId },
    })
  } catch (error) {
    capturePaymentError(error, { tagihan_id: tagihanId, amount: total, provider: 'mayar' })
    throw error
  }
  const { data: attempt, error: attemptError } = await supabaseAdmin.from('payment_attempts').insert({
    tagihan_id: tagihanId, provider: 'mayar', gateway_order_id: payment.gatewayOrderId,
    payment_url: payment.paymentUrl, amount: total, customer_fee: CUSTOMER_FEE,
    status: 'PENDING', payment_metadata: { reference_id: referenceId, expires_at: payment.expiresAt },
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
    payment_url: payment.paymentUrl, gateway_order_id: payment.gatewayOrderId,
    gateway_provider: 'mayar', customer_fee: CUSTOMER_FEE,
  }).eq('id', tagihanId)
  if (updateError) {
    capturePaymentError(updateError, { tagihan_id: tagihanId, operation: 'updateTagihan' })
    throw updateError
  }
  return { invoice, attempt, reused: false }
}
