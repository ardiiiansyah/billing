import { requireAdmin } from '@/lib/server-auth'
import { getActiveAttempt } from '@/lib/payments'

export async function GET(request) {
  const { response } = await requireAdmin(request)
  if (response) return response
  const tagihanId = new URL(request.url).searchParams.get('tagihan_id')
  if (typeof tagihanId !== 'string' || !/^[0-9a-f-]{36}$/i.test(tagihanId)) return Response.json({ error: 'tagihan_id tidak valid' }, { status: 400 })
  try { return Response.json({ sukses: true, attempt: await getActiveAttempt(tagihanId) }) }
  catch (error) {
    console.error('[PAYMENT] Status lookup failed:', { message: error.message, code: error.code })
    return Response.json({ error: 'Gagal mengambil status pembayaran' }, { status: 500 })
  }
}
