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
    try {
      const { data, error } = await supabase
        .from('paket')
        .select('*')
        .order('harga', { ascending: true })

      if (error) throw error
      setPaketList(data || [])
    } catch (err) {
      console.error('DEBUG FETCH PAKET ERROR:', err.message)
    } finally {
      setLoading(false)
    }
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
    setLoading(true)

    const payload = {
      nama_paket: formData.nama_paket,
      kecepatan: formData.kecepatan,
      harga: Number(formData.harga),
      deskripsi: formData.deskripsi,
    }

    try {
      if (editId) {
        const { error } = await supabase.from('paket').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('paket').insert([payload])
        if (error) throw error
      }

      setShowModal(false)
      await fetchPaket()
    } catch (err) {
      console.error('DEBUG SUBMIT PAKET ERROR:', err.message)
      alert('Maaf, gagal menyimpan paket internet. Silakan periksa kembali isian form.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus paket ini?')) return

    setLoading(true)
    try {
      const { error } = await supabase.from('paket').delete().eq('id', id)
      if (error) throw error

      await fetchPaket()
    } catch (err) {
      console.error('DEBUG DELETE PAKET ERROR:', err.message)
      alert('Maaf, gagal menghapus paket internet.')
    } finally {
      setLoading(false)
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
          // ... (bagian atas kode tetap sama)

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
                  {/* Nama Paket */}
                  <td className="px-6 py-4 font-semibold text-white align-middle">{p.nama_paket}</td>

                  {/* Kecepatan dengan flex agar Badge rata tengah vertikal */}
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                        ⚡ {p.kecepatan}
                      </span>
                    </div>
                  </td>

                  {/* Harga */}
                  <td className="px-6 py-4 font-bold text-emerald-400 align-middle">{formatRupiah(p.harga)}</td>

                  {/* Deskripsi */}
                  <td className="px-6 py-4 text-slate-200 font-medium max-w-xs truncate align-middle">{p.deskripsi || '-'}</td>

                  {/* Aksi (Tombol rata kanan vertikal) */}
                  <td className="px-6 py-4 text-right space-x-2 align-middle">
                    <button
                      onClick={() => handleOpenModal(p)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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

// ... (bagian bawah kode tetap sama)
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
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-cyan-600/25"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
