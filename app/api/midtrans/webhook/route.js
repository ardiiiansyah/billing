import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            payment_type,
        } = body;

        // 1. Verifikasi Keamanan Signature Key dari Midtrans
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const hashed = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex');

        if (hashed !== signature_key) {
            return NextResponse.json({ message: 'Invalid signature key' }, { status: 400 });
        }

        // 2. Ekstrak Tagihan ID dari Order ID (Format: INV-[tagihan_id]-[timestamp])
        const tagihanId = order_id.split('-')[1];

        if (!tagihanId) {
            return NextResponse.json({ message: 'Invalid Order ID' }, { status: 400 });
        }

        // 3. Update Status Tagihan
        if (
            transaction_status === 'settlement' ||
            (transaction_status === 'capture' && fraud_status === 'accept')
        ) {
            // Pembayaran Sukses (QRIS / Alfamart / Indomaret / Transfer)
            await supabaseAdmin
                .from('tagihan')
                .update({
                    status: 'lunas',
                    tanggal_bayar: new Date().toISOString(),
                    metode_pembayaran: payment_type || 'midtrans',
                })
                .eq('id', tagihanId);
        } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
            // Pembayaran Gagal / Kedaluwarsa
            await supabaseAdmin
                .from('tagihan')
                .update({ status: 'belum_bayar' })
                .eq('id', tagihanId);
        }

        return NextResponse.json({ status: 'OK' }, { status: 200 });
    } catch (error) {
        console.error('Midtrans Webhook Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}