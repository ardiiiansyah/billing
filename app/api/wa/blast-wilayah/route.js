import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request) {
    try {
        const { wilayah_id, pesan } = await request.json()

        // 1. Ambil nomor WA semua pelanggan yang terdaftar di wilayah tersebut
        const { data: pelanggan, error } = await supabase
            .from('pelanggan')
            .select('no_wa')
            .eq('wilayah_id', wilayah_id)
            .eq('status', 'aktif')

        if (error || !pelanggan || pelanggan.length === 0) {
            return NextResponse.json({ error: 'Tidak ada pelanggan aktif di wilayah ini' }, { status: 400 })
        }

        // Ambil daftar nomor HP (pisahkan dengan koma untuk Fonnte)
        const targetNumbers = pelanggan.map(p => p.no_wa).filter(Boolean).join(',')

        if (!targetNumbers) {
            return NextResponse.json({ error: 'Nomor WhatsApp pelanggan tidak ditemukan' }, { status: 400 })
        }

        // 2. Kirim pesan broadcast via Fonnte API
        const fonnteRes = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': process.env.FONNTE_TOKEN, // Gunakan token Fonnte kamu di .env
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target: targetNumbers,
                message: pesan,
            }),
        })

        const fonnteData = await fonnteRes.json()

        return NextResponse.json({ success: true, data: fonnteData })
    } catch (err) {
        console.error('WA Blast Error:', err)
        return NextResponse.json({ error: 'Gagal memproses WA Blast' }, { status: 500 })
    }
}