'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import BulkActionBar from '@/components/BulkActionBar'

export default function TagihanPage() {
  const [tagihanList, setTagihanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterStatus, setFilterStatus] = useState('semua')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState(null)
  const [sendingWa, setSendingWa] = useState(null)

  // State untuk Custom Modal Konfirmasi Generate Tagihan & Hasil
  const [confirmGenerateModal, setConfirmGenerateModal] = useState(false)
  const [resultModal, setResultModal] = useState({ show: false, message: '' })
  const [confirmActionModal, setConfirmActionModal] = useState({ show: false, title: '', message: '', onConfirm: null })

  const [bayarForm, setBayarForm] = useState({
    jumlah_bayar: '',
    metode_pembayaran: 'cash',
    catatan: '',
  })

  // ── State Bulk Action ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Modal WA Masal
  const [showBulkWaModal, setShowBulkWaModal] = useState(false)
  const [templateWaBulk, setTemplateWaBulk] = useState(
    'Halo Bapak/Ibu *[nama]*, tagihan WiFi Sultan bulan ini belum dibayar.\n\nSegera lakukan pembayaran via link berikut:\n[link_bayar]\n\nTerima kasih 🙏'
  )

  // Modal Progress WA
  const [showWaProgress, setShowWaProgress] = useState(false)
  const [waProgress, setWaProgress] = useState({ total: 0, terkirim: 0, gagal: 0, logs: [] })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchTagihan()
  }, [])

  async function fetchTagihan() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tagihan')
        .select('*, pelanggan(nama, kode_pelanggan, no_wa, paket(nama_paket, harga))')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTagihanList(data || [])
    } catch (err) {
      console.error('DEBUG FETCH TAGIHAN ERROR:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBulanan = async () => {
    setConfirmGenerateModal(false)
    setGenerating(true)

    try {
      const { data, error } = await supabase.rpc('generate_tagihan_bulanan', {
        p_bulan: currentMonth,
        p_tahun: currentYear,
      })

      if (error) throw error

      setResultModal({
        show: true,
        message: `Berhasil generate ${data || 0} tagihan bulanan baru!`
      })
      fetchTagihan()
    } catch (err) {
      console.error('DEBUG GENERATE BULANAN ERROR:', err.message || err)
      setResultModal({ show: true, message: 'Maaf, terjadi kendala saat men-generate tagihan. Silakan periksa koneksi atau coba lagi.' })
    } finally {
      setGenerating(false)
    }
  }

  const handleKirimMidtrans = async (tagihan) => {
    if (!tagihan.pelanggan?.no_wa) {
      setResultModal({ show: true, message: `Pelanggan ${tagihan.pelanggan?.nama} tidak memiliki nomor WhatsApp!` })
      return
    }

    setSendingWa(tagihan.id)

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagihan_id: tagihan.id,
          pelanggan_nama: tagihan.pelanggan?.nama,
          pelanggan_wa: tagihan.pelanggan?.no_wa,
          jumlah: tagihan.jumlah_tagihan,
          bulan: tagihan.bulan,
          tahun: tagihan.tahun,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setResultModal({ show: true, message: 'Gagal membuat link pembayaran: ' + (data.error || 'Unknown error') })
        return
      }

      fetchTagihan()

      // Beri tahu pengguna bahwa pesan berhasil dikirim otomatis
      setResultModal({ show: true, message: 'Link pembayaran berhasil dibuat dan pesan WA berhasil dikirim otomatis!' })

    } catch (err) {
      setResultModal({ show: true, message: 'Error koneksi ke server.' })
    } finally {
      setSendingWa(null)
    }
  }

  const handleOpenPayModal = (tagihan) => {
    setSelectedTagihan(tagihan)
    setBayarForm({
      jumlah_bayar: tagihan.jumlah_tagihan,
      metode_pembayaran: 'cash',
      catatan: '',
    })
    setShowPayModal(true)
  }

  const handleProcessPayment = async (e) => {
    e.preventDefault()
    if (!selectedTagihan) return

    // 1. Masukkan data ke tabel pembayaran
    const { error: errBayar } = await supabase.from('pembayaran').insert([
      {
        tagihan_id: selectedTagihan.id,
        jumlah_bayar: bayarForm.jumlah_bayar,
        metode_pembayaran: bayarForm.metode_pembayaran,
        catatan: bayarForm.catatan,
        diterima_oleh: 'Admin Kasir',
      },
    ])

    if (errBayar) {
      setResultModal({ show: true, message: 'Gagal mencatat pembayaran: ' + errBayar.message })
      return
    }

    // 2. UPDATE status tagihan menjadi 'lunas' agar laporan terbaca lunas
    const { error: errUpdate } = await supabase
      .from('tagihan')
      .update({ status_pembayaran: 'lunas' })
      .eq('id', selectedTagihan.id)

    if (errUpdate) {
      setResultModal({ show: true, message: 'Pembayaran tercatat, tapi gagal update status tagihan: ' + errUpdate.message })
    } else {
      setShowPayModal(false)
      fetchTagihan()
      setResultModal({ show: true, message: 'Pembayaran tunai berhasil dicatat dan status tagihan menjadi Lunas!' })
    }
  }

  const filteredTagihan = tagihanList.filter((t) => {
    if (filterStatus === 'semua') return true
    return t.status_pembayaran === filterStatus
  })

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const counts = {
    semua: tagihanList.length,
    belum_bayar: tagihanList.filter((t) => t.status_pembayaran === 'belum_bayar').length,
    lunas: tagihanList.filter((t) => t.status_pembayaran === 'lunas').length,
    sebagian: tagihanList.filter((t) => t.status_pembayaran === 'sebagian').length,
  }

  const isAllSelected = filteredTagihan.length > 0 && filteredTagihan.every(t => selectedIds.includes(t.id))

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredTagihan.map(t => t.id).includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredTagihan.map(t => t.id)])])
    }
  }

  const handleToggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleBulkPayCash = () => {
    setConfirmActionModal({
      show: true,
      title: 'Tandai Lunas Cash',
      message: `Tandai ${selectedIds.length} tagihan sebagai LUNAS (cash)?`,
      onConfirm: async () => {
        setConfirmActionModal({ show: false, title: '', message: '', onConfirm: null })
        setBulkLoading(true)
        try {
          const res = await fetch('/api/bulk/tagihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'pay_cash', ids: selectedIds })
          })
          const data = await res.json()
          if (data.sukses) {
            setResultModal({ show: true, message: data.message })
            setSelectedIds([])
            fetchTagihan()
          } else {
            setResultModal({ show: true, message: 'Gagal: ' + (data.error || 'Unknown error') })
          }
        } catch (err) {
          setResultModal({ show: true, message: 'Error koneksi ke server.' })
        } finally {
          setBulkLoading(false)
        }
      }
    })
  }

  const handleBulkDelete = () => {
    setConfirmActionModal({
      show: true,
      title: 'Hapus Tagihan Terpilih',
      message: `Hapus ${selectedIds.length} tagihan terpilih? Aksi ini tidak bisa dibatalkan!`,
      onConfirm: async () => {
        setConfirmActionModal({ show: false, title: '', message: '', onConfirm: null })
        setBulkLoading(true)
        try {
          const res = await fetch('/api/bulk/tagihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids: selectedIds })
          })
          const data = await res.json()
          if (data.sukses) {
            setResultModal({ show: true, message: data.message })
            setSelectedIds([])
            fetchTagihan()
          } else {
            setResultModal({ show: true, message: 'Gagal: ' + (data.error || 'Unknown error') })
          }
        } catch (err) {
          setResultModal({ show: true, message: 'Error koneksi ke server.' })
        } finally {
          setBulkLoading(false)
        }
      }
    })
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
        body: JSON.stringify({ mode: 'tagihan', ids: selectedIds, pesan: templateWaBulk })
      })
      const data = await res.json()
      if (data.sukses) {
        setWaProgress({ total: data.total, terkirim: data.terkirim, gagal: data.gagal, logs: data.logs })
        setSelectedIds([])
      } else {
        setResultModal({ show: true, message: 'Gagal: ' + (data.error || 'Unknown error') })
        setShowWaProgress(false)
      }
    } catch (err) {
      setResultModal({ show: true, message: 'Error koneksi ke server.' })
      setShowWaProgress(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tagihan & Kasir</h1>
          <p className="text-slate-400 text-sm mt-1">Generate tagihan bulanan & kirim ke WhatsApp pelanggan.</p>
        </div>
        <button
          onClick={() => setConfirmGenerateModal(true)}
          disabled={generating}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 w-fit"
        >
          <span>⚡</span> {generating ? 'Memproses & Mengirim WA...' : 'Generate Tagihan Bulanan'}
        </button>
      </div>

      {/* Kartu Metrik / Statistik Ringkas dengan Efek 3D Hover */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tagihan', count: counts.semua, color: 'text-slate-200', icon: '📊' },
          { label: 'Belum Bayar', count: counts.belum_bayar, color: 'text-red-400', icon: '⚠️' },
          { label: 'Lunas', count: counts.lunas, color: 'text-emerald-400', icon: '✅' },
          { label: 'Sebagian', count: counts.sebagian, color: 'text-amber-400', icon: '⏳' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{s.label}</div>
              <span className="text-base">{s.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Tab Filter Status */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {['semua', 'belum_bayar', 'lunas', 'sebagian'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${filterStatus === st
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tabel Tagihan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 w-10 align-middle">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer accent-cyan-500"
                  />
                </th>
                <th className="px-6 py-4 align-middle">Pelanggan</th>
                <th className="px-6 py-4 align-middle">Periode</th>
                <th className="px-6 py-4 align-middle">Nominal</th>
                <th className="px-6 py-4 align-middle">Jatuh Tempo</th>
                <th className="px-6 py-4 align-middle">Status</th>
                <th className="px-6 py-4 text-right align-middle">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Memuat daftar tagihan...
                  </td>
                </tr>
              ) : filteredTagihan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-slate-500 text-4xl mb-3">🧾</div>
                    <div className="text-slate-400 font-medium">Tidak ada tagihan ditemukan.</div>
                    <div className="text-slate-500 text-xs mt-1">Klik tombol "Generate Tagihan Bulanan" di atas untuk membuat tagihan baru.</div>
                  </td>
                </tr>
              ) : (
                filteredTagihan.map((t) => (
                  <tr key={t.id} className={`hover:bg-slate-800/50 transition ${selectedIds.includes(t.id) ? 'bg-cyan-950/20' : ''}`}>
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => handleToggleOne(t.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer accent-cyan-500"
                      />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="font-semibold text-white">{t.pelanggan?.nama || 'Pelanggan Dihapus'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {t.pelanggan?.kode_pelanggan} · 📱 {t.pelanggan?.no_wa || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium align-middle">Bulan {t.bulan}/{t.tahun}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400 align-middle">{formatRupiah(t.jumlah_tagihan)}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs align-middle">{t.tanggal_jatuh_tempo}</td>
                    <td className="px-6 py-4 align-middle">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${t.status_pembayaran === 'lunas'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : t.status_pembayaran === 'sebagian'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                      >
                        {t.status_pembayaran.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      {t.status_pembayaran !== 'lunas' ? (
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleKirimMidtrans(t)}
                            disabled={sendingWa === t.id}
                            title="Kirim pesan WhatsApp ke pelanggan"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-900/25 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {sendingWa === t.id ? (
                              <span>⏳ Proses...</span>
                            ) : (
                              <>
                                <span>💬</span>
                                <span>Kirim WA</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenPayModal(t)}
                            title="Catat pembayaran tunai langsung"
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1"
                          >
                            <span>💵</span> Tunai
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          ✓ Lunas
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kotak Panduan Penggunaan */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5 shadow-sm">
        <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
          <span>ℹ️</span> Panduan Penggunaan Tagihan & Kasir
        </div>
        <div>• <span className="text-emerald-400 font-semibold">Kirim WA</span> — Menghasilkan link pembayaran online via Midtrans (QRIS / Transfer Bank / Minimarket) dan otomatis membuka WhatsApp pelanggan.</div>
        <div>• <span className="text-slate-300 font-semibold">Tunai</span> — Mencatat pembayaran tunai atau transfer manual secara langsung oleh kasir.</div>
        <div>• Status tagihan akan berubah otomatis menjadi <span className="text-emerald-400 font-semibold">Lunas</span> setelah pembayaran terkonfirmasi.</div>
      </div>

      {/* Modal Kasir Manual */}
      {showPayModal && selectedTagihan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Kasir Pembayaran Tunai</h3>
              <p className="text-xs text-slate-400">
                Pelanggan: <strong className="text-white">{selectedTagihan.pelanggan?.nama}</strong> ({selectedTagihan.pelanggan?.kode_pelanggan}) · <span className="text-emerald-400 font-bold">{formatRupiah(selectedTagihan.jumlah_tagihan)}</span>
              </p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah Bayar (Rp)</label>
                <input
                  type="number"
                  required
                  value={bayarForm.jumlah_bayar}
                  onChange={(e) => setBayarForm({ ...bayarForm, jumlah_bayar: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Metode Pembayaran</label>
                <select
                  value={bayarForm.metode_pembayaran}
                  onChange={(e) => setBayarForm({ ...bayarForm, metode_pembayaran: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan kasir..."
                  value={bayarForm.catatan}
                  onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Modal Konfirmasi Generate Tagihan Bulanan */}
      {confirmGenerateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">⚡</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Generate Tagihan Bulanan</h3>
              <p className="text-xs text-slate-400">
                Generate tagihan untuk bulan {currentMonth}/{currentYear} untuk semua pelanggan aktif?
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmGenerateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleGenerateBulanan}
                disabled={generating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                {generating ? 'Memproses...' : 'Ya, Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Konfirmasi Aksi Massal */}
      {confirmActionModal.show && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">⚠️</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">{confirmActionModal.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmActionModal.message}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmActionModal({ show: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={confirmActionModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-red-900/30"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Hasil Generate / Informasi */}
      {resultModal.show && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">✨</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Informasi</h3>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {resultModal.message}
              </p>
            </div>

            <button
              onClick={() => setResultModal({ show: false, message: '' })}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-cyan-600/25"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Kirim WA',
            icon: '📲',
            variant: 'success',
            loading: bulkLoading,
            onClick: () => setShowBulkWaModal(true),
          },
          {
            label: 'Lunas Cash',
            icon: '💵',
            variant: 'default',
            loading: bulkLoading,
            onClick: handleBulkPayCash,
          },
          {
            label: 'Hapus',
            icon: '🗑️',
            variant: 'danger',
            loading: bulkLoading,
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* Modal WA Masal */}
      {showBulkWaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Kirim WA Masal</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedIds.length} tagihan dipilih</p>
              </div>
              <button onClick={() => setShowBulkWaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <p className="text-slate-300 font-semibold mb-1">💡 Variabel yang bisa digunakan:</p>
              <p><code className="text-cyan-400">[nama]</code> — Nama pelanggan</p>
              <p><code className="text-cyan-400">[link_bayar]</code> — Link pembayaran online</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Template Pesan WA:</label>
              <textarea
                rows={5}
                value={templateWaBulk}
                onChange={e => setTemplateWaBulk(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowBulkWaModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleBulkWaSend}
                disabled={!templateWaBulk.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30"
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
                <span>Terkirim: <b className="text-emerald-400">{waProgress.terkirim}</b></span>
                <span>Gagal: <b className="text-red-400">{waProgress.gagal}</b></span>
                <span>Total: <b className="text-white">{waProgress.total}</b></span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: waProgress.total > 0 ? `${((waProgress.terkirim + waProgress.gagal) / waProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {waProgress.logs.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950/50">
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

            {(waProgress.terkirim + waProgress.gagal) < waProgress.total ? (
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