import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { sendWhatsApp, formatBulan, formatRupiah } from '@/lib/whatsapp'

export async function GET(request) {
    try {
        const MAX_HARI_NUNGGAK = 3
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 1. Ambil tagihan belum bayar beserta data pelanggan
        const { data: tagihanList, error: tagihanErr } = await supabase
            .from('tagihan')
            .select('id, bulan, tahun, jumlah_tagihan, tanggal_jatuh_tempo, status_pembayaran, pelanggan_id, pelanggan(id, nama, kode_pelanggan, no_wa, status)')
            .eq('status_pembayaran', 'belum_bayar')

        if (tagihanErr) throw tagihanErr

        const pelangganToSuspend = []
        const notifQueue = []

        tagihanList?.forEach((t) => {
            let jatuhTempo = null

            if (t.tanggal_jatuh_tempo) {
                const val = String(t.tanggal_jatuh_tempo).trim()
                if (val.includes('-')) {
                    const [year, month, day] = val.split('-')
                    jatuhTempo = new Date(Number(year), Number(month) - 1, Number(day))
                } else if (!isNaN(val)) {
                    const day = Number(val)
                    const month = t.bulan ? Number(t.bulan) - 1 : today.getMonth()
                    const year = t.tahun ? Number(t.tahun) : today.getFullYear()
                    jatuhTempo = new Date(year, month, day)
                }
            }

            if (jatuhTempo) {
                jatuhTempo.setHours(0, 0, 0, 0)
                const diffTime = today.getTime() - jatuhTempo.getTime()
                const selisihHari = Math.floor(diffTime / (1000 * 3600 * 24))

                if (selisihHari > MAX_HARI_NUNGGAK && t.pelanggan?.status === 'aktif') {
                    pelangganToSuspend.push(t.pelanggan_id)
                    notifQueue.push({
                        tagihan_id: t.id,
                        nama: t.pelanggan.nama,
                        kode: t.pelanggan.kode_pelanggan,
                        no_wa: t.pelanggan.no_wa,
                        bulan: t.bulan,
                        tahun: t.tahun,
                        nominal: t.jumlah_tagihan,
                    })
                }
            }
        })

        if (pelangganToSuspend.length === 0) {
            return NextResponse.json({
                message: 'Tidak ada pelanggan yang perlu di-suspend hari ini.',
                total: 0
            })
        }

        // 2. Update status pelanggan menjadi isolir
        const { error: updateErr } = await supabase
            .from('pelanggan')
            .update({ status: 'isolir' })
            .in('id', pelangganToSuspend)

        if (updateErr) throw updateErr

        // 3. Kirim WhatsApp pemberitahuan isolir ke setiap pelanggan
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sandbox-wifi.vercel.app'

        for (const item of notifQueue) {
            const linkBayar = `${baseUrl}/bayar/${item.tagihan_id}`
            const pesan = `🛑 *PEMBERITAHUAN ISOLIR INTERNET*\n\nYth. Pelanggan Sultan WiFi (*${item.nama}*),\n\nMohon maaf, akses internet Anda untuk ID *${item.kode}* saat ini *DITANGGUHKAN / DI-ISOLIR* sementara karena tagihan bulan *${formatBulan(item.bulan)} ${item.tahun}* telah melewati batas jatuh tempo.\n\n💳 *Total Tagihan:* ${formatRupiah(item.nominal)}\n🔗 *Link Pembayaran Instan:*\n${linkBayar}\n\n_Akses internet akan otomatis AKTIF kembali beberapa saat setelah pembayaran Anda berhasil dikonfirmasi._\n\nTerima kasih,\n*Sultan WiFi Team*`

            if (item.no_wa) {
                await sendWhatsApp(item.no_wa, pesan)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil meng-isolir ${pelangganToSuspend.length} pelanggan & notifikasi WA terkirim.`,
            suspended_ids: pelangganToSuspend,
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}