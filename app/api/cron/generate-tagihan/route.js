import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date()
    const bulan = now.getMonth() + 1
    const tahun = now.getFullYear()

    const { data, error } = await supabaseAdmin.rpc('generate_tagihan_bulanan', {
        p_bulan: bulan,
        p_tahun: tahun,
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        bulan,
        tahun,
        jumlah_generated: data,
    })
}