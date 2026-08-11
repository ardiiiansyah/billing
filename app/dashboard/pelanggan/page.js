'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PelangganPage() {
  const [pelangganList, setPelangganList] = useState([])
  const [paketOptions, setPaketOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    kode_pelanggan: '',
    nama: '',
    no_wa: '',
    alamat: '',
    rt: '',
    rw: '',
    paket_id: '',
    tanggal_jatuh_tempo: 10,
    status: 'aktif',
  })

  useEffect(() => {
    fetchPelanggan()
    fetchPaketOptions()
  }, [])

  async function fetchPaketOptions() {
    const { data } = await supabase.from('paket').select('id, nama_paket, harga')
    setPaketOptions(data || [])
  }

  async function fetchPelanggan() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*, paket(nama_paket, harga)')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching pelanggan:', error)
    else setPelangganList(data || [])
    setLoading(false)
  }

  const handleOpenModal = (pelanggan = null) => {
    if (pelanggan) {
      setEditId(pelanggan.id)
      setFormData({
        kode_pelanggan: pelanggan.kode_pelanggan,
        nama: pelanggan.nama,
        no_wa: pelanggan.no_wa,
        alamat: pelanggan.alamat,
        rt: pelanggan.rt || '',
        rw: pelanggan.rw || '',
        paket_id: pelanggan.paket_id || '',
        tanggal_jatuh_tempo: pelanggan.tanggal_jatuh_tempo || 10,
        status: pelanggan.status || 'aktif',
      })
    } else {
      setEditId(null)
      const nextCode = `WIFI-${String(pelangganList.length + 1).padStart(3, '0')}`
      setFormData({
        kode_pelanggan: nextCode,
        nama: '',
        no_wa: '',
        alamat: '',
        rt: '',
        rw: '',
        paket_id: paketOptions[0]?.id || '',
        tanggal_jatuh_tempo: 10,
        status: 'aktif',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editId) {
      await supabase.from('pelanggan').update(formData).eq('id', editId)
    } else {
      await supabase.from('pelanggan').insert([formData])
    }
    setShowModal(false)
    fetchPelanggan()
  }

  const handleToggleStatus = async (pelanggan) => {
    const newStatus = pelanggan.status === 'aktif' ? 'isolir' : 'aktif'
    await supabase.from('pelanggan').update({ status: newStatus }).eq('id', pelanggan.id)
    fetchPelanggan()
  }

  const handleDelete = async (id) => {
    if (confirm('Yakin hapus data pelanggan ini? Tagihan terkait juga akan terhapus.')) {
      await supabase.from('pelanggan').delete().eq('id', id)
      fetchPelanggan()
    }
  }

  const filteredPelanggan = pelangganList.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_pelanggan.toLowerCase().includes(search.toLowerCase()) ||
      p.no_wa.includes(search)
  )

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Data Pelanggan WiFi</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola data warga, paket terpilih, dan status koneksi.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center gap-2 w-fit"
        >
          <span>➕</span> Tambah Pelanggan
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <span className="text-lg">🔍</span>
        <input
          type="text"
          placeholder="Cari berdasarkan nama, kode (WIFI-001), atau No WA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-100 placeholde  r-slate-500 focus:outline-none"
        />
      </div>

      {/* Tabel Pelanggan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">ID Pelanggan</th>
                <th className="px-6 py-4">Nama Warga</th>
                <th className="px-6 py-4">No WhatsApp</th>
                <th className="px-6 py-4">Paket Langganan</th>
                <th className="px-6 py-4">Jatuh Tempo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Memuat data pelanggan...</td>
                </tr>
              ) : filteredPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Tidak ada pelanggan ditemukan.</td>
                </tr>
              ) : (
                filteredPelanggan.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4 font-mono text-cyan-400 font-semibold">{p.kode_pelanggan}</td>
                    <td className="px-6 py-4 font-medium text-white">
                      <div>{p.nama}</div>
                      <div className="text-xs text-slate-500">{p.alamat} (RT {p.rt || '-'}/RW {p.rw || '-'})</div>
                    </td>
                    <td className="px-6 py-4">{p.no_wa}</td>
                    <td className="px-6 py-4">
                      {p.paket ? (
                        <div>
                          <span className="font-semibold text-slate-200">{p.paket.nama_paket}</span>
                          <div className="text-xs text-emerald-400">{formatRupiah(p.paket.harga)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">Tgl {p.tanggal_jatuh_tempo}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition ${p.status === 'aktif'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-red-950/80 text-red-400 border border-red-800 hover:bg-red-900'
                          }`}
                      >
                        {p.status === 'aktif' ? '🟢 Aktif' : '🔴 Isolir'}
                      </button>
                    </td>
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
      </div>

      {/* Modal Form Tambah / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-4">
              {editId ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Kode Pelanggan</label>
                  <input
                    type="text"
                    required
                    value={formData.kode_pelanggan}
                    onChange={(e) => setFormData({ ...formData, kode_pelanggan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nama Warga</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">No WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={formData.no_wa}
                    onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Pilihan Paket</label>
                  <select
                    value={formData.paket_id}
                    onChange={(e) => setFormData({ ...formData, paket_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Pilih Paket --</option>
                    {paketOptions.map((pkt) => (
                      <option key={pkt.id} value={pkt.id}>
                        {pkt.nama_paket} ({formatRupiah(pkt.harga)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Alamat Rumah</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Alamat / Blok No..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">RT</label>
                  <input
                    type="text"
                    placeholder="01"
                    value={formData.rt}
                    onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">RW</label>
                  <input
                    type="text"
                    placeholder="05"
                    value={formData.rw}
                    onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tgl Jatuh Tempo</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={formData.tanggal_jatuh_tempo}
                    onChange={(e) => setFormData({ ...formData, tanggal_jatuh_tempo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
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
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
