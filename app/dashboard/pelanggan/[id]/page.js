// app/dashboard/pelanggan/[id]/page.js
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DetailPelangganPage() {
    const { id } = useParams()
    const router = useRouter()

    const [pelanggan, setPelanggan] = useState(null)
    const [tagihanList, setTagihanList] = useState([])
    const [stats, setStats] = useState({ total_dibayar: 0, durasi_bulan: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchDetailPelanggan()
        }
    }, [id])

    async function fetchDetailPelanggan() {
        setLoading(true)

        // 1. Fetch Info Pelanggan + Join Paket & Wilayah
        const { data: pData, error: pErr } = await supabase
            .from('pelanggan')
            .select('*, paket(nama_paket, harga), wilayah(nama_wilayah)')
            .eq('id', id)
            .single()

        if (pErr) console.error('Error fetching pelanggan:', pErr)
        else setPelanggan(pData)

        // 2. Fetch Riwayat Tagihan + Join Pembayaran (Tanggal Bayar & Metode)
        const { data: tData, error: tErr } = await supabase
            .from('tagihan')
            .select('*, pembayaran(tanggal_bayar, metode)')
            .eq('pelanggan_id', id)
            .order('tahun', { ascending: false })
            .order('bulan', { ascending: false })

        if (tErr) console.error('Error fetching tagihan:', tErr)
        else setTagihanList(tData || [])

        // 3. Hitung Statistik Ringkas (Total Pembayaran & Durasi Berlangganan)
        const lunas = (tData || []).filter(t => t.status_pembayaran === 'lunas')
        const total = lunas.reduce((acc, curr) => acc + (curr.jumlah_tagihan || 0), 0)
        setStats({ total_dibayar: total, durasi_bulan: lunas.length })

        setLoading(false)
    }

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
    }

    // Format bulan lengkap tanpa disingkat (contoh: Agustus 2026)
    const formatNamaBulan = (m, y) => {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${months[m - 1]} ${y}`;
    }

    // Fitur Kirim WhatsApp Langsung
    const handleWhatsApp = () => {
        if (pelanggan?.no_wa) {
            const msg = `Halo Bapak/Ibu *${pelanggan.nama}*, kami dari manajemen Sultan WiFi ingin menginformasikan terkait layanan Anda. Terima kasih 🙏`;
            window.open(`https://wa.me/${pelanggan.no_wa.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`, '_blank');
        }
    }

    const handleToggleStatus = async () => {
        if (!pelanggan) return
        const newStatus = pelanggan.status === 'aktif' ? 'isolir' : 'aktif'
        await supabase.from('pelanggan').update({ status: newStatus }).eq('id', pelanggan.id)
        fetchDetailPelanggan()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-400">
                <p className="animate-pulse">Memuat profil lengkap pelanggan...</p>
            </div>
        )
    }

    if (!pelanggan) {
        return (
            <div className="text-center py-12 space-y-4">
                <p className="text-rose-400 font-semibold">Pelanggan tidak ditemukan.</p>
                <button
                    onClick={() => router.push('/dashboard/pelanggan')}
                    className="px-4 py-2 bg-slate-800 text-xs text-slate-200 rounded-xl hover:bg-slate-700"
                >
                    ← Kembali ke Data Pelanggan
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/pelanggan')}
                        className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                        ← Kembali
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Profil Pelanggan</h1>
                        <p className="text-slate-400 text-xs mt-0.5">
                            Detail informasi warga dan riwayat pembayaran tagihan.
                        </p>
                    </div>
                </div>

                {/* Card Statistik Ringkas */}
                <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                        <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Total Pembayaran</p>
                        <p className="text-lg font-bold text-white mt-0.5">{formatRupiah(stats.total_dibayar)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Durasi Aktif</p>
                        <p className="text-lg font-bold text-white mt-0.5">{stats.durasi_bulan} Bulan</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kolom Kiri: Informasi Pelanggan & Tombol WhatsApp */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
                    <button
                        onClick={handleWhatsApp}
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20"
                    >
                        💬 Kirim Pesan WhatsApp
                    </button>

                    <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                        <div>
                            <span className="font-mono text-cyan-400 text-xs font-bold uppercase tracking-wider block">
                                {pelanggan.kode_pelanggan}
                            </span>
                            <h2 className="text-xl font-bold text-white mt-1">{pelanggan.nama}</h2>
                        </div>
                        <button
                            onClick={handleToggleStatus}
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border transition ${pelanggan.status === 'aktif'
                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                                    : 'bg-red-950/80 text-red-400 border-red-800 hover:bg-red-900'
                                }`}
                        >
                            {pelanggan.status === 'aktif' ? '🟢 Aktif' : '🔴 Isolir'}
                        </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        <div>
                            <span className="text-slate-500 block mb-0.5">Wilayah</span>
                            <span className="text-slate-200 font-medium">{pelanggan.wilayah?.nama_wilayah || '-'}</span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">No WhatsApp</span>
                            <span className="text-slate-200 font-medium">{pelanggan.no_wa || '-'}</span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">Alamat</span>
                            <span className="text-slate-200 font-medium">
                                {pelanggan.alamat} (RT {pelanggan.rt || '-'}/RW {pelanggan.rw || '-'})
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">Paket WiFi</span>
                            <span className="text-slate-200 font-semibold">
                                {pelanggan.paket?.nama_paket || '-'}
                            </span>
                            <span className="text-emerald-400 block font-medium">
                                {pelanggan.paket ? formatRupiah(pelanggan.paket.harga) : '-'} /bulan
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-500 block mb-0.5">Jatuh Tempo</span>
                            <span className="text-slate-200 font-medium">Setiap Tanggal {pelanggan.tanggal_jatuh_tempo}</span>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Riwayat Pembayaran Detail */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-800 bg-slate-950/50">
                        <h3 className="text-base font-bold text-white">📜 Riwayat Pembayaran Detail</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Daftar tagihan beserta detail riwayat pembayaran untuk pelanggan ini.
                        </p>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="px-5 py-3.5">Periode</th>
                                    <th className="px-5 py-3.5">Tanggal Bayar</th>
                                    <th className="px-5 py-3.5">Metode</th>
                                    <th className="px-5 py-3.5">Nominal</th>
                                    <th className="px-5 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {tagihanList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                                            Belum ada riwayat tagihan.
                                        </td>
                                    </tr>
                                ) : (
                                    tagihanList.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                                            <td className="px-5 py-4 font-bold text-white">
                                                {formatNamaBulan(t.bulan, t.tahun)}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400">
                                                {t.pembayaran?.[0]?.tanggal_bayar || '-'}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400 uppercase">
                                                {t.pembayaran?.[0]?.metode || '-'}
                                            </td>
                                            <td className="px-5 py-4 text-emerald-400 font-medium">
                                                {formatRupiah(t.jumlah_tagihan)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${t.status_pembayaran === 'lunas'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                                        }`}
                                                >
                                                    {t.status_pembayaran === 'lunas' ? 'LUNAS' : 'BELUM BAYAR'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}