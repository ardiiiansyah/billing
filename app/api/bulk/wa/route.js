// app/api/bulk/wa/route.js
// API endpoint: Kirim WA masal ke daftar pelanggan/tagihan dengan delay antrean & support media

import { createClient } from '@supabase/supabase-js'
import { kirimWA } from '@/lib/whatsapp'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request) {
    try {
        const body = await request.json()
        const { mode, ids, pesan, media_url } = body // <--- 1. Tangkap media_url di sini

        if (!ids || ids.length === 0 || !pesan) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        let targets = []

        if (mode === 'tagihan') {
            const { data, error } = await supabase
                .from('tagihan')
                .select('id, bulan, tahun, jumlah_tagihan, pelanggan(nama, no_wa)')
                .in('id', ids)
                .not('pelanggan', 'is', null)

            if (error) throw error
            targets = (data || []).map(t => ({
                id: t.id,
                nama: t.pelanggan?.nama,
                no_wa: t.pelanggan?.no_wa,
                tagihan_id: t.id,
                extra: { bulan: t.bulan, tahun: t.tahun, nominal: t.jumlah_tagihan }
            }))
        } else if (mode === 'pelanggan') {
            const { data, error } = await supabase
                .from('pelanggan')
                .select('id, nama, no_wa')
                .in('id', ids)

            if (error) throw error
            targets = (data || []).map(p => ({
                id: p.id,
                nama: p.nama,
                no_wa: p.no_wa,
                tagihan_id: null,
                extra: {}
            }))
        } else {
            return Response.json({ error: 'Mode tidak valid. Gunakan "tagihan" atau "pelanggan".' }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        const logs = []
        let sukses = 0
        let gagal = 0

        for (const target of targets) {
            if (!target.no_wa) {
                logs.push({ nama: target.nama, status: 'gagal', alasan: 'Nomor WA tidak ada' })
                gagal++
                continue
            }

            let pesanFinal = pesan
                .replace(/\[nama\]/g, target.nama || 'Pelanggan')
                .replace(/\[link_bayar\]/g, target.tagihan_id ? `${baseUrl}/bayar/${target.tagihan_id}` : '-')

            // 2. Kirim media_url ke dalam fungsi kirimWA (pastikan fungsi helper kirimWA Anda mendukung parameter ke-3 ini)
            const { sukses: berhasil } = await kirimWA(target.no_wa, pesanFinal, media_url || null)

            if (berhasil) {
                sukses++
                logs.push({ nama: target.nama, no_wa: target.no_wa, status: 'terkirim' })
            } else {
                gagal++
                logs.push({ nama: target.nama, no_wa: target.no_wa, status: 'gagal' })
            }

            await delay(1500)
        }

        return Response.json({
            sukses: true,
            total: targets.length,
            terkirim: sukses,
            gagal,
            logs
        })

    } catch (err) {
        console.error('[BULK WA] Error:', err)
        return Response.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
    }
}