// app/api/cron/kirim-tagihan/route.js
// Cron job: Kirim notifikasi WA tagihan baru bulan berjalan dengan sistem batching & delay
// Dijalankan secara terpisah setelah /api/cron/generate-tagihan

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimWABatch, formatBulan, formatRupiah, formatTanggal } from '@/lib/whatsapp'

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

    // --- KODE INI NANTINYA DIHAPUS JIKA SUDAH INGIN PRODUCTION --- ///
    return NextResponse.json({
        success: true,
        message: 'pengiriman WA ditangguhkan sementara sampai midtrans sudah siap.',
        total: 0,
    })
    // ===================== //

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date()
    const bulan = now.getMonth() + 1
    const tahun = now.getFullYear()

    console.log(`[CRON KIRIM TAGIHAN] Mengambil tagihan belum bayar periode ${bulan}/${tahun}...`)

    // Ambil semua tagihan bulan ini yang belum bayar beserta data pelanggan
    const { data: tagihan, error: tagihanError } = await supabaseAdmin
        .from('tagihan')
        .select(`
            id,
            bulan,
            tahun,
            jumlah_tagihan,
            tanggal_jatuh_tempo,
            status_pembayaran,
            pelanggan:pelanggan_id (
                id,
                nama,
                no_wa
            )
        `)
        .eq('bulan', bulan)
        .eq('tahun', tahun)
        .eq('status_pembayaran', 'belum_bayar')
        .not('pelanggan', 'is', null)

    if (tagihanError) {
        console.error('[CRON KIRIM TAGIHAN] Gagal mengambil data tagihan:', tagihanError.message)
        return NextResponse.json({ error: tagihanError.message }, { status: 500 })
    }

    if (!tagihan || tagihan.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'Tidak ada tagihan belum bayar untuk dikirim pada periode ini.',
            total: 0,
            berhasil: 0,
            gagal: 0,
        })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || ''

    // Susun antrean pesan WhatsApp
    const antreanPesan = []
    let tidakAdaNomor = 0

    for (const t of tagihan) {
        if (!t.pelanggan) continue

        const { nama, no_wa } = t.pelanggan
        if (!no_wa) {
            tidakAdaNomor++
            continue
        }

        const linkBayar = baseUrl ? `${baseUrl}/bayar/${t.id}` : '-'
        const jatuhTempoStr = t.tanggal_jatuh_tempo ? formatTanggal(t.tanggal_jatuh_tempo) : '-'

        const pesan =
            `Halo Bapak/Ibu *${nama}*, ` +
            `tagihan WiFi Sultan bulan *${formatBulan(bulan)} ${tahun}* ` +
            `sebesar *${formatRupiah(t.jumlah_tagihan)}* telah diterbitkan.\n\n` +
            `Jatuh tempo: *${jatuhTempoStr}*\n\n` +
            `Klik link berikut untuk bayar:\n${linkBayar}\n\n` +
            `Terima kasih 🙏`

        antreanPesan.push({
            nomor: no_wa,
            pesan,
            tagihan_id: t.id,
            pelanggan_id: t.pelanggan.id,
            nama,
        })
    }

    console.log(`[CRON KIRIM TAGIHAN] Total antrean: ${antreanPesan.length} pelanggan (tanpa nomor WA: ${tidakAdaNomor})`)

    // Kirim menggunakan batching: 12 pesan per batch, delay 2.5 detik antar batch
    const hasilBatch = await kirimWABatch(antreanPesan, {
        batchSize: 12,
        delayMs: 2500,
    })

    return NextResponse.json({
        success: true,
        bulan,
        tahun,
        total_tagihan: tagihan.length,
        antrean_diproses: antreanPesan.length,
        tanpa_nomor_wa: tidakAdaNomor,
        wa_terkirim: hasilBatch.berhasil,
        wa_gagal: hasilBatch.gagal,
    })
}
