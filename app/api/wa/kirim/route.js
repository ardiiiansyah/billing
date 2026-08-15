import { kirimWA } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request) {
    try {
        const { nomor, pesan, pelanggan_nama } = await request.json()
        if (!nomor || !pesan) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        const { sukses, data } = await kirimWA(nomor, pesan)

        // Simpan log notifikasi sesuai kolom tabel Supabase Anda
        await supabase.from('log_notifikasi').insert([
            {
                no_wa: nomor,
                jenis_pesan: 'Tagihan / Pesan WA',
                pesan: pesan,
                status: sukses ? 'terkirim' : 'gagal',
            },
        ])

        return Response.json({ sukses, data })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }
}