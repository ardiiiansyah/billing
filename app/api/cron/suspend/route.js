// app/api/cron/suspend/route.js
// Cron job: Isolir otomatis pelanggan yang menunggak > 3 hari dari tanggal jatuh tempo
// Menggunakan sistem batching & jeda waktu (delay) untuk notifikasi isolir
// Dijadwalkan tiap hari jam 07:00 WIB via vercel.json

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { kirimWABatch } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
    // Verifikasi CRON_SECRET jika dikonfigurasi
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

    try {
        const MAX_HARI_NUNGGAK = 3
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 1. Ambil tagihan belum bayar beserta data pelanggan
        const { data: tagihanList, error: tagihanErr } = await supabaseAdmin
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
                        pelanggan_id: t.pelanggan.id,
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
                success: true,
                message: 'Tidak ada pelanggan yang perlu di-suspend hari ini.',
                total_suspended: 0
            })
        }

        // 2. Update status pelanggan menjadi 'isolir' di database
        const { error: updateErr } = await supabaseAdmin
            .from('pelanggan')
            .update({ status: 'isolir' })
            .in('id', pelangganToSuspend)

        if (updateErr) throw updateErr

        console.log(`[CRON SUSPEND] ${pelangganToSuspend.length} pelanggan berhasil di-isolir di database.`)

        // 3. Susun antrean pesan WhatsApp
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://sandbox-wifi.vercel.app'
        const antreanPesan = []

        for (const item of notifQueue) {
            if (!item.no_wa) continue

            const linkBayar = `${baseUrl}/bayar/${item.tagihan_id}`
            const pesan = `🛑 *PEMBERITAHUAN ISOLIR INTERNET*\n\nYth. Pelanggan Sultan WiFi (*${item.nama}*),\n\nMohon maaf, akses internet Anda untuk ID *${item.kode}* saat ini *DITANGGUHKAN / DI-ISOLIR* sementara karena tagihan bulan *${item.bulan}/${item.tahun}* telah melewati batas jatuh tempo.\n\n💳 *Total Tagihan:* Rp ${Number(item.nominal).toLocaleString('id-ID')}\n🔗 *Link Pembayaran Instan:*\n${linkBayar}\n\n_Akses internet akan otomatis AKTIF kembali beberapa saat setelah pembayaran Anda berhasil dikonfirmasi._\n\nTerima kasih,\n*Sultan WiFi Team*`

            antreanPesan.push({
                nomor: item.no_wa,
                pesan,
                pelanggan_id: item.pelanggan_id,
                nama: item.nama,
                kode: item.kode,
            })
        }

        // 4. Kirim notifikasi isolir bertahap dengan sistem batching (10 pesan/batch, jeda 2.5s)
        const batchResult = await kirimWABatch(antreanPesan, {
            batchSize: 10,
            delayMs: 2500,
        })

        // 5. Simpan log notifikasi secara efisien (bulk insert)
        const logInserts = batchResult.detail.map((res) => ({
            pelanggan_id: res.pelanggan_id,
            no_wa: res.nomor,
            pesan: res.pesan,
            jenis: 'isolir',
            status: res.sukses ? 'terkirim' : 'gagal',
        }))

        if (logInserts.length > 0) {
            const { error: logErr } = await supabaseAdmin.from('log_notifikasi').insert(logInserts)
            if (logErr) {
                console.error('[CRON SUSPEND] Error insert log_notifikasi:', logErr.message)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Berhasil meng-isolir ${pelangganToSuspend.length} pelanggan dan memproses pengiriman notifikasi WA.`,
            total_suspended: pelangganToSuspend.length,
            wa_terkirim: batchResult.berhasil,
            wa_gagal: batchResult.gagal,
            suspended_ids: pelangganToSuspend,
        })
    } catch (err) {
        console.error('[CRON SUSPEND] Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}