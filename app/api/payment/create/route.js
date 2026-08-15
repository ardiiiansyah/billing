import { createClient } from '@supabase/supabase-js'
import { formatBulan, formatRupiah } from '@/lib/whatsapp' // Hapus kirimWA dari sini

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { tagihan_id, pelanggan_nama, pelanggan_wa, jumlah, bulan, tahun } = body

    if (!tagihan_id || !jumlah) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const orderId = `SULTAN-${tagihan_id.slice(0, 8)}-${Date.now()}`
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    const authKey = Buffer.from(serverKey + ':').toString('base64')

    // Buat transaksi via Midtrans Snap API langsung
    const midtransRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authKey}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(Number(jumlah)),
        },
        customer_details: {
          first_name: pelanggan_nama || 'Pelanggan',
          phone: pelanggan_wa || '',
        },
        enabled_payments: ['qris', 'indomaret', 'alfamart', 'bca_va', 'bni_va', 'bri_va'],
        item_details: [
          {
            id: tagihan_id,
            price: Math.round(Number(jumlah)),
            quantity: 1,
            name: `Tagihan WiFi ${formatBulan(bulan)} ${tahun}`,
          },
        ],
      }),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok || !midtransData.redirect_url) {
      console.error('[PAYMENT] Midtrans error:', midtransData)
      return Response.json({ error: midtransData.error_messages?.[0] || 'Gagal buat transaksi' }, { status: 500 })
    }

    const paymentUrl = midtransData.redirect_url

    // Simpan ke Supabase
    await supabase
      .from('tagihan')
      .update({ payment_url: paymentUrl, midtrans_order_id: orderId })
      .eq('id', tagihan_id)

    return Response.json({ sukses: true, payment_url: paymentUrl, order_id: orderId })
  } catch (err) {
    console.error('[PAYMENT] Error:', err)
    return Response.json({ error: err.message || 'Gagal membuat transaksi' }, { status: 500 })
  }
}