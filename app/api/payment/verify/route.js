import { requireAdmin } from '@/lib/server-auth'
import { PaymentError, syncPaymentAttempt } from '@/lib/payments'

export const dynamic = 'force-dynamic'

// PRD edge case #3: "Cek Status Manual".
// Queries Mayar for the current payment request status and reconciles the
// invoice if the webhook was lost.
export async function POST(request) {
  const { response } = await requireAdmin(request)
  if (response) return response

  try {
    let body
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Body request tidak valid' }, { status: 400 })
    }

    const { tagihan_id } = body || {}
    if (typeof tagihan_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(tagihan_id)) {
      return Response.json({ error: 'tagihan_id tidak valid' }, { status: 400 })
    }

    const result = await syncPaymentAttempt(tagihan_id)
    return Response.json({ sukses: true, ...result })
  } catch (error) {
    console.error('[PAYMENT] Verify failed:', { message: error.message, code: error.code })
    const status = error instanceof PaymentError ? error.status : 500
    return Response.json(
      { error: status === 500 ? 'Gagal mengecek status pembayaran' : error.message },
      { status }
    )
  }
}
