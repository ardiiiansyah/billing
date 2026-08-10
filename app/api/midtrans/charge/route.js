import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { tagihan_id, nominal, nama_pelanggan, no_wa } = await req.json();

        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const authHeader = Buffer.from(`${serverKey}:`).toString('base64');

        // Format Order ID unik: INV-[tagihan_id]-[timestamp]
        const orderId = `INV-${tagihan_id}-${Date.now()}`;

        const payload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: nominal,
            },
            customer_details: {
                first_name: nama_pelanggan,
                phone: no_wa,
            },
            // Mengaktifkan QRIS, Alfamart, Indomaret, E-Wallet & Bank Transfer
            enabled_payments: [
                'qris',          // QRIS (GoPay, OVO, Dana, ShopeePay, LinkAja, BCA, dll)
                'gopay',         // Direct GoPay
                'shopeepay',     // Direct ShopeePay
                'alfamart',      // Kasir Alfamart / Alfa Midi
                'indomaret',     // Kasir Indomaret
                'bank_transfer', // Virtual Account (BCA, Mandiri, BNI, BRI, Permata)
            ],
        };

        const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authHeader}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error_messages?.[0] || 'Gagal membuat transaksi Midtrans' },
                { status: 500 }
            );
        }

        return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        console.error('Midtrans Charge Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}