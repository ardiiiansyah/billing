// app/api/bulk/tagihan/route.js
// API endpoint: Aksi masal pada tagihan (tandai lunas cash, hapus)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
    try {
        const body = await request.json()
        const { action, ids } = body
        // action: 'pay_cash' | 'delete'
        // ids: array of tagihan_id

        if (!action || !ids || ids.length === 0) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        // ── AKSI: Tandai Lunas Cash ──────────────────────────────────
        if (action === 'pay_cash') {
            // Ambil detail tagihan untuk mendapatkan jumlah tagihan masing-masing
            const { data: tagihanList, error: fetchErr } = await supabase
                .from('tagihan')
                .select('id, jumlah_tagihan, status_pembayaran')
                .in('id', ids)
                .eq('status_pembayaran', 'belum_bayar') // hanya yang belum bayar

            if (fetchErr) throw fetchErr
            if (!tagihanList || tagihanList.length === 0) {
                return Response.json({ error: 'Tidak ada tagihan belum bayar yang bisa diproses' }, { status: 400 })
            }

            // Insert pembayaran cash untuk setiap tagihan (trigger DB otomatis update status ke 'lunas')
            const pembayaranInserts = tagihanList.map(t => ({
                tagihan_id: t.id,
                jumlah_bayar: t.jumlah_tagihan,
                metode_pembayaran: 'cash',
                diterima_oleh: 'Admin (Bulk)',
                catatan: 'Pembayaran masal via dashboard admin',
            }))

            const { error: insertErr } = await supabase
                .from('pembayaran')
                .insert(pembayaranInserts)

            if (insertErr) throw insertErr

            return Response.json({
                sukses: true,
                message: `${tagihanList.length} tagihan berhasil ditandai lunas.`,
                total_diproses: tagihanList.length,
            })
        }

        // ── AKSI: Hapus Tagihan ──────────────────────────────────────
        if (action === 'delete') {
            const { error: deleteErr } = await supabase
                .from('tagihan')
                .delete()
                .in('id', ids)

            if (deleteErr) throw deleteErr

            return Response.json({
                sukses: true,
                message: `${ids.length} tagihan berhasil dihapus.`,
                total_diproses: ids.length,
            })
        }

        return Response.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 })

    } catch (err) {
        console.error('[BULK TAGIHAN] Error:', err)
        return Response.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
    }
}
