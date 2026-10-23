import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildPaymentRedirectUrl, createPaymentLink } from '@/lib/mayar'

export class PaymentError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PaymentError'
    this.status = status
  }
}

const CUSTOMER_FEE = 240

export async function getActiveAttempt(tagihanId) {
  const { data, error } = await supabaseAdmin.from('payment_attempts')
    .select('*').eq('tagihan_id', tagihanId).eq('provider', 'mayar')
    .in('status', ['PENDING', 'OPEN']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function createAttemptForInvoice(tagihanId, { forceRenew = false } = {}) {
  const { data: invoice, error } = await supabaseAdmin.from('tagihan')
    .select('id, jumlah_tagihan, bulan, tahun, tanggal_jatuh_tempo, status_pembayaran, pelanggan:pelanggan_id(nama, no_wa)')
    .eq('id', tagihanId).single()
  if (error?.code === 'PGRST116' || !invoice) throw new PaymentError('Tagihan tidak ditemukan', 404)
  if (error) throw error
  if (!['belum_bayar', 'UNPAID', 'OVERDUE'].includes(invoice.status_pembayaran)) throw new PaymentError('Tagihan tidak tersedia untuk pembayaran', 409)

  const active = await getActiveAttempt(tagihanId)
  if (active && !forceRenew) return { invoice, attempt: active, reused: true }
  if (active && forceRenew) throw new PaymentError('Payment link aktif sudah tersedia', 409)

  const amount = Number(invoice.jumlah_tagihan)
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new PaymentError('Nominal tagihan tidak valid', 409)
  const total = amount + CUSTOMER_FEE
  const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const referenceId = `SULTAN-${tagihanId.slice(0, 8)}-${Date.now()}`
  const payment = await createPaymentLink({
    amount: total, referenceId, customerName: invoice.pelanggan?.nama,
    customerPhone: invoice.pelanggan?.no_wa, description: `Tagihan WiFi ${invoice.bulan}/${invoice.tahun}`,
    dueDate, redirectUrl: buildPaymentRedirectUrl(tagihanId),
    metadata: { tagihan_id: tagihanId },
  })
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
  if (attemptError) throw attemptError
  const { error: updateError } = await supabaseAdmin.from('tagihan').update({
    payment_url: payment.paymentUrl, gateway_order_id: payment.gatewayOrderId,
    gateway_provider: 'mayar', customer_fee: CUSTOMER_FEE,
  }).eq('id', tagihanId)
  if (updateError) throw updateError
  return { invoice, attempt, reused: false }
}
