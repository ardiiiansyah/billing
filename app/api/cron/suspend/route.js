import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request) {
    try {
        const MAX_HARI_NUNGGAK = 3
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 1. Ambil tagihan yang belum bayar
        const { data: tagihanList, error: tagihanErr } = await supabase
            .from('tagihan')
            .select('id, bulan, tahun, tanggal_jatuh_tempo, status_pembayaran, pelanggan_id, pelanggan(id, status, nama)')
            .eq('status_pembayaran', 'belum_bayar')

        if (tagihanErr) throw tagihanErr

        const pelangganToSuspend = []
        const debugInfo = []

        tagihanList?.forEach((t) => {
            let jatuhTempo = null

            if (t.tanggal_jatuh_tempo) {
                const val = String(t.tanggal_jatuh_tempo).trim()

                // Kasus 1: Format YYYY-MM-DD
                if (val.includes('-')) {
                    const [year, month, day] = val.split('-')
                    jatuhTempo = new Date(Number(year), Number(month) - 1, Number(day))
                }
                // Kasus 2: Jika hanya berisi angka hari (misal: "5")
                else if (!isNaN(val)) {
                    const day = Number(val)
                    const month = t.bulan ? Number(t.bulan) - 1 : today.getMonth()
                    const year = t.tahun ? Number(t.tahun) : today.getFullYear()
                    jatuhTempo = new Date(year, month, day)
                }
            }

            let selisihHari = null
            if (jatuhTempo) {
                jatuhTempo.setHours(0, 0, 0, 0)
                const diffTime = today.getTime() - jatuhTempo.getTime()
                selisihHari = Math.floor(diffTime / (1000 * 3600 * 24))

                if (selisihHari > MAX_HARI_NUNGGAK && t.pelanggan?.status === 'aktif') {
                    pelangganToSuspend.push(t.pelanggan_id)
                }
            }

            debugInfo.push({
                nama: t.pelanggan?.nama,
                raw_jatuh_tempo: t.tanggal_jatuh_tempo,
                parsed_date: jatuhTempo ? jatuhTempo.toISOString().split('T')[0] : null,
                selisih_hari: selisihHari,
                status_pelanggan: t.pelanggan?.status
            })
        })

        if (pelangganToSuspend.length === 0) {
            return NextResponse.json({
                message: 'Tidak ada pelanggan yang perlu di-suspend hari ini.',
                total: 0,
                tagihan_diperiksa: tagihanList?.length || 0,
                debug_data: debugInfo
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
            debug_data: debugInfo
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}