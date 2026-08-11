import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { tagihan_id, nominal, nama_pelanggan, no_wa } = await req.json();

        // Tempelkan Server Key Sandbox kamu secara langsung di sini (tanpa spasi)
        const serverKey = 'SB-Mid-server-AoMSaK7-nxZYW6jpqyp6a6O3';

        const authString = `${serverKey.trim()}:`;
        const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

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
                'Authorization': authHeader,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Midtrans API Error:', data);
            return NextResponse.json({ error: data.error_messages?.[0] || 'Ditolak Midtrans' }, { status: response.status });
        }

        return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}