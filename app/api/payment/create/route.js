import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin client (service role key dibutuhkan untuk update dari server)
// Karena kita hanya punya anon key, kita pakai anon key dengan RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { tagihan_id, pelanggan_nama, pelanggan_wa, jumlah, bulan, tahun } = body

    if (!tagihan_id || !jumlah) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey || serverKey.includes('GANTI')) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi di .env.local' },
        { status: 500 }
      )
    }

    // Buat order_id unik
    const orderId = `WIFI-${tagihan_id}-${Date.now()}`

    // Payload ke Midtrans
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(jumlah),
      },
      customer_details: {
        first_name: pelanggan_nama || 'Pelanggan',
        phone: pelanggan_wa || '',
      },
      item_details: [
        {
          id: `tagihan-${tagihan_id}`,
          price: parseInt(jumlah),
          quantity: 1,
          name: `Tagihan WiFi Bulan ${bulan}/${tahun}`,
        },
      ],
      // Izinkan semua metode: QRIS, transfer bank, Alfamart, Indomaret
      enabled_payments: [
        'bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'permata_va',
        'other_va', 'qris', 'gopay', 'shopeepay',
        'indomaret', 'alfamart',
      ],
    }

    // Panggil Midtrans API (Sandbox atau Production)
    const isSandbox = serverKey.startsWith('SB-')
    const baseUrl = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions'

    const encoded = Buffer.from(`${serverKey}:`).toString('base64')

    const midtransRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify(midtransPayload),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      console.error('Midtrans error:', midtransData)
      return NextResponse.json(
        { error: midtransData.error_messages?.[0] || 'Gagal membuat transaksi Midtrans' },
        { status: 400 }
      )
    }

    const paymentUrl = midtransData.redirect_url
    const snapToken = midtransData.token

    // Simpan order_id & payment_url ke tabel tagihan (opsional, untuk tracking)
    await supabase
      .from('tagihan')
      .update({
        midtrans_order_id: orderId,
        payment_url: paymentUrl,
      })
      .eq('id', tagihan_id)

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      snap_token: snapToken,
      order_id: orderId,
      whatsapp_url: buildWhatsappUrl(pelanggan_wa, pelanggan_nama, jumlah, bulan, tahun, paymentUrl),
    })
  } catch (err) {
    console.error('Create payment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildWhatsappUrl(noWa, nama, jumlah, bulan, tahun, paymentUrl) {
  if (!noWa) return null

  // Normalisasi nomor WA (62xxx...)
  let phone = noWa.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.slice(1)
  if (!phone.startsWith('62')) phone = '62' + phone

  const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(jumlah)

  const bulanNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  const pesan = [
    `Halo *${nama}*! 👋`,
    ``,
    `📡 *Sultan WiFi RT/RW*`,
    `Tagihan WiFi bulan *${bulanNames[bulan]} ${tahun}* Anda sudah tersedia.`,
    ``,
    `💰 Nominal: *${rupiah}*`,
    ``,
    `Klik link di bawah untuk bayar via:`,
    `✅ QRIS | Transfer Bank | Alfamart | Indomaret`,
    ``,
    `🔗 *${paymentUrl}*`,
    ``,
    `Terima kasih! 🙏`,
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`
}
