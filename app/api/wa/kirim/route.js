import { kirimWA } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request) {
    try {
        const { nomor, pesan, pelanggan_nama } = await request.json()
        if (!nomor || !pesan) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        const { sukses, data } = await kirimWA(nomor, pesan)

        // Simpan log notifikasi ke database Supabase
        await supabase.from('log_notifikasi').insert([
            {
                pelanggan_nama: pelanggan_nama || 'Pelanggan',
                nomor_wa: nomor,
                kategori: 'Tagihan / Pesan WA',
                isi_pesan: pesan,
                status: sukses ? 'terkirim' : 'gagal',
            },
        ])

        return Response.json({ sukses, data })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }
}