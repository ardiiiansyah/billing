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
        // map by wilayah_id -> data statistik (total_pelanggan, total_pelanggan_aktif, dll)
        const map = {}
            ; (data || []).forEach((row) => {
                map[row.wilayah_id] = row
            })
        setStatistikMap(map)
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
        // pastikan format 2 digit (01, 04, dst) sebelum simpan, konsisten dengan hasil cleaning data
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
                                            <td className="px-6 py-4 text-slate-300">{stat?.total_pelanggan ?? 0} pelanggan</td>
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

            {/* Modal Form Tambah / Edit */}
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