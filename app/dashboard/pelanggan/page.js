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

  // ── State Filter Advanced & Mobile Toggle ─────────────────────────
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRt, setFilterRt] = useState('')
  const [filterPaket, setFilterPaket] = useState('')
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // ── State Bulk Action ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Modal Confirm Custom Bulk Status
  const [confirmStatusModal, setConfirmStatusModal] = useState({
    show: false,
    status: null,
  })

  // Modal Confirm Custom Hapus Pelanggan
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({
    show: false,
    id: null,
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

  // ── AUTO-SYNC REALTIME & POLLING ──────────────────────────────────
  useEffect(() => {
    fetchPelanggan()
    fetchPaketOptions()

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchPelanggan()
      }
    }

    const interval = setInterval(() => {
      fetchPelanggan()
    }, 10000)

    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      clearInterval(interval)
    }
  }, [])

  async function fetchPaketOptions() {
    const { data } = await supabase.from('paket').select('id, nama_paket, harga')
    setPaketOptions(data || [])
  }

  async function fetchPelanggan() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pelanggan')
        .select('*, paket(nama_paket, harga), wilayah(nama, rt, rw)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPelangganList(data || [])
    } catch (err) {
      console.error('DEBUG FETCH PELANGGAN ERROR:', err.message)
    } finally {
      setLoading(false)
    }
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

  // Stats ringkasan cepat untuk header pelanggan
  const statsSummary = useMemo(() => {
    const total = pelangganList.length
    const aktif = pelangganList.filter(p => p.status === 'aktif').length
    const isolir = pelangganList.filter(p => p.status === 'isolir').length
    return { total, aktif, isolir }
  }, [pelangganList])

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
    setLoading(true)

    try {
      const payload = {
        kode_pelanggan: formData.kode_pelanggan,
        nama: formData.nama,
        alamat: formData.alamat,
        no_wa: formData.no_wa,
        rt: formData.rt,
        rw: formData.rw,
        paket_id: formData.paket_id || null,
        tanggal_jatuh_tempo: formData.tanggal_jatuh_tempo,
        status: formData.status || 'aktif',
      }

      if (editId) {
        const { error } = await supabase.from('pelanggan').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pelanggan').insert([payload])
        if (error) throw error
      }

      setShowModal(false)
      await fetchPelanggan()
    } catch (err) {
      console.error('DEBUG SUBMIT PELANGGAN ERROR:', err.message)
      alert('Maaf, gagal menyimpan data pelanggan. Silakan periksa kembali isian form.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (pelanggan) => {
    const newStatus = pelanggan.status === 'aktif' ? 'isolir' : 'aktif'
    await supabase.from('pelanggan').update({ status: newStatus }).eq('id', pelanggan.id)
    fetchPelanggan()
  }

  const executeDelete = async () => {
    if (!confirmDeleteModal.id) return

    setLoading(true)
    try {
      const { error } = await supabase.from('pelanggan').delete().eq('id', confirmDeleteModal.id)
      if (error) throw error

      setConfirmDeleteModal({ show: false, id: null })
      await fetchPelanggan()
    } catch (err) {
      console.error('DEBUG DELETE PELANGGAN ERROR:', err.message)
      alert('Maaf, gagal menghapus data pelanggan.')
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

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
      {/* Header Halaman Glassmorphism */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Data Pelanggan WiFi
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Kelola data warga, paket terpilih, dan status koneksi jaringan.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Tombol Toggle Filter khusus Mobile */}
          <button
            onClick={() => setShowMobileFilter(!showMobileFilter)}
            className="md:hidden flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2"
          >
            <span>🔍</span> {showMobileFilter ? 'Tutup Filter' : 'Filter'}
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none">➕</span> Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan Cepat (Mini Stat Cards - Grid 2x2 di HP, 4 di PC) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pelanggan */}
        <div className="bg-gradient-to-b from-blue-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Total Pelanggan</p>
            <p className="text-lg sm:text-xl font-extrabold text-white mt-1">{statsSummary.total}</p>
          </div>
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm sm:text-base shadow-inner">
            👥
          </span>
        </div>

        {/* Pelanggan Aktif */}
        <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Pelanggan Aktif</p>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1">{statsSummary.aktif}</p>
          </div>
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm sm:text-base shadow-inner">
            ✅
          </span>
        </div>

        {/* Status Isolir */}
        <div className="bg-gradient-to-b from-rose-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Status Isolir</p>
            <p className="text-lg sm:text-xl font-extrabold text-rose-400 mt-1">{statsSummary.isolir}</p>
          </div>
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-sm sm:text-base shadow-inner">
            🔴
          </span>
        </div>

        {/* Wilayah RT */}
        <div className="bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Wilayah RT</p>
            <p className="text-lg sm:text-xl font-extrabold text-amber-400 mt-1">{rtOptions.length} RT</p>
          </div>
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm sm:text-base shadow-inner">
            📍
          </span>
        </div>
      </div>

      {/* Baris Filter Advanced (Bisa disembunyikan di Mobile lewat tombol Filter) */}
      <div className={`bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-xl shadow-black/20 ${showMobileFilter ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl focus-within:border-cyan-500/80 transition duration-200">
            <span className="text-slate-400 text-xs">🔍</span>
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
            className="bg-slate-950/80 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:border-cyan-500/80 transition duration-200 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="aktif">🟢 Status: Aktif</option>
            <option value="isolir">🔴 Status: Isolir</option>
          </select>

          {/* Filter RT */}
          <select
            value={filterRt}
            onChange={(e) => setFilterRt(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:border-cyan-500/80 transition duration-200 cursor-pointer"
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
            className="bg-slate-950/80 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:border-cyan-500/80 transition duration-200 cursor-pointer"
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
          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>
              Ditemukan <b className="text-cyan-400 font-bold">{filteredPelanggan.length}</b> dari {pelangganList.length} pelanggan
            </span>
            <button onClick={resetFilter} className="text-rose-400 hover:text-rose-300 font-semibold transition">
              ✕ Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Konten Utama Pelanggan: Tampilan Kartu untuk Mobile, Tabel untuk Desktop */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
            Memuat data pelanggan...
          </div>
        ) : filteredPelanggan.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-1.5">
              <span className="text-2xl">🔍</span>
              <span className="font-medium text-slate-400">Tidak ada pelanggan ditemukan</span>
              <span className="text-[11px] text-slate-600">Coba ubah kata kunci pencarian atau reset filter.</span>
            </div>
          </div>
        ) : (
          <>
            {/* TAMPILAN MOBILE: Model Kartu (Card View) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredPelanggan.map((p) => (
                <div
                  key={p.id}
                  className={`bg-slate-900/90 border rounded-2xl p-4 space-y-3 transition-all ${selectedIds.includes(p.id) ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800'
                    }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleToggleOne(p.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                      />
                      <a href={`/dashboard/pelanggan/${p.id}`} className="font-mono text-cyan-400 font-bold text-xs hover:underline">
                        {p.kode_pelanggan}
                      </a>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${p.status === 'aktif'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                    >
                      {p.status === 'aktif' ? '🟢 Aktif' : '🔴 Isolir'}
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0 shadow-inner">
                      {getInitials(p.nama)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={`/dashboard/pelanggan/${p.id}`} className="hover:underline text-white font-bold text-sm block truncate">
                        {p.nama}
                      </a>
                      <p className="text-slate-400 text-xs truncate mt-0.5">
                        {p.alamat} <span className="text-slate-500">(RT {p.rt || '-'}/RW {p.rw || '-'})</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">PAKET & HARGA</span>
                      <span className="font-bold text-slate-200">{p.paket ? p.paket.nama_paket : '-'}</span>
                      <div className="text-emerald-400 text-[11px] font-semibold">{p.paket ? formatRupiah(p.paket.harga) : ''}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">JATUH TEMPO & WA</span>
                      <span className="text-slate-300 font-medium">Tgl {p.tanggal_jatuh_tempo}</span>
                      <div className="mt-0.5">
                        {p.no_wa ? (
                          <a
                            href={`https://wa.me/${p.no_wa.replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-semibold hover:underline"
                          >
                            <span>💬</span> {p.no_wa}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteModal({ show: true, id: p.id })}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition border border-rose-500/20"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* TAMPILAN DESKTOP: Tabel Modern Tradisional */}
            <div className="hidden md:block bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleAll}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                        />
                      </th>
                      <th className="px-5 py-3.5 font-bold">ID Pelanggan</th>
                      <th className="px-5 py-3.5 font-bold">Nama Warga</th>
                      <th className="px-5 py-3.5 font-bold">No WhatsApp</th>
                      <th className="px-5 py-3.5 font-bold">Paket Langganan</th>
                      <th className="px-5 py-3.5 font-bold">Jatuh Tempo</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredPelanggan.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-800/40 transition-colors duration-150 ${selectedIds.includes(p.id) ? 'bg-cyan-950/25' : ''
                          }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => handleToggleOne(p.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                          />
                        </td>
                        <td className="px-5 py-4 font-mono text-cyan-400 font-bold text-xs">
                          <a href={`/dashboard/pelanggan/${p.id}`} className="hover:underline">
                            {p.kode_pelanggan}
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0 shadow-inner">
                              {getInitials(p.nama)}
                            </div>
                            <div>
                              <a href={`/dashboard/pelanggan/${p.id}`} className="hover:underline text-white font-bold text-sm block">
                                {p.nama}
                              </a>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {p.alamat} <span className="text-slate-500">(RT {p.rt || '-'}/RW {p.rw || '-'})</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {p.no_wa ? (
                            <a
                              href={`https://wa.me/${p.no_wa.replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-mono text-xs font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                            >
                              <span>💬</span> {p.no_wa}
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {p.paket ? (
                            <div>
                              <span className="font-bold text-slate-200 text-xs">{p.paket.nama_paket}</span>
                              <div className="text-xs text-emerald-400 font-semibold mt-0.5">{formatRupiah(p.paket.harga)}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-300 font-medium text-xs">Tgl {p.tanggal_jatuh_tempo}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200 ${p.status === 'aktif'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                              }`}
                          >
                            {p.status === 'aktif' ? '🟢 Aktif' : '🔴 Isolir'}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleOpenModal(p)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteModal({ show: true, id: p.id })}
                            disabled={loading}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition border border-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🗑️ Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>{editId ? '✏️' : '➕'}</span>
              <span>{editId ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Kode Pelanggan</label>
                  <input
                    type="text"
                    required
                    value={formData.kode_pelanggan}
                    onChange={(e) => setFormData({ ...formData, kode_pelanggan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nama Warga</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">No WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={formData.no_wa}
                    onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Pilihan Paket</label>
                  <select
                    value={formData.paket_id}
                    onChange={(e) => setFormData({ ...formData, paket_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
                <label className="block text-slate-400 font-medium mb-1">Alamat Rumah</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Alamat / Blok No..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">RT</label>
                  <input
                    type="text"
                    placeholder="01"
                    value={formData.rt}
                    onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">RW</label>
                  <input
                    type="text"
                    placeholder="05"
                    value={formData.rw}
                    onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Tgl Jatuh Tempo</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={formData.tanggal_jatuh_tempo}
                    onChange={(e) => setFormData({ ...formData, tanggal_jatuh_tempo: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-cyan-600/25"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Custom Konfirmasi Hapus Pelanggan */}
      {confirmDeleteModal.show && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">🗑️</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Konfirmasi Hapus Data</h3>
              <p className="text-xs text-slate-400">
                Yakin ingin menghapus data pelanggan ini? Data yang dihapus tidak dapat dikembalikan.
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

      {/* Bulk Action Bar */}
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowBulkGenModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                ⚡ Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WA Pengumuman Masal */}
      {showBulkWaModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
              <p className="text-slate-300 font-semibold mb-1">💡 Variabel tersedia:</p>
              <p>
                <code className="text-cyan-400 font-bold">[nama]</code> — Nama pelanggan
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Template Pesan WA:</label>
              <textarea
                rows={5}
                value={templateWaBulk}
                onChange={(e) => setTemplateWaBulk(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowBulkWaModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700">
                Batal
              </button>
              <button
                onClick={handleBulkWaSend}
                disabled={!templateWaBulk.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                🚀 Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Progress WA */}
      {showWaProgress && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">📲 Progres Pengiriman WA</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Terkirim: <b className="text-emerald-400">{waProgress.terkirim}</b>
                </span>
                <span>
                  Gagal: <b className="text-rose-400">{waProgress.gagal}</b>
                </span>
                <span>
                  Total: <b className="text-white">{waProgress.total}</b>
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: waProgress.total > 0 ? `${((waProgress.terkirim + waProgress.gagal) / waProgress.total) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
            {waProgress.logs.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60 bg-slate-950/40">
                {waProgress.logs.map((log, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">{log.nama}</span>
                    <span className={`font-semibold text-[11px] ${log.status === 'terkirim' ? 'text-emerald-400' : 'text-rose-400'}`}>
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