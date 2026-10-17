import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/mayar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-mayar-signature') || request.headers.get('x-signature')
    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)
    const eventId = body.event_id || body.id
    const gatewayOrderId = body.reference || body.reference_id || body.data?.id
    const status = String(body.status || body.event || body.data?.status || '').toUpperCase()
    const tagihanId = body.metadata?.tagihan_id || body.data?.metadata?.tagihan_id
    const amount = Number(body.amount || body.data?.amount)
    if (!eventId || !gatewayOrderId || !tagihanId || !Number.isFinite(amount)) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }
    if (!['PAID', 'SUCCESS', 'SETTLEMENT'].includes(status)) {
      return Response.json({ sukses: true, ignored: true })
    }

    // 1. Cari data tagihan berdasarkan midtrans_order_id saja
    const { data: tagihan, error: errTagihan } = await supabase
      .from('tagihan')
      .select('id, bulan, tahun, pelanggan_id, jumlah_tagihan, status_pembayaran, customer_fee, gateway_order_id')
      .eq('id', tagihanId)
      .single()

    if (errTagihan || !tagihan) {
      return Response.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    const expectedAmount = Number(tagihan.jumlah_tagihan) + Number(tagihan.customer_fee || 0)
    if (!Number.isSafeInteger(amount) || amount !== expectedAmount) {
      return Response.json({ error: 'Nominal pembayaran tidak sesuai tagihan' }, { status: 422 })
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .select('id, gateway_order_id, status')
      .eq('tagihan_id', tagihan.id)
      .eq('gateway_order_id', gatewayOrderId)
      .eq('provider', 'mayar')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (attemptError || !attempt || (tagihan.gateway_order_id && tagihan.gateway_order_id !== gatewayOrderId)) {
      return Response.json({ error: 'Referensi gateway tidak sesuai' }, { status: 422 })
    }

    // 2. Ambil data pelanggan secara terpisah untuk menghindari error build relasi
    let pelangganNama = 'Pelanggan'
    let pelangganWa = null

    if (tagihan.pelanggan_id) {
      const { data: pelangganData } = await supabase
        .from('pelanggan')
        .select('nama, no_wa')
        .eq('id', tagihan.pelanggan_id)
        .single()

      if (pelangganData) {
        pelangganNama = pelangganData.nama || 'Pelanggan'
        pelangganWa = pelangganData.no_wa
      }
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_gateway_payment', {
      p_tagihan_id: tagihan.id,
      p_event_id: eventId,
      p_reference: gatewayOrderId,
      p_amount: amount,
      p_method: body.payment_method || body.data?.payment_method || 'mayar',
      p_paid_at: body.paid_at || body.data?.paid_at || new Date().toISOString(),
    })
    if (rpcError) {
      console.error('[WEBHOOK MAYAR] RPC gagal:', { code: rpcError.code, message: rpcError.message })
      return Response.json({ error: 'Gagal memproses pembayaran' }, { status: 500 })
    }

    if (!rpcResult?.already_processed && tagihan.status_pembayaran !== 'lunas') {

      // 5. Kirim WhatsApp otomatis konfirmasi lunas ke pelanggan via Fonnte
      if (pelangganWa) {
        const pesanWA = `Halo Bapak/Ibu *${pelangganNama}*, pembayaran tagihan WiFi bulan *${tagihan.bulan} ${tagihan.tahun}* sebesar *Rp ${amount.toLocaleString('id-ID')}* via Mayar telah *BERHASIL* dan Lunas. Terima kasih.`

        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': process.env.FONNTE_TOKEN,
          },
          body: new URLSearchParams({
            target: pelangganWa,
            message: pesanWA,
          }),
        })
      }
    }

    return Response.json({ sukses: true })
  } catch (err) {
    console.error('[WEBHOOK] Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}