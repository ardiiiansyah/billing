// app/api/payment/create/route.js
import midtransClient from 'midtrans-client'
import { createClient } from '@supabase/supabase-js'
import { kirimWA, formatBulan, formatRupiah } from '@/lib/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { tagihan_id, pelanggan_nama, pelanggan_wa, jumlah, bulan, tahun } = body

    if (!tagihan_id || !jumlah) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Buat transaksi Midtrans
    const orderId = `SULTAN-${tagihan_id.slice(0, 8)}-${Date.now()}`

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(Number(jumlah)),
      },
      customer_details: {
        first_name: pelanggan_nama || 'Pelanggan',
        phone: pelanggan_wa || '',
      },
      enabled_payments: [
        'qris',
        'indomaret',
        'alfamart',
        'bca_va',
        'bni_va',
        'bri_va',
        'mandiri_bill',
      ],
      item_details: [
        {
          id: tagihan_id,
          price: Math.round(Number(jumlah)),
          quantity: 1,
          name: `Tagihan WiFi Sultan ${formatBulan(bulan)} ${tahun}`,
        },
      ],
    })

    const paymentUrl = transaction.redirect_url

    // Simpan payment_url ke tabel tagihan
    await supabase
      .from('tagihan')
      .update({ payment_url: paymentUrl, midtrans_order_id: orderId })
      .eq('id', tagihan_id)

    // Kirim WA ke pelanggan
    let whatsappUrl = null
    if (pelanggan_wa) {
      const pesan =
        `Halo Bapak/Ibu *${pelanggan_nama}*, ` +
        `tagihan WiFi Sultan bulan ${formatBulan(bulan)} ${tahun} sebesar *${formatRupiah(jumlah)}* ` +
        `sudah siap dibayar.\n\n` +
        `Klik link berikut untuk bayar via QRIS, Alfamart, Indomaret, atau Transfer Bank:\n` +
        `${paymentUrl}\n\n` +
        `Terima kasih 🙏`

      await kirimWA(pelanggan_wa, pesan)

      // Buat link WA manual sebagai fallback
      const nomorFormatted = pelanggan_wa.startsWith('0')
        ? '62' + pelanggan_wa.slice(1)
        : pelanggan_wa
      whatsappUrl = `https://wa.me/${nomorFormatted}?text=${encodeURIComponent(pesan)}`
    }

    return Response.json({
      sukses: true,
      payment_url: paymentUrl,
      order_id: orderId,
      whatsapp_url: whatsappUrl,
    })
  } catch (err) {
    console.error('[PAYMENT] Error:', err)
    return Response.json({ error: err.message || 'Gagal membuat transaksi' }, { status: 500 })
  }
}