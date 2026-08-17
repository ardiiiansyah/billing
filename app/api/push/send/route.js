import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabaseClient';

// Konfigurasi VAPID menggunakan Public dan Private Key dari .env
webpush.setVapidDetails(
    'mailto:admin@sultanwifi.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
    try {
        const { title, body } = await request.json();

        // 1. Ambil semua data perangkat yang sudah subscribe dari database Supabase
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (error) throw error;

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: false, message: 'Tidak ada perangkat terdaftar.' }, { status: 404 });
        }

        const payload = JSON.stringify({ title, body });

        // 2. Kirim notifikasi ke semua perangkat admin yang terdaftar secara bersamaan
        const promises = subscriptions.map((sub) =>
            webpush.sendNotification(sub, payload).catch((err) => {
                console.error('Gagal mengirim ke salah satu perangkat:', err);
                // Opsional: Jika subscription sudah kedaluwarsa/tidak valid, bisa dihapus dari DB di sini
            })
        );

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: 'Notifikasi berhasil dikirim ke semua perangkat!' });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}