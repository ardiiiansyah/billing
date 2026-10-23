import { requireAdmin } from '@/lib/server-auth'
import { createAttemptForInvoice, PaymentError } from '@/lib/payments'

export async function POST(request) {
  const { response } = await requireAdmin(request)
  if (response) return response
  try {
    let body
    try { body = await request.json() } catch {
      return Response.json({ error: 'Body request tidak valid' }, { status: 400 })
    }
    const { tagihan_id } = body || {}
    if (typeof tagihan_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(tagihan_id)) {
      return Response.json({ error: 'tagihan_id tidak valid' }, { status: 400 })
    }
    const result = await createAttemptForInvoice(tagihan_id, { forceRenew: true })
    return Response.json({ sukses: true, payment_url: result.attempt.payment_url, order_id: result.attempt.gateway_order_id })
  } catch (error) {
    console.error('[PAYMENT] Renew failed:', { message: error.message, code: error.code })
    const status = error instanceof PaymentError ? error.status : 500
    return Response.json({ error: status === 500 ? 'Gagal memperbarui payment link' : error.message }, { status })
  }
}
