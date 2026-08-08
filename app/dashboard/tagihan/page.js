'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TagihanPage() {
  const [tagihanList, setTagihanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterStatus, setFilterStatus] = useState('semua')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState(null)

  const [bayarForm, setBayarForm] = useState({
    jumlah_bayar: '',
    metode_pembayaran: 'cash',
    catatan: '',
  })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchTagihan()
  }, [])

  async function fetchTagihan() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tagihan')
      .select('*, pelanggan(nama, kode_pelanggan, no_wa)')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching tagihan:', error)
    else setTagihanList(data || [])
    setLoading(false)
  }

  const handleGenerateBulanan = async () => {
    if (!confirm(`Generate tagihan untuk bulan ${currentMonth}/${currentYear} untuk semua pelanggan aktif?`)) return
    setGenerating(true)

    try {
      const { data, error } = await supabase.rpc('generate_tagihan_bulanan', {
        p_bulan: currentMonth,
        p_tahun: currentYear,
      })

      if (error) {
        alert('Gagal generate tagihan: ' + error.message)
      } else {
        alert(`Berhasil generate tagihan untuk ${data || 0} pelanggan!`)
        fetchTagihan()
      }
    } catch (err) {
      alert('Error koneksi.')
    } finally {
      setGenerating(false)
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

    const { error } = await supabase.from('pembayaran').insert([
      {
        tagihan_id: selectedTagihan.id,
        jumlah_bayar: bayarForm.jumlah_bayar,
        metode_pembayaran: bayarForm.metode_pembayaran,
        catatan: bayarForm.catatan,
        diterima_oleh: 'Admin Kasir',
      },
    ])

    if (error) {
      alert('Gagal mencatat pembayaran: ' + error.message)
    } else {
      setShowPayModal(false)
      fetchTagihan()
    }
  }

  const filteredTagihan = tagihanList.filter((t) => {
    if (filterStatus === 'semua') return true
    return t.status_pembayaran === filterStatus
  })

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tagihan & Kasir Pembayaran</h1>
          <p className="text-slate-400 text-sm mt-1">Generate tagihan bulanan & catat pembayaran warga.</p>
        </div>
        <button
          onClick={handleGenerateBulanan}
          disabled={generating}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 w-fit disabled:opacity-50"
        >
          <span>⚡</span> {generating ? 'Memproses...' : `Generate Tagihan (${currentMonth}/${currentYear})`}
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['semua', 'belum_bayar', 'lunas', 'sebagian'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              filterStatus === st
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
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
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Jatuh Tempo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat daftar tagihan...</td>
                </tr>
              ) : filteredTagihan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Tidak ada tagihan ditemukan.</td>
                </tr>
              ) : (
                filteredTagihan.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{t.pelanggan?.nama || 'Pelanggan Dihapus'}</div>
                      <div className="text-xs text-slate-500 font-mono">{t.pelanggan?.kode_pelanggan} ({t.pelanggan?.no_wa})</div>
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">Bulan {t.bulan}/{t.tahun}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">{formatRupiah(t.jumlah_tagihan)}</td>
                    <td className="px-6 py-4 text-slate-400">{t.tanggal_jatuh_tempo}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          t.status_pembayaran === 'lunas'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : t.status_pembayaran === 'sebagian'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-red-950/80 text-red-400 border border-red-800'
                        }`}
                      >
                        {t.status_pembayaran.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.status_pembayaran !== 'lunas' ? (
                        <button
                          onClick={() => handleOpenPayModal(t)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-emerald-900/20"
                        >
                          💵 Catat Bayar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">✓ Terbayar</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kasir Pembayaran */}
      {showPayModal && selectedTagihan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Kasir Pembayaran Tagihan</h3>
            <p className="text-xs text-slate-400 mb-6">
              Pelanggan: <strong className="text-white">{selectedTagihan.pelanggan?.nama}</strong> ({selectedTagihan.pelanggan?.kode_pelanggan})
            </p>

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

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
