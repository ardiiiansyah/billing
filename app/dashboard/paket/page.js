'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PaketPage() {
  const [paketList, setPaketList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    nama_paket: '',
    kecepatan: '',
    harga: '',
    deskripsi: '',
  })

  useEffect(() => {
    fetchPaket()
  }, [])

  async function fetchPaket() {
    setLoading(true)
    const { data, error } = await supabase.from('paket').select('*').order('created_at', { ascending: true })
    if (error) console.error('Error fetching paket:', error)
    else setPaketList(data || [])
    setLoading(false)
  }

  const handleOpenModal = (paket = null) => {
    if (paket) {
      setEditId(paket.id)
      setFormData({
        nama_paket: paket.nama_paket,
        kecepatan: paket.kecepatan,
        harga: paket.harga,
        deskripsi: paket.deskripsi || '',
      })
    } else {
      setEditId(null)
      setFormData({ nama_paket: '', kecepatan: '', harga: '', deskripsi: '' })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editId) {
      await supabase.from('paket').update(formData).eq('id', editId)
    } else {
      await supabase.from('paket').insert([formData])
    }
    setShowModal(false)
    fetchPaket()
  }

  const handleDelete = async (id) => {
    if (confirm('Yakin ingin menghapus paket ini?')) {
      await supabase.from('paket').delete().eq('id', id)
      fetchPaket()
    }
  }

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manajemen Paket Internet</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola varian paket, kecepatan, dan tarif langganan bulanan.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center gap-2 w-fit"
        >
          <span>➕</span> Tambah Paket Baru
        </button>
      </div>

      {/* Tabel Paket */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Nama Paket</th>
              <th className="px-6 py-4">Kecepatan</th>
              <th className="px-6 py-4">Harga / Bulan</th>
              <th className="px-6 py-4">Deskripsi</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Memuat data paket...</td>
              </tr>
            ) : paketList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Belum ada paket. Klik "+ Tambah Paket Baru" untuk membuat.</td>
              </tr>
            ) : (
              paketList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4 font-semibold text-white">{p.nama_paket}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                      ⚡ {p.kecepatan}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">{formatRupiah(p.harga)}</td>
                  <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{p.deskripsi || '-'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-lg text-xs transition border border-red-900/50"
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

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editId ? 'Edit Paket Internet' : 'Tambah Paket Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nama Paket</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: Paket Hemat 10M"
                  value={formData.nama_paket}
                  onChange={(e) => setFormData({ ...formData, nama_paket: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kecepatan Bandwidth</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: 10 Mbps"
                  value={formData.kecepatan}
                  onChange={(e) => setFormData({ ...formData, kecepatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Harga Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="contoh: 100000"
                  value={formData.harga}
                  onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Deskripsi / Keterangan</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan tambahan..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
