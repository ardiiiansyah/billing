import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimWA, formatBulan, formatRupiah } from '@/lib/whatsapp'

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

    // Generate tagihan bulanan
    const { data, error } = await supabaseAdmin.rpc('generate_tagihan_bulanan', {
        p_bulan: bulan,
        p_tahun: tahun,
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Ambil semua tagihan bulan ini yang belum bayar beserta data pelanggan
    const { data: tagihan, error: tagihanError } = await supabaseAdmin
        .from('tagihan')
        .select('*, pelanggan(nama, no_wa)')
        .eq('bulan', bulan)
        .eq('tahun', tahun)
        .eq('status_pembayaran', 'belum_bayar')
        .not('pelanggan', 'is', null)

    if (tagihanError) {
        return NextResponse.json({
            success: true,
            jumlah_generated: data,
            wa_error: tagihanError.message,
        })
    }

    // Kirim WA ke setiap pelanggan
    const hasil_wa = { berhasil: 0, gagal: 0 }

    for (const t of tagihan) {
        const { nama, no_wa } = t.pelanggan
        if (!no_wa) { hasil_wa.gagal++; continue }

        const linkBayar = `${process.env.NEXT_PUBLIC_APP_URL}/bayar/${t.id}`

        const pesan =
            `Halo Bapak/Ibu *${nama}*, ` +
            `tagihan WiFi Sultan bulan *${formatBulan(bulan)} ${tahun}* ` +
            `sebesar *${formatRupiah(t.jumlah_tagihan)}* telah diterbitkan.\n\n` +
            `Jatuh tempo: *${new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n` +
            `Klik link berikut untuk bayar:\n${linkBayar}\n\n` +
            `Terima kasih 🙏`

        const { sukses } = await kirimWA(no_wa, pesan)
        if (sukses) hasil_wa.berhasil++
        else hasil_wa.gagal++
    }

    return NextResponse.json({
        success: true,
        bulan,
        tahun,
        jumlah_generated: data,
        wa_terkirim: hasil_wa.berhasil,
        wa_gagal: hasil_wa.gagal,
    })
}