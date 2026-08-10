import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const { tagihan_id, nominal, nama_pelanggan, no_wa } = body;

        let serverKey = process.env.MIDTRANS_SERVER_KEY || '';

        if (!serverKey) {
            console.error('ERROR: MIDTRANS_SERVER_KEY tidak ditemukan');
            return NextResponse.json({ error: 'Server Key Midtrans belum diatur di Vercel' }, { status: 500 });
        }

        // Pembersihan kunci & Pembuatan Format Base64 Basic Auth
        serverKey = serverKey.trim().replace(/^["']|["']$/g, '');
        const authString = `${serverKey}:`;
        const encodedAuth = Buffer.from(authString).toString('base64');

        const orderId = `INV-${tagihan_id}-${Date.now()}`;
        const grossAmount = Math.round(Number(nominal) || 0);

        const payload = {
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

        const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${encodedAuth}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Midtrans Error Response:', data);
            const errorMsg = Array.isArray(data.error_messages)
                ? data.error_messages.join(', ')
                : (data.message || 'Pembayaran ditolak Midtrans');
            return NextResponse.json({ error: errorMsg }, { status: response.status });
        }

        return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        console.error('Critical Charge Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}