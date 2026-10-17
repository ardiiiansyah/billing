import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WIB_TIME_ZONE = 'Asia/Jakarta'

function getBusinessDateWib() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: WIB_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date())
}

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
    const businessDate = getBusinessDateWib()

    console.log(`[CRON OVERDUE] Menandai tagihan overdue untuk business date ${businessDate} (WIB)...`)

    // The database RPC performs the transition atomically, avoiding concurrent cron races.
    const { data, error } = await supabaseAdmin.rpc('mark_overdue_tagihan', {
        p_business_date: businessDate,
    })

    if (error) {
        console.error('[CRON OVERDUE] Error RPC mark_overdue_tagihan:', {
            code: error.code,
            message: error.message,
            details: error.details,
        })
        return NextResponse.json({ error: 'Gagal memperbarui status overdue' }, { status: 500 })
    }

    const updated = Number(data) || 0
    console.log(`[CRON OVERDUE] Berhasil memperbarui ${updated} tagihan.`)

    return NextResponse.json({
        success: true,
        business_date: businessDate,
        updated,
        notification_schedule: 'notif-tagihan runs at 00:10 WIB',
    })
}
