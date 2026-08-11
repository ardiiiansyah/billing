import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request) {
    try {
        const MAX_HARI_NUNGGAK = 3
        const today = new Date()

        // 1. Ambil tagihan yang belum bayar beserta data pelanggannya
        const { data: tagihanList, error: tagihanErr } = await supabase
            .from('tagihan')
            .select('id, tanggal_jatuh_tempo, status_pembayaran, pelanggan_id, pelanggan(id, status)')
            .eq('status_pembayaran', 'belum_bayar')

        if (tagihanErr) throw tagihanErr

        const pelangganToSuspend = []

        tagihanList?.forEach((t) => {
            if (!t.tanggal_jatuh_tempo) return

            const jatuhTempo = new Date(t.tanggal_jatuh_tempo)
            // Hitung selisih hari
            const diffTime = today.getTime() - jatuhTempo.getTime()
            const selisihHari = Math.floor(diffTime / (1000 * 3600 * 24))

            // Jika menunggak lebih dari toleransi hari & status pelanggan aktif
            if (selisihHari > MAX_HARI_NUNGGAK && t.pelanggan?.status === 'aktif') {
                pelangganToSuspend.push(t.pelanggan_id)
            }
        })

        if (pelangganToSuspend.length === 0) {
            return NextResponse.json({
                message: 'Tidak ada pelanggan yang perlu di-suspend hari ini.',
                total: 0,
                tagihan_diperiksa: tagihanList?.length || 0
            })
        }

        // 2. Update status pelanggan menjadi isolir
        const { error: updateErr } = await supabase
            .from('pelanggan')
            .update({ status: 'isolir' })
            .in('id', pelangganToSuspend)

        if (updateErr) throw updateErr

        return NextResponse.json({
            success: true,
            message: `Berhasil meng-isolir ${pelangganToSuspend.length} pelanggan.`,
            suspended_ids: pelangganToSuspend,
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}