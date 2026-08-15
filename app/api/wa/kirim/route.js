import { kirimWA } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request) {
    try {
        const body = await request.json()
        const { nomor, pesan } = body

        if (!nomor || !pesan) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }

        const responseWa = await kirimWA(nomor, pesan)
        const sukses = responseWa?.sukses ?? true

        // Simpan log secara langsung karena kolom pelanggan_id sudah diatur nullable di Supabase
        const { error: dbError } = await supabase.from('log_notifikasi').insert([
            {
                no_wa: nomor,
                jenis_pesan: 'Tagihan / Pesan WA',
                pesan: pesan,
                status: sukses ? 'terkirim' : 'gagal',
            },
        ])

        if (dbError) {
            console.error('GAGAL INSERT LOG:', dbError.message)
        }

        return Response.json({ sukses, data: responseWa })
    } catch (err) {
        console.error('API ERROR:', err.message)
        return Response.json({ error: err.message }, { status: 500 })
    }
}