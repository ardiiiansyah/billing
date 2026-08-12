'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import BulkActionBar from '@/components/BulkActionBar'

export default function PelangganPage() {
  const [pelangganList, setPelangganList] = useState([])
  const [paketOptions, setPaketOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  // ── State Filter Advanced ─────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRt, setFilterRt] = useState('')
  const [filterPaket, setFilterPaket] = useState('')

  // ── State Bulk Action ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Modal Confirm Custom Bulk Status
  const [confirmStatusModal, setConfirmStatusModal] = useState({
    show: false,
    status: null,
  })

  // Modal WA Pengumuman Masal
  const [showBulkWaModal, setShowBulkWaModal] = useState(false)
  const [templateWaBulk, setTemplateWaBulk] = useState(
    'Halo Bapak/Ibu *[nama]*, berikut adalah pengumuman dari Sultan WiFi. Terima kasih 🙏'
  )
  const [showWaProgress, setShowWaProgress] = useState(false)
  const [waProgress, setWaProgress] = useState({ total: 0, terkirim: 0, gagal: 0, logs: [] })

  // Modal Generate Tagihan Terpilih
  const [showBulkGenModal, setShowBulkGenModal] = useState(false)
  const [genBulan, setGenBulan] = useState(new Date().getMonth() + 1)
  const [genTahun, setGenTahun] = useState(new Date().getFullYear())

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

  // List opsi RT dinamis dari data pelanggan
  const rtOptions = useMemo(() => {
    const rts = pelangganList.map((p) => p.rt).filter(Boolean)
    return [...new Set(rts)].sort()
  }, [pelangganList])

  // Logika Filter Multi-Kriteria
  const filteredPelanggan = useMemo(() => {
    return pelangganList.filter((p) => {
      const matchSearch =
        p.nama?.toLowerCase().includes(search.toLowerCase()) ||
        p.kode_pelanggan?.toLowerCase().includes(search.toLowerCase()) ||
        p.no_wa?.includes(search)

      const matchStatus = filterStatus ? p.status === filterStatus : true
      const matchRt = filterRt ? String(p.rt) === String(filterRt) : true
      const matchPaket = filterPaket ? p.paket_id === filterPaket : true

      return matchSearch && matchStatus && matchRt && matchPaket
    })
  }, [pelangganList, search, filterStatus, filterRt, filterPaket])

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

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  // ── Bulk Action Handlers ────────────────────────────────────────────
  const isAllSelected = filteredPelanggan.length > 0 && filteredPelanggan.every((p) => selectedIds.includes(p.id))

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredPelanggan.map((p) => p.id).includes(id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredPelanggan.map((p) => p.id)])])
    }
  }

  const handleToggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const executeBulkStatus = async (status) => {
    setBulkLoading(true)
    setConfirmStatusModal({ show: false, status: null })
    try {
      const res = await fetch('/api/bulk/pelanggan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', ids: selectedIds, payload: { status } }),
      })
      const data = await res.json()
      if (data.sukses) {
        setSelectedIds([])
        fetchPelanggan()
      } else {
        alert('Gagal: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error koneksi ke server.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkGenerate = async () => {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk/pelanggan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_tagihan', ids: selectedIds, payload: { bulan: genBulan, tahun: genTahun } }),
      })
      const data = await res.json()
      if (data.sukses) {
        setSelectedIds([])
        setShowBulkGenModal(false)
      } else {
        alert('Gagal: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error koneksi ke server.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkWaSend = async () => {
    if (!templateWaBulk.trim()) return
    setShowBulkWaModal(false)
    setShowWaProgress(true)
    setWaProgress({ total: selectedIds.length, terkirim: 0, gagal: 0, logs: [] })
    try {
      const res = await fetch('/api/bulk/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pelanggan', ids: selectedIds, pesan: templateWaBulk }),
      })
      const data = await res.json()
      if (data.sukses) {
        setWaProgress({ total: data.total, terkirim: data.terkirim, gagal: data.gagal, logs: data.logs })
        setSelectedIds([])
      } else {
        alert('Gagal: ' + (data.error || 'Unknown error'))
        setShowWaProgress(false)
      }
    } catch (err) {
      alert('Error koneksi ke server.')
      setShowWaProgress(false)
    }
  }

  const resetFilter = () => {
    setSearch('')
    setFilterStatus('')
    setFilterRt('')
    setFilterPaket('')
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

      {/* ── BARIS FILTER ADVANCED ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Cari Nama / Kode / WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Semua Status</option>
            <option value="aktif">🟢 Status: Aktif</option>
            <option value="isolir">🔴 Status: Isolir</option>
          </select>

          {/* Filter RT */}
          <select
            value={filterRt}
            onChange={(e) => setFilterRt(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Semua Wilayah RT</option>
            {rtOptions.map((rt) => (
              <option key={rt} value={rt}>
                Wilayah RT {rt}
              </option>
            ))}
          </select>

          {/* Filter Paket */}
          <select
            value={filterPaket}
            onChange={(e) => setFilterPaket(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Semua Paket</option>
            {paketOptions.map((pkt) => (
              <option key={pkt.id} value={pkt.id}>
                {pkt.nama_paket}
              </option>
            ))}
          </select>
        </div>

        {/* Ringkasan & Reset Filter */}
        {(search || filterStatus || filterRt || filterPaket) && (
          <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span>
              Ditemukan <b className="text-cyan-400">{filteredPelanggan.length}</b> dari {pelangganList.length} pelanggan
            </span>
            <button onClick={resetFilter} className="text-rose-400 hover:text-rose-300 font-medium">
              ✕ Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Tabel Pelanggan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer accent-cyan-500"
                  />
                </th>
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
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : filteredPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada pelanggan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPelanggan.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/50 transition ${selectedIds.includes(p.id) ? 'bg-cyan-950/20' : ''
                      }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleToggleOne(p.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer accent-cyan-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-cyan-400 font-semibold">{p.kode_pelanggan}</td>
                    <td className="px-6 py-4 font-medium text-white">
                      <div>{p.nama}</div>
                      <div className="text-xs text-slate-500">
                        {p.alamat} (RT {p.rt || '-'}/RW {p.rw || '-'})
                      </div>
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

      {/* ── Bulk Action Bar ─────────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Generate Tagihan',
            icon: '📄',
            variant: 'default',
            loading: bulkLoading,
            onClick: () => setShowBulkGenModal(true),
          },
          {
            label: 'Aktifkan',
            icon: '🟢',
            variant: 'success',
            loading: bulkLoading,
            onClick: () => setConfirmStatusModal({ show: true, status: 'aktif' }),
          },
          {
            label: 'Isolir',
            icon: '🔴',
            variant: 'warning',
            loading: bulkLoading,
            onClick: () => setConfirmStatusModal({ show: true, status: 'isolir' }),
          },
          {
            label: 'Kirim WA',
            icon: '📲',
            variant: 'default',
            loading: bulkLoading,
            onClick: () => setShowBulkWaModal(true),
          },
        ]}
      />

      {/* Modal Custom Konfirmasi Status */}
      {confirmStatusModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <span className="text-4xl block">{confirmStatusModal.status === 'aktif' ? '🟢' : '🔴'}</span>
              <h3 className="text-lg font-bold text-white">Konfirmasi Perubahan Status</h3>
              <p className="text-xs text-slate-400">
                Ubah status <b className="text-white">{selectedIds.length} pelanggan</b> terpilih menjadi{' '}
                <b className={confirmStatusModal.status === 'aktif' ? 'text-emerald-400' : 'text-amber-400'}>
                  {confirmStatusModal.status.toUpperCase()}
                </b>?
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmStatusModal({ show: false, status: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={() => executeBulkStatus(confirmStatusModal.status)}
                disabled={bulkLoading}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition ${confirmStatusModal.status === 'aktif' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                  }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generate Tagihan Terpilih */}
      {showBulkGenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Tagihan Terpilih</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIds.length} pelanggan aktif dipilih</p>
              </div>
              <button onClick={() => setShowBulkGenModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Bulan</label>
                <select
                  value={genBulan}
                  onChange={(e) => setGenBulan(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tahun</label>
                <input
                  type="number"
                  value={genTahun}
                  onChange={(e) => setGenTahun(Number(e.target.value))}
                  min={2020}
                  max={2099}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowBulkGenModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                ⚡ Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WA Pengumuman Masal */}
      {showBulkWaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Kirim WA Pengumuman Masal</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIds.length} pelanggan dipilih</p>
              </div>
              <button onClick={() => setShowBulkWaModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-400">
              <p className="text-slate-300 font-semibold mb-1">💡 Variabel tersedia:</p>
              <p>
                <code className="text-cyan-400">[nama]</code> — Nama pelanggan
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Template Pesan WA:</label>
              <textarea
                rows={5}
                value={templateWaBulk}
                onChange={(e) => setTemplateWaBulk(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowBulkWaModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700">
                Batal
              </button>
              <button
                onClick={handleBulkWaSend}
                disabled={!templateWaBulk.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                🚀 Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Progress WA */}
      {showWaProgress && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">📲 Progres Pengiriman WA</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Terkirim: <b className="text-emerald-400">{waProgress.terkirim}</b>
                </span>
                <span>
                  Gagal: <b className="text-red-400">{waProgress.gagal}</b>
                </span>
                <span>
                  Total: <b className="text-white">{waProgress.total}</b>
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: waProgress.total > 0 ? `${((waProgress.terkirim + waProgress.gagal) / waProgress.total) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
            {waProgress.logs.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800">
                {waProgress.logs.map((log, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between items-center text-xs">
                    <span className="text-slate-300">{log.nama}</span>
                    <span className={`font-semibold ${log.status === 'terkirim' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.status === 'terkirim' ? '✓ Terkirim' : '✗ Gagal'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {waProgress.terkirim + waProgress.gagal < waProgress.total ? (
              <p className="text-center text-xs text-slate-400 animate-pulse">⏳ Mengirim pesan, mohon tunggu...</p>
            ) : (
              <button
                onClick={() => setShowWaProgress(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}