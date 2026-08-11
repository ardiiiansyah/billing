import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request) {
    try {
        // Tentukan toleransi keterlambatan (misal: > 3 hari dari jatuh tempo)
        const MAX_HARI_NUNGGAK = 3
        const today = new Date()

        // 1. Ambil tagihan yang masih BELUM BAYAR
        const { data: tagihanList, error: tagihanErr } = await supabase
            .from('tagihan')
            .select('id, tanggal_jatuh_tempo, pelanggan_id, pelanggan(id, status)')
            .eq('status_pembayaran', 'belum_bayar')

        if (tagihanErr) throw tagihanErr

        const pelangganToSuspend = []

        tagihanList?.forEach((t) => {
            const jatuhTempo = new Date(t.tanggal_jatuh_tempo)
            const selisihHari = Math.floor((today - jatuhTempo) / (1000 * 60 * 60 * 24))

            // Jika tunggakan melebihi batas hari dan pelanggan masih aktif
            if (selisihHari > MAX_HARI_NUNGGAK && t.pelanggan?.status === 'aktif') {
                pelangganToSuspend.push(t.pelanggan_id)
            }
        })

        if (pelangganToSuspend.length === 0) {
            return NextResponse.json({ message: 'Tidak ada pelanggan yang perlu di-suspend hari ini.', total: 0 })
        }

        // 2. Update status pelanggan menjadi 'isolir' atau 'suspend'
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