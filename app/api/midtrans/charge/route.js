import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

export async function POST(req) {
    try {
        const { tagihan_id, nominal, nama_pelanggan, no_wa } = await req.json();

        const serverKey = process.env.MIDTRANS_SERVER_KEY ? process.env.MIDTRANS_SERVER_KEY.trim() : '';

        if (!serverKey) {
            return NextResponse.json({ error: 'MIDTRANS_SERVER_KEY belum diatur di Vercel' }, { status: 500 });
        }

        // Inisialisasi Snap client Midtrans
        const snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: serverKey,
        });

        const orderId = `INV-${tagihan_id}-${Date.now()}`;
        const grossAmount = Math.round(Number(nominal) || 0);

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: grossAmount,
            },
            customer_details: {
                first_name: nama_pelanggan || 'Pelanggan',
                phone: no_wa || '08123456789',
            },
            enabled_payments: [
                'qris',
                'gopay',
                'shopeepay',
                'alfamart',
                'indomaret',
                'bank_transfer',
            ],
        };

        const transaction = await snap.createTransaction(parameter);

        return NextResponse.json({ token: transaction.token, redirect_url: transaction.redirect_url });
    } catch (error) {
        console.error('Midtrans Snap Error:', error);
        return NextResponse.json(
            { error: error.message || 'Gagal memproses transaksi Midtrans' },
            { status: 500 }
        );
    }
}