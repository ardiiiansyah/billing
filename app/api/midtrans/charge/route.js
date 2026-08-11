import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { tagihan_id, nominal, nama_pelanggan, no_wa } = await req.json();

        // 1. Ambil Kunci dari Env (atau String jika tes hardcode)
        let serverKey = process.env.MIDTRANS_SERVER_KEY || 'Mid-server-AoMSaK7-nxZYW6jpqyp6a6O3';

        // Clean string dari spasi, kutip, atau newlines
        serverKey = serverKey.trim().replace(/^["']|["']$/g, '');

        // 2. Format Authorization Basic Auth
        const basicAuthToken = Buffer.from(`${serverKey}:`).toString('base64');

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

        // 3. Fetch ke Midtrans Snap Sandbox Endpoint
        const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${basicAuthToken}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Midtrans Snap Error Detail:', data);
            return NextResponse.json(
                { error: data.error_messages?.[0] || 'Ditolak oleh Midtrans' },
                { status: response.status }
            );
        }

        return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        console.error('Internal Charge Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}