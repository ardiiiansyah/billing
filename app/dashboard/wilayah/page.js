'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function WilayahPage() {
    const [wilayahList, setWilayahList] = useState([])
    const [statistikMap, setStatistikMap] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)

    // State baru untuk Modal Popup Detail Pelanggan
    const [showPelangganModal, setShowPelangganModal] = useState(false)
    const [selectedWilayah, setSelectedWilayah] = useState(null)
    const [pelangganList, setPelangganList] = useState([])
    const [loadingPelanggan, setLoadingPelanggan] = useState(false)

    const [formData, setFormData] = useState({
        rt: '',
        rw: '',
        nama: '',
    })

    useEffect(() => {
        fetchWilayah()
    }, [])

    async function fetchWilayah() {
        setLoading(true)
        const { data, error } = await supabase
            .from('wilayah')
            .select('*')
            .order('rw', { ascending: true })
            .order('rt', { ascending: true })

        if (error) console.error('Error fetching wilayah:', error)
        else setWilayahList(data || [])

        await fetchStatistik()
        setLoading(false)
    }

    async function fetchStatistik() {
        const { data, error } = await supabase.from('vw_statistik_wilayah').select('*')
        if (error) {
            console.error('Error fetching statistik wilayah:', error)
            return
        }
        const map = {}
            ; (data || []).forEach((row) => {
                map[row.wilayah_id] = row
            })
        setStatistikMap(map)
    }

    // Fungsi untuk membuka Detail Pelanggan per Wilayah dari View vw_detail_wilayah
    const handleOpenPelangganModal = async (wilayah) => {
        setSelectedWilayah(wilayah)
        setShowPelangganModal(true)
        setLoadingPelanggan(true)

        const { data, error } = await supabase
            .from('vw_detail_wilayah')
            .select('list_pelanggan')
            .eq('id', wilayah.id)
            .single()

        if (error) {
            console.error('Error fetching pelanggan wilayah:', error)
            setPelangganList([])
        } else {
            setPelangganList(data?.list_pelanggan || [])
        }
        setLoadingPelanggan(false)
    }

    const handleOpenModal = (wilayah = null) => {
        if (wilayah) {
            setEditId(wilayah.id)
            setFormData({
                rt: wilayah.rt || '',
                rw: wilayah.rw || '',
                nama: wilayah.nama || '',
            })
        } else {
            setEditId(null)
            setFormData({
                rt: '',
                rw: '',
                nama: '',
            })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const payload = {
            ...formData,
            rt: formData.rt ? String(formData.rt).padStart(2, '0') : null,
            rw: formData.rw ? String(formData.rw).padStart(2, '0') : null,
        }

        if (editId) {
            await supabase.from('wilayah').update(payload).eq('id', editId)
        } else {
            await supabase.from('wilayah').insert([payload])
        }
        setShowModal(false)
        fetchWilayah()
    }

    const handleDelete = async (id) => {
        if (confirm('Yakin hapus wilayah ini? Pastikan tidak ada pelanggan yang masih terhubung ke wilayah ini.')) {
            await supabase.from('wilayah').delete().eq('id', id)
            fetchWilayah()
        }
    }

    const filteredWilayah = wilayahList.filter(
        (w) =>
            (w.rt || '').includes(search) ||
            (w.rw || '').includes(search) ||
            (w.nama || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Data Wilayah</h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola data RT/RW dan lihat jumlah pelanggan per wilayah.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center gap-2 w-fit"
                >
                    <span>➕</span> Tambah Wilayah
                </button>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="Cari berdasarkan RT, RW, atau nama wilayah..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
            </div>

            {/* Tabel Wilayah */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">RT</th>
                                <th className="px-6 py-4">RW</th>
                                <th className="px-6 py-4">Nama Wilayah</th>
                                <th className="px-6 py-4">Pelanggan Aktif</th>
                                <th className="px-6 py-4">Total Pelanggan</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat data wilayah...</td>
                                </tr>
                            ) : filteredWilayah.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Tidak ada wilayah ditemukan.</td>
                                </tr>
                            ) : (
                                filteredWilayah.map((w) => {
                                    const stat = statistikMap[w.id]
                                    const totalPelanggan = stat?.total_pelanggan ?? 0
                                    return (
                                        <tr key={w.id} className="hover:bg-slate-800/50 transition">
                                            <td className="px-6 py-4 font-mono text-cyan-400 font-semibold">{w.rt || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-cyan-400 font-semibold">{w.rw || '-'}</td>
                                            <td className="px-6 py-4 font-medium text-white">{w.nama || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                                    {stat?.total_pelanggan_aktif ?? 0} aktif
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* Dibuat tombol interaktif untuk melihat daftar pelanggan */}
                                                <button
                                                    onClick={() => handleOpenPelangganModal(w)}
                                                    className="hover:text-cyan-400 hover:underline font-medium transition cursor-pointer flex items-center gap-2 group"
                                                >
                                                    <span>{totalPelanggan} pelanggan</span>
                                                    <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-md group-hover:bg-cyan-900 transition">
                                                        👁️ Lihat
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenModal(w)}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(w.id)}
                                                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-lg text-xs transition border border-red-900/50"
                                                >
                                                    🗑️ Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail Pelanggan Per Wilayah */}
            {showPelangganModal && selectedWilayah && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-white">Daftar Pelanggan</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Wilayah: <span className="text-cyan-400 font-semibold">{selectedWilayah.nama || `RT ${selectedWilayah.rt} / RW ${selectedWilayah.rw}`}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPelangganModal(false)}
                                className="text-slate-400 hover:text-white transition p-1 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content Tabel Modal */}
                        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 uppercase text-xs sticky top-0 border-b border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Nama Pelanggan</th>
                                        <th className="px-4 py-3">No. WhatsApp</th>
                                        <th className="px-4 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {loadingPelanggan ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Memuat daftar pelanggan...</td>
                                        </tr>
                                    ) : pelangganList.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Belum ada pelanggan terdaftar di wilayah ini.</td>
                                        </tr>
                                    ) : (
                                        pelangganList.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-800/40">
                                                <td className="px-4 py-3 font-semibold text-white">{p.nama}</td>
                                                <td className="px-4 py-3 font-mono text-slate-400">{p.no_hp || '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === 'aktif'
                                                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                                            : 'bg-red-950/80 text-red-400 border border-red-800'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-2 text-xs text-slate-400 border-t border-slate-800">
                            <span>Total: <b className="text-white">{pelangganList.length}</b> pelanggan</span>
                            <button
                                onClick={() => setShowPelangganModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Form Tambah / Edit Wilayah */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {editId ? 'Edit Data Wilayah' : 'Tambah Wilayah Baru'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">RT</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="01"
                                        value={formData.rt}
                                        onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">RW</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="05"
                                        value={formData.rw}
                                        onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nama Wilayah</label>
                                <input
                                    type="text"
                                    placeholder="misal: Blok C"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition"
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