import { requireAdmin } from '@/lib/server-auth'
import { createAttemptForInvoice, PaymentError } from '@/lib/payments'

export async function POST(request) {
  const { response: authResponse } = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    let body
    try { body = await request.json() } catch {
      return Response.json({ error: 'Body request tidak valid' }, { status: 400 })
    }
    const { tagihan_id } = body || {}

    if (typeof tagihan_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(tagihan_id)) {
      return Response.json({ error: 'tagihan_id tidak valid' }, { status: 400 })
    }

    const result = await createAttemptForInvoice(tagihan_id)
    return Response.json({ sukses: true, payment_url: result.attempt.payment_url, order_id: result.attempt.gateway_order_id, reused: result.reused })
  } catch (err) {
    console.error('[PAYMENT] Create failed:', { message: err.message, code: err.code })
    const status = err instanceof PaymentError ? err.status : 500
    return Response.json({ error: status === 500 ? 'Gagal membuat transaksi' : err.message }, { status })
  }
}