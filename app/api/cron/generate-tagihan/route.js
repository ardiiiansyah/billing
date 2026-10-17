// app/api/cron/generate-tagihan/route.js
// Cron job: Generate tagihan harian Skema B di database Supabase
// Menjalankan RPC 'generate_tagihan_harian_skema_b' secara cepat & aman dari timeout
// Pengiriman WA dipisahkan ke endpoint /api/cron/kirim-tagihan

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Semua parameter billing dihitung berdasarkan zona waktu bisnis WIB.
    const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const tanggal = parseInt(parts.find(p => p.type === 'day').value, 10);
    const bulan = parseInt(parts.find(p => p.type === 'month').value, 10);
    const tahun = parseInt(parts.find(p => p.type === 'year').value, 10);

    console.log(`[CRON GENERATE] Memulai Skema B untuk tanggal ${tanggal}/${bulan}/${tahun} (WIB)...`);

    // RPC memilih pelanggan aktif yang jatuh tempo pada tanggal bisnis ini.
    const { data, error } = await supabaseAdmin.rpc('generate_tagihan_harian_skema_b', {
        p_tanggal_hari_ini: tanggal,
        p_bulan: bulan,
        p_tahun: tahun,
    })

    if (error) {
        console.error('[CRON GENERATE] Error RPC generate_tagihan_harian_skema_b:', {
            code: error.code,
            message: error.message,
            details: error.details,
        })
        return NextResponse.json({ error: 'Gagal menjalankan proses generate tagihan' }, { status: 500 })
    }

    const generated = Number(data) || 0
    console.log(`[CRON GENERATE] Berhasil generate ${generated} tagihan Skema B.`)

    return NextResponse.json({
        success: true,
        message: `Berhasil generate ${generated} tagihan Skema B di database.`,
        tanggal,
        bulan,
        tahun,
        jumlah_generated: generated,
        info: 'Pengiriman pesan WhatsApp diproses terpisah via /api/cron/kirim-tagihan dengan sistem batching.',
    })
}
