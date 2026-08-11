import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request) {
    try {
        const MAX_HARI_NUNGGAK = 3
        // Set jam ke 00:00:00 untuk pembandingan tanggal murni
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 1. Ambil tagihan yang belum bayar
        const { data: tagihanList, error: tagihanErr } = await supabase
            .from('tagihan')
            .select('id, tanggal_jatuh_tempo, status_pembayaran, pelanggan_id, pelanggan(id, status)')
            .eq('status_pembayaran', 'belum_bayar')

        if (tagihanErr) throw tagihanErr

        const pelangganToSuspend = []

        tagihanList?.forEach((t) => {
            if (!t.tanggal_jatuh_tempo) return

            // Parse tanggal jatuh tempo (YYYY-MM-DD)
            const [year, month, day] = t.tanggal_jatuh_tempo.split('-')
            const jatuhTempo = new Date(year, month - 1, day)
            jatuhTempo.setHours(0, 0, 0, 0)

            // Hitung selisih hari
            const diffTime = today.getTime() - jatuhTempo.getTime()
            const selisihHari = Math.floor(diffTime / (1000 * 3600 * 24))

            // Jika tunggakan melebihi 3 hari dan status pelanggan masih 'aktif'
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