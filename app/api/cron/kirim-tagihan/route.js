// app/api/cron/kirim-tagihan/route.js
// Cron job: Kirim notifikasi WA tagihan baru bulan berjalan dengan sistem batching & delay
// Dijalankan secara terpisah setelah /api/cron/generate-tagihan

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimWABatch, formatBulan, formatRupiah, formatTanggal } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const MAX_MESSAGES_PER_RUN = 20

export async function GET(request) {
    // Verifikasi CRON_SECRET jika dikonfigurasi
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const parts = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
    }).formatToParts(new Date())
    const bulan = Number(parts.find(part => part.type === 'month')?.value)
    const tahun = Number(parts.find(part => part.type === 'year')?.value)

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
            payment_url,
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
        .limit(MAX_MESSAGES_PER_RUN)

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

    // Claim each invoice before sending. The partial unique index makes this
    // safe when two cron invocations run at the same time.
    const antreanPesan = []
    let tidakAdaNomor = 0
    let sudahDiklaim = 0

    for (const t of tagihan) {
        if (!t.pelanggan) continue

        const { nama, no_wa } = t.pelanggan
        if (!no_wa) {
            tidakAdaNomor++
            continue
        }

        if (!t.payment_url) continue

        const { data: claimed, error: claimError } = await supabaseAdmin
            .from('log_notifikasi')
            .insert({
                tagihan_id: t.id,
                pelanggan_id: t.pelanggan.id,
                no_wa,
                jenis_pesan: 'tagihan_diterbitkan',
                pesan: '',
                status: 'queued',
                attempt_count: 1,
            })
            .select('id')
            .maybeSingle()

        if (claimError || !claimed) {
            sudahDiklaim++
            continue
        }

        const linkBayar = t.payment_url
        const jatuhTempoStr = t.tanggal_jatuh_tempo ? formatTanggal(t.tanggal_jatuh_tempo) : '-'

        const pesan =
            `Yth. Bapak/Ibu *${nama}*,\n\n` +
            `Berikut tagihan internet WiFi periode *${formatBulan(bulan)} ${tahun}*:\n` +
            `- Total Tagihan: *${formatRupiah(t.jumlah_tagihan)}*\n` +
            `- Batas Pembayaran: *${jatuhTempoStr}*\n\n` +
            `Silakan lakukan pembayaran melalui tautan resmi berikut:\n${linkBayar}\n\n` +
            `_Pesan ini dikirim otomatis oleh sistem billing._\nTerima kasih.`

        antreanPesan.push({
            nomor: no_wa,
            pesan,
            tagihan_id: t.id,
            pelanggan_id: t.pelanggan.id,
            nama,
            log_id: claimed.id,
        })
    }

    console.log(`[CRON KIRIM TAGIHAN] Total antrean: ${antreanPesan.length} pelanggan (tanpa nomor WA: ${tidakAdaNomor})`)

    // Keep each invocation bounded so Vercel can finish before maxDuration.
    const hasilBatch = await kirimWABatch(antreanPesan, {
        batchSize: 10,
        delayMs: 750,
    })

    for (const result of hasilBatch.detail) {
        await supabaseAdmin
            .from('log_notifikasi')
            .update({
                status: result.sukses ? 'sent' : 'failed',
                pesan: result.pesan,
                sent_at: result.sukses ? new Date().toISOString() : null,
                error_message: result.sukses ? null : (result.error || 'Fonnte gagal mengirim pesan'),
            })
            .eq('id', result.log_id)
    }

    return NextResponse.json({
        success: true,
        bulan,
        tahun,
        total_tagihan: tagihan.length,
        antrean_diproses: antreanPesan.length,
        tanpa_nomor_wa: tidakAdaNomor,
        sudah_diproses: sudahDiklaim,
        wa_terkirim: hasilBatch.berhasil,
        wa_gagal: hasilBatch.gagal,
    })
}
