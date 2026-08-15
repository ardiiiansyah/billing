'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function WilayahPage() {
    const [wilayahList, setWilayahList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)

    const [formData, setFormData] = useState({
        nama_wilayah: '',
        rt: '',
        rw: '',
        keterangan: '',
    })

    useEffect(() => {
        fetchWilayah()
    }, [])

    async function fetchWilayah() {
        setLoading(true)
        try {
            const { data: dataWilayah, error } = await supabase
                .from('wilayah')
                .select('*')
                .order('rt', { ascending: true })

            if (error) throw error // Tangkap error dari supabase

            // ... proses data selanjutnya ...
            setWilayahList(merged)
        } catch (err) {
            // Aman: Developer tahu errornya di console, user tidak panik melihat kode teknis
            console.error('DEBUG FETCH ERROR:', err.message)
        } finally {
            setLoading(false)
        }
    }

    // Kalkulasi data statistik untuk setiap wilayah
    const processedWilayah = useMemo(() => {
        return wilayahList.map((w) => {
            const pelanggans = w.pelanggan || []
            const pelangganAktif = pelanggans.filter((p) => p.status === 'aktif').length
            const totalPelanggan = pelanggans.length
            const potensiOmset = pelanggans
                .filter((p) => p.status === 'aktif')
                .reduce((sum, p) => sum + Number(p.paket?.harga || 0), 0)

            return {
                ...w,
                pelangganAktif,
                totalPelanggan,
                potensiOmset,
            }
        })
    }, [wilayahList])

    // Filterberdasarkan keyword
    const filteredWilayah = useMemo(() => {
        return processedWilayah.filter((w) => {
            const q = search.toLowerCase()
            return (
                w.nama_wilayah?.toLowerCase().includes(q) ||
                String(w.rt)?.includes(q) ||
                String(w.rw)?.includes(q) ||
                w.keterangan?.toLowerCase().includes(q)
            )
        })
    }, [processedWilayah, search])

    // Stat summary global untuk Wilayah
    const statsSummary = useMemo(() => {
        const totalWilayah = processedWilayah.length
        const totalPelanggan = processedWilayah.reduce((a, b) => a + b.totalPelanggan, 0)
        const totalOmset = processedWilayah.reduce((a, b) => a + b.potensiOmset, 0)
        return { totalWilayah, totalPelanggan, totalOmset }
    }, [processedWilayah])

    const handleOpenModal = (wilayah = null) => {
        if (wilayah) {
            setEditId(wilayah.id)
            setFormData({
                nama_wilayah: wilayah.nama_wilayah || wilayah.nama || '',
                rt: wilayah.rt || '',
                rw: wilayah.rw || '',
                keterangan: wilayah.keterangan || '',
            })
        } else {
            setEditId(null)
            setFormData({
                nama_wilayah: '',
                rt: '',
                rw: '',
                keterangan: '',
            })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true) // 1. Kunci tombol agar tidak bisa diklik berulang kali

        const payload = {
            nama: formData.nama_wilayah,
            rt: formData.rt,
            rw: formData.rw,
        }

        try {
            if (editId) {
                const { error } = await supabase.from('wilayah').update(payload).eq('id', editId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('wilayah').insert([payload])
                if (error) throw error
            }

            setShowModal(false)
            await fetchWilayah()
        } catch (err) {
            // 2. Cetak detail error asli hanya di console untuk developer
            console.error('DEBUG ERROR:', err.message)

            // 3. Pesan ramah dan aman untuk user
            alert('Maaf, gagal menyimpan data wilayah. Silakan coba beberapa saat lagi.')
        } finally {
            // 4. Pastikan loading selalu dimatikan di akhir proses
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus data wilayah ini?')) return

        setLoading(true) // 1. Kunci tombol hapus agar tidak diklik ganda
        try {
            const { error } = await supabase.from('wilayah').delete().eq('id', id)
            if (error) throw error

            await fetchWilayah() // Muat ulang setelah hapus sukses
        } catch (err) {
            // 2. Log teknis aman di console
            console.error('DEBUG DELETE ERROR:', err.message)

            // 3. Pesan ramah untuk user
            alert('Maaf, gagal menghapus wilayah. Silakan coba lagi nanti.')
        } finally {
            // 4. Pastikan loading selalu dimatikan
            setLoading(false)
        }
    }

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <div className="space-y-6">
            {/* Header Glassmorphism */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                        Data Wilayah
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Kelola data RT/RW, pantau sebaran pelanggan, dan analisa potensi omset per wilayah.
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/25 active:scale-95 flex items-center gap-2"
                >
                    <span className="text-base leading-none">➕</span> Tambah Wilayah
                </button>
            </div>

            {/* Stat Cards 3D (Floating & Glowing) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Wilayah */}
                <div className="bg-gradient-to-b from-blue-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500/50 cursor-pointer flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Total Wilayah Coverage</p>
                        <p className="text-xl font-extrabold text-white mt-1">{statsSummary.totalWilayah} Area RT/RW</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg shadow-inner">
                        📍
                    </span>
                </div>

                {/* Total Pelanggan */}
                <div className="bg-gradient-to-b from-cyan-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/20 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Total Seluruh Pelanggan</p>
                        <p className="text-xl font-extrabold text-cyan-400 mt-1">{statsSummary.totalPelanggan} Warga</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-lg shadow-inner">
                        👥
                    </span>
                </div>

                {/* Total Potensi Omset */}
                <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-500/50 cursor-pointer flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400">Total Potensi Omset</p>
                        <p className="text-xl font-extrabold text-emerald-400 mt-1">{formatRupiah(statsSummary.totalOmset)}</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg shadow-inner">
                        💰
                    </span>
                </div>
            </div>

            {/* Bar Pencarian */}
            <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-xl shadow-black/20">
                <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 rounded-xl focus-within:border-cyan-500/80 transition duration-200">
                    <span className="text-slate-400 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari berdasarkan RT, RW, atau nama wilayah..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="text-xs text-slate-500 hover:text-slate-300">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Tabel Wilayah Modern */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                            <tr>
                                <th className="px-5 py-3.5 font-bold">RT / RW</th>
                                <th className="px-5 py-3.5 font-bold">Nama Wilayah</th>
                                <th className="px-5 py-3.5 font-bold">Pelanggan Aktif</th>
                                <th className="px-5 py-3.5 font-bold">Total Pelanggan</th>
                                <th className="px-5 py-3.5 font-bold">Potensi Omset</th>
                                <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Memuat data wilayah...
                                    </td>
                                </tr>
                            ) : filteredWilayah.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <span className="text-2xl">🗺️</span>
                                            <span className="font-medium text-slate-400">Tidak ada wilayah ditemukan</span>
                                            <span className="text-[11px] text-slate-600">Klik "Tambah Wilayah" untuk menambahkan area RT/RW baru.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredWilayah.map((w) => (
                                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                                        <td className="px-5 py-4">
                                            <span className="px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-bold text-xs">
                                                RT {w.rt || '-'} / RW {w.rw || '-'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-white text-sm">{w.nama_wilayah || w.nama || `Wilayah RT ${w.rt}`}</div>
                                            {w.keterangan && <div className="text-xs text-slate-400 mt-0.5">{w.keterangan}</div>}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-emerald-400 text-xs">
                                            {w.pelangganAktif} Warga
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-300 text-xs">
                                            {w.totalPelanggan} Warga
                                        </td>
                                        <td className="px-5 py-4 font-extrabold text-emerald-400 text-xs">
                                            {formatRupiah(w.potensiOmset)}
                                        </td>
                                        <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                                            <button
                                                onClick={() => handleOpenModal(w)}
                                                disabled={loading}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(w.id)}
                                                disabled={loading}
                                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition border border-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                🗑️ Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form Tambah / Edit Wilayah */}
            {showModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                            <span>{editId ? '✏️' : '➕'}</span>
                            <span>{editId ? 'Edit Data Wilayah' : 'Tambah Wilayah Baru'}</span>
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Nama Wilayah / Blok</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Misal: Perum Graha Blok A"
                                    value={formData.nama_wilayah}
                                    onChange={(e) => setFormData({ ...formData, nama_wilayah: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Nomor RT</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="01"
                                        value={formData.rt}
                                        onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Nomor RW</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="05"
                                        value={formData.rw}
                                        onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 font-medium mb-1">KeteranganTambahan (Opsional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Catatan acuan lokasi, penanggung jawab RT, dll..."
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-600/25"
                                >
                                    Simpan Wilayah
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}