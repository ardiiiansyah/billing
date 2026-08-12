// app/api/bulk/pelanggan/route.js
// API endpoint: Aksi masal pada pelanggan (update status, generate tagihan)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
    try {
        const body = await request.json()
        const { action, ids, payload } = body
        // action: 'update_status' | 'generate_tagihan'
        // ids: array of pelanggan_id
        // payload: { status?: string, bulan?: number, tahun?: number }

        if (!action || !ids || ids.length === 0) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        // ── AKSI: Update Status Masal ────────────────────────────────
        if (action === 'update_status') {
            const { status } = payload || {}
            const validStatuses = ['aktif', 'isolir', 'nonaktif']
            if (!status || !validStatuses.includes(status)) {
                return Response.json({ error: `Status "${status}" tidak valid.` }, { status: 400 })
            }

            const { error: updateErr } = await supabase
                .from('pelanggan')
                .update({ status })
                .in('id', ids)

            if (updateErr) throw updateErr

            return Response.json({
                sukses: true,
                message: `${ids.length} pelanggan berhasil diubah statusnya menjadi "${status}".`,
                total_diproses: ids.length,
            })
        }

        // ── AKSI: Generate Tagihan Terpilih ─────────────────────────
        if (action === 'generate_tagihan') {
            const { bulan, tahun } = payload || {}
            if (!bulan || !tahun) {
                return Response.json({ error: 'Bulan dan tahun harus disertakan.' }, { status: 400 })
            }

            // Ambil data paket dan jatuh tempo untuk masing-masing pelanggan
            const { data: pelangganList, error: fetchErr } = await supabase
                .from('pelanggan')
                .select('id, paket_id, tanggal_jatuh_tempo, paket(harga)')
                .in('id', ids)
                .eq('status', 'aktif')
                .not('paket_id', 'is', null)

            if (fetchErr) throw fetchErr
            if (!pelangganList || pelangganList.length === 0) {
                return Response.json({ error: 'Tidak ada pelanggan aktif dengan paket yang bisa diproses.' }, { status: 400 })
            }

            // Build array tagihan untuk diinsert
            const tagihanInserts = pelangganList.map(p => {
                const tglJatuhTempo = Math.min(p.tanggal_jatuh_tempo || 10, 28)
                return {
                    pelanggan_id: p.id,
                    bulan: Number(bulan),
                    tahun: Number(tahun),
                    jumlah_tagihan: p.paket?.harga || 0,
                    tanggal_jatuh_tempo: `${tahun}-${String(bulan).padStart(2, '0')}-${String(tglJatuhTempo).padStart(2, '0')}`,
                    status_pembayaran: 'belum_bayar',
                }
            })

            // Insert dengan ON CONFLICT DO NOTHING (skip jika sudah ada tagihan bulan ini)
            const { data: inserted, error: insertErr } = await supabase
                .from('tagihan')
                .upsert(tagihanInserts, {
                    onConflict: 'pelanggan_id,bulan,tahun',
                    ignoreDuplicates: true
                })
                .select()

            if (insertErr) throw insertErr

            return Response.json({
                sukses: true,
                message: `Tagihan bulan ${bulan}/${tahun} berhasil digenerate untuk ${pelangganList.length} pelanggan.`,
                total_diproses: pelangganList.length,
                total_dibuat: inserted?.length || 0,
            })
        }

        return Response.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 })

    } catch (err) {
        console.error('[BULK PELANGGAN] Error:', err)
        return Response.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
    }
}
