// app/api/cron/generate-tagihan/route.js
// Cron job: Generate tagihan bulanan otomatis di database Supabase
// Menjalankan RPC 'generate_tagihan_bulanan' secara cepat & aman dari timeout
// Pengiriman WA dipisahkan ke endpoint /api/cron/kirim-tagihan

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
    const authHeader = request.headers.get('authorization')
    if (
        process.env.CRON_SECRET &&
        authHeader &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date()
    const bulan = now.getMonth() + 1
    const tahun = now.getFullYear()

    console.log(`[CRON GENERATE] Memulai generate tagihan untuk periode ${bulan}/${tahun}...`)

    // 1. Eksekusi database RPC generate tagihan bulanan
    const { data, error } = await supabaseAdmin.rpc('generate_tagihan_bulanan', {
        p_bulan: bulan,
        p_tahun: tahun,
    })

    if (error) {
        console.error('[CRON GENERATE] Error RPC generate_tagihan_bulanan:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[CRON GENERATE] Berhasil generate ${data || 0} tagihan baru di database.`)

    return NextResponse.json({
        success: true,
        message: `Berhasil generate ${data || 0} tagihan bulanan baru di database.`,
        bulan,
        tahun,
        jumlah_generated: data || 0,
        info: 'Pengiriman pesan WhatsApp diproses terpisah via /api/cron/kirim-tagihan dengan sistem batching.',
    })
}