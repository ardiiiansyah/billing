import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
    try {
        const subscription = await request.json();

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert([
                {
                    endpoint: subscription.endpoint,
                    auth: subscription.keys.auth,
                    p256dh: subscription.keys.p256dh
                }
            ], { onConflict: 'endpoint' });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Berhasil menyimpan subscription' });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}