import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabaseClient';

// Tambahkan baris ini agar rute tidak di-prerender saat build di Vercel
export const dynamic = 'force-dynamic';

webpush.setVapidDetails(
    'mailto:admin@sultanwifi.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
    try {
        const { title, body } = await request.json();

        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (error) throw error;

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: false, message: 'Tidak ada perangkat terdaftar.' }, { status: 404 });
        }

        const payload = JSON.stringify({ title, body });

        const promises = subscriptions.map((sub) =>
            webpush.sendNotification(sub, payload).catch((err) => {
                console.error('Gagal mengirim ke salah satu perangkat:', err);
            })
        );

        await Promise.all(promises);

        return NextResponse.json({ success: true, message: 'Notifikasi berhasil dikirim ke semua perangkat!' });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}