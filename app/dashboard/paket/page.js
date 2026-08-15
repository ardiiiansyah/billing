'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PaketPage() {
  const [paketList, setPaketList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  // State untuk Custom Modal Konfirmasi Hapus
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({
    show: false,
    id: null,
  })

  const [formData, setFormData] = useState({
    nama_paket: '',
    harga: '',
    kecepatan: '',
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
        nama_paket: paket.nama_paket || '',
        harga: paket.harga || '',
        kecepatan: paket.kecepatan || '',
        deskripsi: paket.deskripsi || '',
      })
    } else {
      setEditId(null)
      setFormData({
        nama_paket: '',
        harga: '',
        kecepatan: '',
        deskripsi: '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      nama_paket: formData.nama_paket,
      harga: Number(formData.harga),
      kecepatan: formData.kecepatan,
      deskripsi: formData.deskripsi || null,
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
      alert('Maaf, gagal menyimpan data paket: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const executeDelete = async () => {
    if (!confirmDeleteModal.id) return

    setLoading(true)
    try {
      const { error } = await supabase.from('paket').delete().eq('id', confirmDeleteModal.id)
      if (error) throw error

      setConfirmDeleteModal({ show: false, id: null })
      await fetchPaket()
    } catch (err) {
      console.error('DEBUG DELETE PAKET ERROR:', err.message)
      alert('Maaf, gagal menghapus paket. Silakan coba lagi nanti.')
    } finally {
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
            Kelola Paket WiFi
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Atur pilihan kecepatan, harga bulanan, dan variasi paket langganan warga.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/25 active:scale-95 flex items-center gap-2"
        >
          <span className="text-base leading-none">➕</span> Tambah Paket
        </button>
      </div>

      {/* Daftar Paket Cards / Tabel */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="px-5 py-3.5 font-bold">Nama Paket</th>
                <th className="px-5 py-3.5 font-bold">Kecepatan</th>
                <th className="px-5 py-3.5 font-bold">Harga Bulanan</th>
                <th className="px-5 py-3.5 font-bold">Deskripsi</th>
                <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Memuat data paket...
                  </td>
                </tr>
              ) : paketList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="text-2xl">📦</span>
                      <span className="font-medium text-slate-400">Belum ada paket WiFi tersedia</span>
                      <span className="text-[11px] text-slate-600">Klik "Tambah Paket" untuk membuat paket baru.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paketList.map((pkt) => (
                  <tr key={pkt.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                    <td className="px-5 py-4 font-bold text-white text-sm">
                      {pkt.nama_paket}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold text-xs">
                        {pkt.kecepatan || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-emerald-400 text-xs">
                      {formatRupiah(pkt.harga)}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {pkt.deskripsi || '-'}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => handleOpenModal(pkt)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteModal({ show: true, id: pkt.id })}
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

      {/* Modal Form Tambah / Edit Paket */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>{editId ? '✏️' : '➕'}</span>
              <span>{editId ? 'Edit Data Paket' : 'Tambah Paket Baru'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nama Paket</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Paket Hemat / 10 Mbps"
                  value={formData.nama_paket}
                  onChange={(e) => setFormData({ ...formData, nama_paket: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Harga Bulanan (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Kecepatan</label>
                  <input
                    type="text"
                    placeholder="10 Mbps"
                    value={formData.kecepatan}
                    onChange={(e) => setFormData({ ...formData, kecepatan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan fasilitas atau kuota paket..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
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
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-600/25 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Custom Konfirmasi Hapus Paket */}
      {confirmDeleteModal.show && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">🗑️</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Konfirmasi Hapus Paket</h3>
              <p className="text-xs text-slate-400">
                Yakin ingin menghapus data paket ini? Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteModal({ show: false, id: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-rose-900/30"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}