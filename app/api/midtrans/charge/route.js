import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        console.log('Incoming charge request body:', body);

        const { tagihan_id, nominal, nama_pelanggan, no_wa } = body;

        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        if (!serverKey) {
            console.error('ERROR: MIDTRANS_SERVER_KEY is undefined!');
            return NextResponse.json({ error: 'MIDTRANS_SERVER_KEY belum diatur di Vercel' }, { status: 500 });
        }

        // Bersihkan kunci dari spasi atau karakter tak terlihat
        const cleanServerKey = serverKey.trim();
        const authHeader = Buffer.from(`${cleanServerKey}:`).toString('base64');

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

        console.log('Sending payload to Midtrans Sandbox:', payload);

        const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authHeader}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('Midtrans API Response Status:', response.status);
        console.log('Midtrans API Response Body:', data);

        if (!response.ok) {
            const errorMsg = Array.isArray(data.error_messages)
                ? data.error_messages.join(', ')
                : (data.message || 'Ditolak oleh Midtrans');
            return NextResponse.json({ error: errorMsg }, { status: response.status });
        }

        return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        console.error('Charge API Critical Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}