import { kirimWA } from '@/lib/whatsapp'

export async function POST(request) {
    try {
        const { nomor, pesan } = await request.json()
        if (!nomor || !pesan) {
            return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
        }
        const { sukses, data } = await kirimWA(nomor, pesan)
        return Response.json({ sukses, data })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }
}