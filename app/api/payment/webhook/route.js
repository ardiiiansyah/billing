import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Webhook dari Midtrans saat pembayaran berhasil
export async function POST(request) {
  try {
    const body = await request.json()

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body

    // Verifikasi signature dari Midtrans (keamanan)
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    const expected = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex')

    if (expected !== signature_key) {
      console.warn('Midtrans webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Cek apakah transaksi sukses
    const isSettled =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept')

    const isPending = transaction_status === 'pending'
    const isFailed = ['cancel', 'deny', 'expire'].includes(transaction_status)

    if (isSettled) {
      // Cari tagihan berdasarkan order_id
      const { data: tagihan } = await supabase
        .from('tagihan')
        .select('id, jumlah_tagihan, pelanggan_id')
        .eq('midtrans_order_id', order_id)
        .single()

      if (!tagihan) {
        console.warn('Webhook: tagihan tidak ditemukan untuk order_id:', order_id)
        return NextResponse.json({ message: 'Tagihan tidak ditemukan' }, { status: 200 })
      }

      // Catat pembayaran
      await supabase.from('pembayaran').insert([{
        tagihan_id: tagihan.id,
        jumlah_bayar: parseInt(gross_amount),
        metode_pembayaran: 'midtrans',
        catatan: `Dibayar via Midtrans (order: ${order_id})`,
        diterima_oleh: 'Midtrans Auto',
      }])

      // Trigger check_tagihan_lunas otomatis update status via Supabase trigger
      // Tapi untuk keamanan, kita juga update manual:
      await supabase
        .from('tagihan')
        .update({ status_pembayaran: 'lunas' })
        .eq('id', tagihan.id)
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
