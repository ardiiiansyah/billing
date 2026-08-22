'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createPortal } from 'react-dom'
import BulkActionBar from '@/components/BulkActionBar'
import SearchableSelect from '@/components/ui/SearchableSelect'

export default function TagihanPage() {
  const [tagihanList, setTagihanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState(null)
  const [sendingWa, setSendingWa] = useState(null)

  // State Tagihan Manual
  const [showManualModal, setShowManualModal] = useState(false)
  const [pelangganOptions, setPelangganOptions] = useState([])
  const [loadingPelanggan, setLoadingPelanggan] = useState(false)
  const [savingManual, setSavingManual] = useState(false)
  const [manualForm, setManualForm] = useState({
    pelanggan_id: '',
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    jumlah_tagihan: '',
    tanggal_jatuh_tempo: '',
  })

  // State Modal
  const [confirmGenerateModal, setConfirmGenerateModal] = useState(false)
  const [resultModal, setResultModal] = useState({ show: false, message: '' })
  const [confirmActionModal, setConfirmActionModal] = useState({ show: false, title: '', message: '', onConfirm: null })

  const [bayarForm, setBayarForm] = useState({
    jumlah_bayar: '',
    metode_pembayaran: 'cash',
    catatan: '',
  })

  // State Bulk Action
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkWaModal, setShowBulkWaModal] = useState(false)
  const [templateWaBulk, setTemplateWaBulk] = useState(
    'Halo Bapak/Ibu *[nama]*, tagihan WiFi Sultan bulan ini belum dibayar.\n\nSegera lakukan pembayaran via link berikut:\n[link_bayar]\n\nTerima kasih 🙏'
  )
  const [showWaProgress, setShowWaProgress] = useState(false)
  const [waProgress, setWaProgress] = useState({ total: 0, terkirim: 0, gagal: 0, logs: [] })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const bulanOptions = [
    { val: 1, label: 'Januari' },
    { val: 2, label: 'Februari' },
    { val: 3, label: 'Maret' },
    { val: 4, label: 'April' },
    { val: 5, label: 'Mei' },
    { val: 6, label: 'Juni' },
    { val: 7, label: 'Juli' },
    { val: 8, label: 'Agustus' },
    { val: 9, label: 'September' },
    { val: 10, label: 'Oktober' },
    { val: 11, label: 'November' },
    { val: 12, label: 'Desember' },
  ]

  const tahunOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  useEffect(() => {
    fetchTagihan()
    fetchPelangganOptions()
  }, [])

  async function fetchPelangganOptions() {
    setLoadingPelanggan(true)
    try {
      const { data, error } = await supabase
        .from('pelanggan')
        .select('id, nama, kode_pelanggan, no_wa, tanggal_jatuh_tempo, status, paket(id, nama_paket, harga)')
        .eq('status', 'aktif')
        .order('nama', { ascending: true })

      if (error) throw error
      setPelangganOptions(data || [])
      return data || []
    } catch (err) {
      console.error('DEBUG FETCH PELANGGAN ERROR:', err.message)
      return []
    } finally {
      setLoadingPelanggan(false)
    }
  }

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

  const handleOpenManualModal = async () => {
    let options = pelangganOptions
    if (!options || options.length === 0) {
      options = await fetchPelangganOptions()
    }

    const defaultDay = 10
    const defaultDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(defaultDay).padStart(2, '0')}`

    setManualForm({
      pelanggan_id: '',
      bulan: currentMonth,
      tahun: currentYear,
      jumlah_tagihan: '',
      tanggal_jatuh_tempo: defaultDateStr,
    })
    setShowManualModal(true)
  }

  const handleSelectPelanggan = (pelangganId) => {
    const selected = pelangganOptions.find((p) => p.id === pelangganId)
    if (selected) {
      const dueDay = Math.min(selected.tanggal_jatuh_tempo || 10, 28)
      const dueMonth = manualForm.bulan || currentMonth
      const dueYear = manualForm.tahun || currentYear
      const dateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

      setManualForm((prev) => ({
        ...prev,
        pelanggan_id: pelangganId,
        jumlah_tagihan: selected.paket?.harga !== undefined && selected.paket?.harga !== null ? String(selected.paket.harga) : prev.jumlah_tagihan,
        tanggal_jatuh_tempo: dateStr,
      }))
    } else {
      setManualForm((prev) => ({
        ...prev,
        pelanggan_id: pelangganId,
      }))
    }
  }

  const handlePeriodeChange = (bulan, tahun) => {
    const b = Number(bulan)
    const y = Number(tahun)
    setManualForm((prev) => {
      const selected = pelangganOptions.find((p) => p.id === prev.pelanggan_id)
      const dueDay = selected ? Math.min(selected.tanggal_jatuh_tempo || 10, 28) : 10
      const dateStr = `${y}-${String(b).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
      return {
        ...prev,
        bulan: b,
        tahun: y,
        tanggal_jatuh_tempo: dateStr,
      }
    })
  }

  const handleSaveManualTagihan = async (e) => {
    e.preventDefault()

    if (!manualForm.pelanggan_id) {
      setResultModal({ show: true, message: 'Silakan pilih pelanggan terlebih dahulu!' })
      return
    }

    const nominal = Number(manualForm.jumlah_tagihan)
    if (isNaN(nominal) || nominal <= 0) {
      setResultModal({ show: true, message: 'Nominal tagihan harus berupa angka valid lebih dari 0!' })
      return
    }

    if (!manualForm.tanggal_jatuh_tempo) {
      setResultModal({ show: true, message: 'Tanggal jatuh tempo wajib diisi!' })
      return
    }

    setSavingManual(true)

    try {
      const { data, error } = await supabase
        .from('tagihan')
        .insert([
          {
            pelanggan_id: manualForm.pelanggan_id,
            bulan: Number(manualForm.bulan),
            tahun: Number(manualForm.tahun),
            jumlah_tagihan: nominal,
            tanggal_jatuh_tempo: manualForm.tanggal_jatuh_tempo,
            status_pembayaran: 'belum_bayar',
          },
        ])
        .select('*, pelanggan(nama, kode_pelanggan)')

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          setResultModal({
            show: true,
            message: `⚠️ Tagihan untuk pelanggan ini pada periode bulan ${manualForm.bulan}/${manualForm.tahun} sudah ada di database!`
          })
        } else {
          setResultModal({
            show: true,
            message: 'Gagal menyimpan tagihan manual: ' + error.message
          })
        }
        return
      }

      const pelangganNama = data?.[0]?.pelanggan?.nama || 'Pelanggan'
      setShowManualModal(false)
      fetchTagihan()
      setResultModal({
        show: true,
        message: `✨ Berhasil menambahkan tagihan manual untuk ${pelangganNama} (Periode ${manualForm.bulan}/${manualForm.tahun}) sebesar ${formatRupiah(nominal)}.`
      })
    } catch (err) {
      console.error('DEBUG SAVE MANUAL TAGIHAN ERROR:', err)
      setResultModal({
        show: true,
        message: 'Terjadi kesalahan sistem saat menyimpan tagihan.'
      })
    } finally {
      setSavingManual(false)
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

      const linkBayar = `${window.location.origin}/bayar/${tagihan.id}`
      const pesanWA =
        `Halo Bapak/Ibu *${tagihan.pelanggan?.nama}*, ` +
        `tagihan WiFi Sultan bulan ${tagihan.bulan} ${tagihan.tahun} sebesar *Rp ${Number(tagihan.jumlah_tagihan).toLocaleString('id-ID')}* ` +
        `sudah siap dibayar.\n\n` +
        `Klik link berikut untuk bayar:\n` +
        `${linkBayar}\n\n` +
        `Terima kasih 🙏`

      const resWa = await fetch('/api/wa/kirim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomor: tagihan.pelanggan?.no_wa,
          pesan: pesanWA,
        }),
      })

      const dataWa = await resWa.json()

      if (!resWa.ok || !dataWa.sukses) {
        setResultModal({ show: true, message: 'Link pembayaran berhasil dibuat, namun gagal mengirim WA: ' + (dataWa.error || 'Unknown error') })
        return
      }

      fetchTagihan()
      setResultModal({ show: true, message: 'Link pembayaran berhasil dibuat dan pesan WA berhasil dikirim otomatis ke pelanggan!' })

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

    // 1. Catat ke tabel pembayaran
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

    // 2. Update status tagihan
    const { error: errUpdate } = await supabase
      .from('tagihan')
      .update({
        status_pembayaran: 'lunas',
        status: 'lunas'
      })
      .eq('id', selectedTagihan.id)

    if (errUpdate) {
      setResultModal({ show: true, message: 'Pembayaran tercatat, tapi gagal update status tagihan: ' + errUpdate.message })
    } else {
      // 3. Logika kirim WA otomatis
      try {
        const pesanWA =
          `Halo Bapak/Ibu *${selectedTagihan.pelanggan?.nama}*,\n\n` +
          `Pembayaran tunai sebesar *${formatRupiah(bayarForm.jumlah_bayar)}* telah kami terima. ` +
          `Status tagihan Anda kini *LUNAS*.\n\n` +
          `Terima kasih telah menggunakan layanan Sultan WiFi 🙏`

        await fetch('/api/wa/kirim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomor: selectedTagihan.pelanggan?.no_wa,
            pesan: pesanWA,
          }),
        })
      } catch (waErr) {
        console.error('Gagal kirim WA otomatis:', waErr)
      }

      setShowPayModal(false)
      fetchTagihan()
      setResultModal({ show: true, message: 'Pembayaran tunai berhasil dicatat, status Lunas, dan notifikasi WA terkirim!' })
    }
  }

  // Filter dan Pencarian Real-time Tagihan
  const filteredTagihan = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return tagihanList.filter((t) => {
      const matchSearch =
        t.pelanggan?.nama?.toLowerCase().includes(search.toLowerCase()) ||
        t.pelanggan?.kode_pelanggan?.toLowerCase().includes(search.toLowerCase()) ||
        t.pelanggan?.no_wa?.includes(search)

      let matchStatus = true
      if (filterStatus === 'expired') {
        // Tagihan lewat jatuh tempo & belum lunas
        const isPastDue = t.tanggal_jatuh_tempo && String(t.tanggal_jatuh_tempo).length >= 8
          ? t.tanggal_jatuh_tempo < today
          : Number(t.tanggal_jatuh_tempo) < new Date().getDate()
        matchStatus = t.status_pembayaran !== 'lunas' && isPastDue
      } else if (filterStatus !== 'semua') {
        matchStatus = t.status_pembayaran === filterStatus || t.status === filterStatus
      }

      return matchSearch && matchStatus
    })
  }, [tagihanList, search, filterStatus])

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const counts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      semua: tagihanList.length,
      belum_bayar: tagihanList.filter((t) => t.status_pembayaran === 'belum_bayar' || (!t.status_pembayaran && t.status === 'belum_bayar')).length,
      lunas: tagihanList.filter((t) => t.status_pembayaran === 'lunas' || t.status === 'lunas').length,
      sebagian: tagihanList.filter((t) => t.status_pembayaran === 'sebagian').length,
      expired: tagihanList.filter((t) => {
        const isPastDue = t.tanggal_jatuh_tempo && String(t.tanggal_jatuh_tempo).length >= 8
          ? t.tanggal_jatuh_tempo < today
          : Number(t.tanggal_jatuh_tempo) < new Date().getDate()
        return t.status_pembayaran !== 'lunas' && isPastDue
      }).length,
    }
  }, [tagihanList])

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
      {/* Header Halaman Glassmorphism */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Tagihan & Kasir
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Generate tagihan bulanan, kelola tagihan manual, & kirim ke WhatsApp pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleOpenManualModal}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-md shadow-cyan-600/20 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-sm leading-none">➕</span> Tagihan Manual
          </button>
          <button
            onClick={() => setConfirmGenerateModal(true)}
            disabled={generating}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-[11px] sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-sm leading-none">⚡</span> {generating ? 'Memproses...' : 'Generate Tagihan Bulanan'}
          </button>
        </div>
      </div>

      {/* Kartu Metrik / Statistik Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Tagihan', count: counts.semua, color: 'text-white', icon: '📊', bgIcon: 'bg-blue-500/10 text-blue-400', gradient: 'from-blue-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-blue-500/10 hover:border-blue-500/50' },
          { label: 'Belum Bayar', count: counts.belum_bayar, color: 'text-rose-400', icon: '⚠️', bgIcon: 'bg-rose-500/10 text-rose-400', gradient: 'from-rose-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-rose-500/10 hover:border-rose-500/50' },
          { label: 'Lunas', count: counts.lunas, color: 'text-emerald-400', icon: '✅', bgIcon: 'bg-emerald-500/10 text-emerald-400', gradient: 'from-emerald-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-emerald-500/10 hover:border-emerald-500/50' },
          { label: 'Lewat Tempo', count: counts.expired, color: 'text-amber-400', icon: '⏳', bgIcon: 'bg-amber-500/10 text-amber-400', gradient: 'from-amber-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-amber-500/10 hover:border-amber-500/50' },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-gradient-to-b ${s.gradient} border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${s.hoverShadow} cursor-pointer flex items-center justify-between`}
          >
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400">{s.label}</p>
              <p className={`text-lg sm:text-xl font-extrabold mt-1 ${s.color}`}>{s.count}</p>
            </div>
            <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm sm:text-base shadow-inner ${s.bgIcon}`}>
              {s.icon}
            </span>
          </div>
        ))}
      </div>

      {/* Baris Pencarian & Filter Status Tagihan */}
      <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl space-y-3 shadow-xl shadow-black/20">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input Search Bar Real-time */}
          <div className="flex-1 flex items-center gap-2.5 bg-slate-950 border border-slate-800 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 px-3.5 py-2.5 rounded-xl transition">
            <span className="text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Cari Nama Pelanggan, ID (WIFI-xxx), atau No WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-500 hover:text-slate-300 text-xs px-1"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tab Filter Status */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'semua', label: 'Semua' },
              { id: 'belum_bayar', label: 'Belum Bayar' },
              { id: 'lunas', label: 'Lunas' },
              { id: 'sebagian', label: 'Sebagian' },
              { id: 'expired', label: 'Lewat Tempo' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 text-center whitespace-nowrap ${filterStatus === st.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ringkasan Hasil Filter */}
        {(search || filterStatus !== 'semua') && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span>
              Menampilkan <strong>{filteredTagihan.length}</strong> dari <strong>{tagihanList.length}</strong> tagihan
              {search && <span> untuk kata kunci "<em>{search}</em>"</span>}
            </span>
            <button
              onClick={() => { setSearch(''); setFilterStatus('semua'); }}
              className="text-cyan-400 hover:underline text-[11px]"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Daftar Tagihan: Mobile Card View & Desktop Table View */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
            Memuat daftar tagihan...
          </div>
        ) : filteredTagihan.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-1.5">
              <span className="text-3xl mb-1">🧾</span>
              <span className="font-medium text-slate-400 text-xs">
                {search || filterStatus !== 'semua'
                  ? 'Tidak ada tagihan yang cocok dengan filter / pencarian.'
                  : 'Tidak ada tagihan ditemukan.'}
              </span>
              <span className="text-[11px] text-slate-600">
                {search || filterStatus !== 'semua'
                  ? 'Coba ganti kata kunci pencarian atau reset filter status.'
                  : 'Klik tombol "Generate Tagihan Bulanan" di atas untuk membuat tagihan baru.'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Tampilan Card khusus Mobile (md:hidden) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredTagihan.map((t) => {
                const namaBulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const periodeStr = `${namaBulan[t.bulan] || t.bulan} ${t.tahun}`;

                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900/90 border rounded-2xl p-4 space-y-3 transition-all ${selectedIds.includes(t.id) ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800'
                      }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => handleToggleOne(t.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                        />
                        <span className="font-mono text-cyan-400 font-bold text-xs">{t.pelanggan?.kode_pelanggan || '-'}</span>
                      </div>
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${t.status_pembayaran === 'lunas'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : t.status_pembayaran === 'sebagian'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                      >
                        {t.status_pembayaran?.replace('_', ' ') || 'belum bayar'}
                      </span>
                    </div>

                    <div>
                      <div className="text-white font-bold text-sm">{t.pelanggan?.nama || 'Pelanggan Dihapus'}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        📱 {t.pelanggan?.no_wa || '-'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">PERIODE & TEMPO</span>
                        <span className="font-medium text-slate-200">{periodeStr}</span>
                        <div className="text-slate-400 text-[11px]">Jatuh Tempo: {t.tanggal_jatuh_tempo}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">NOMINAL TAGIHAN</span>
                        <div className="text-emerald-400 font-extrabold text-sm">{formatRupiah(t.jumlah_tagihan)}</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                      {t.status_pembayaran !== 'lunas' ? (
                        <>
                          <button
                            onClick={() => handleKirimMidtrans(t)}
                            disabled={sendingWa === t.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <span>💬</span> {sendingWa === t.id ? 'Proses...' : 'Kirim WA'}
                          </button>
                          <button
                            onClick={() => handleOpenPayModal(t)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1"
                          >
                            <span>💵</span> Tunai
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 py-1">
                          ✓ Lunas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Tabel khusus Desktop (hidden md:block) */}
            <div className="hidden md:block bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-800/80">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5 w-10 align-middle text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleAll}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                        />
                      </th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold">Pelanggan</th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold">Periode</th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold">Nominal</th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold">Jatuh Tempo</th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold">Status</th>
                      <th className="px-4 sm:px-6 py-3.5 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTagihan.map((t) => (
                      <tr key={t.id} className={`hover:bg-slate-800/40 transition-colors duration-150 ${selectedIds.includes(t.id) ? 'bg-cyan-950/25' : ''}`}>
                        <td className="px-4 sm:px-6 py-4 align-middle text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => handleToggleOne(t.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer accent-cyan-500"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 align-middle">
                          <div className="font-bold text-white text-xs sm:text-sm">{t.pelanggan?.nama || 'Pelanggan Dihapus'}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {t.pelanggan?.kode_pelanggan} · 📱 {t.pelanggan?.no_wa || '-'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-slate-200 font-medium align-middle text-xs">
                          {(() => {
                            const namaBulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                            return `${namaBulan[t.bulan] || t.bulan} ${t.tahun}`;
                          })()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 font-bold text-emerald-400 align-middle text-xs">{formatRupiah(t.jumlah_tagihan)}</td>
                        <td className="px-4 sm:px-6 py-4 text-slate-300 font-medium align-middle text-xs">{t.tanggal_jatuh_tempo}</td>
                        <td className="px-4 sm:px-6 py-4 align-middle">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${t.status_pembayaran === 'lunas'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : t.status_pembayaran === 'sebagian'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                          >
                            {t.status_pembayaran?.replace('_', ' ') || 'belum bayar'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right align-middle">
                          {t.status_pembayaran !== 'lunas' ? (
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleKirimMidtrans(t)}
                                disabled={sendingWa === t.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-xl transition shadow-md shadow-emerald-950/25 flex items-center gap-1 disabled:opacity-50"
                              >
                                {sendingWa === t.id ? '⏳...' : '💬 WA'}
                              </button>
                              <button
                                onClick={() => handleOpenPayModal(t)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl transition border border-slate-700 flex items-center gap-1"
                              >
                                💵 Tunai
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                              ✓ Lunas
                            </span>
                          )}
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

      {/* Kotak Panduan Penggunaan */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5 shadow-xl shadow-black/20">
        <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
          <span>ℹ️</span> Panduan Penggunaan Tagihan & Kasir
        </div>
        <div>• <span className="text-cyan-400 font-semibold">+ Tagihan Manual</span> — Membuat tagihan kustom untuk pelanggan tertentu dengan pencarian autocomplete (pemasangan baru, ganti perangkat, atau susulan).</div>
        <div>• <span className="text-emerald-400 font-semibold">Generate Bulanan</span> — Menghasilkan tagihan rutin otomatis untuk seluruh pelanggan aktif pada bulan berjalan.</div>
        <div>• <span className="text-emerald-400 font-semibold">Kirim WA</span> — Menghasilkan link pembayaran online via Midtrans (QRIS / Transfer Bank / Minimarket) dan otomatis membuka WhatsApp pelanggan.</div>
        <div>• <span className="text-slate-300 font-semibold">Tunai</span> — Mencatat pembayaran tunai atau transfer manual secara langsung oleh kasir.</div>
        <div>• Status tagihan akan berubah otomatis menjadi <span className="text-emerald-400 font-semibold">Lunas</span> setelah pembayaran terkonfirmasi.</div>
      </div>

      {/* Modal Form Tagihan Manual dengan SearchableSelect */}
      {showManualModal && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999] animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-lg">
                  ➕
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Tambah Tagihan Manual</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Buat tagihan khusus, pemasangan baru, atau susulan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-white transition p-1 text-base leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualTagihan} className="space-y-3.5">
              {/* Autocomplete / Searchable Combobox Pelanggan */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Pilih Pelanggan Aktif <span className="text-rose-400">*</span>
                </label>
                {loadingPelanggan ? (
                  <div className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs">
                    Memuat daftar pelanggan aktif...
                  </div>
                ) : (
                  <SearchableSelect
                    options={pelangganOptions}
                    value={manualForm.pelanggan_id}
                    onChange={(selectedId) => handleSelectPelanggan(selectedId)}
                    placeholder="Ketik & pilih pelanggan (ID / Nama / WA)..."
                  />
                )}
              </div>

              {/* Periode Bulan & Tahun */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Periode Bulan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={manualForm.bulan}
                    onChange={(e) => handlePeriodeChange(e.target.value, manualForm.tahun)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer font-medium"
                  >
                    {bulanOptions.map((b) => (
                      <option key={b.val} value={b.val}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Periode Tahun <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={manualForm.tahun}
                    onChange={(e) => handlePeriodeChange(manualForm.bulan, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer font-medium"
                  >
                    {tahunOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nominal Tagihan */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nominal Tagihan (Rp) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Contoh: 150000"
                  value={manualForm.jumlah_tagihan}
                  onChange={(e) => setManualForm({ ...manualForm, jumlah_tagihan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-bold text-xs"
                />
              </div>

              {/* Tanggal Jatuh Tempo */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Tanggal Jatuh Tempo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={manualForm.tanggal_jatuh_tempo}
                  onChange={(e) => setManualForm({ ...manualForm, tanggal_jatuh_tempo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>

              {/* Tombol Aksi Simpan & Batal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  disabled={savingManual}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl transition text-xs shadow-md shadow-cyan-600/25"
                >
                  {savingManual ? 'Menyimpan...' : 'Simpan Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Kasir Manual */}
      {showPayModal && selectedTagihan && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 text-xs">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Kasir Pembayaran Tunai</h3>
              <p className="text-slate-400">
                Pelanggan: <strong className="text-white">{selectedTagihan.pelanggan?.nama}</strong> ({selectedTagihan.pelanggan?.kode_pelanggan}) · <span className="text-emerald-400 font-bold">{formatRupiah(selectedTagihan.jumlah_tagihan)}</span>
              </p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Jumlah Bayar (Rp)</label>
                <input
                  type="number"
                  required
                  value={bayarForm.jumlah_bayar}
                  onChange={(e) => setBayarForm({ ...bayarForm, jumlah_bayar: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Metode Pembayaran</label>
                <select
                  value={bayarForm.metode_pembayaran}
                  onChange={(e) => setBayarForm({ ...bayarForm, metode_pembayaran: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan kasir..."
                  value={bayarForm.catatan}
                  onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/30"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Konfirmasi Generate Tagihan */}
      {confirmGenerateModal && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-xs text-center">
            <span className="text-4xl block">⚡</span>
            <div>
              <h3 className="text-base font-bold text-white">Generate Tagihan Bulanan?</h3>
              <p className="text-slate-400 mt-1">
                Sistem akan membuat tagihan untuk semua pelanggan berstatus <strong>Aktif</strong> pada bulan {bulanOptions.find(b => b.val === currentMonth)?.label} {currentYear}.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmGenerateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleGenerateBulanan}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                Ya, Generate Sekarang
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Result Notification */}
      {resultModal.show && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-xs text-center">
            <span className="text-3xl block">🔔</span>
            <p className="text-slate-200 font-medium whitespace-pre-line leading-relaxed">
              {resultModal.message}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setResultModal({ show: false, message: '' })}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition border border-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Konfirmasi Tindakan Massal (Bulk Action) */}
      {confirmActionModal.show && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-xs text-center">
            <span className="text-3xl block">⚠️</span>
            <div>
              <h3 className="text-base font-bold text-white">{confirmActionModal.title}</h3>
              <p className="text-slate-400 mt-1">{confirmActionModal.message}</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmActionModal({ show: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={confirmActionModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Template Broadcast WA Masal Tagihan */}
      {showBulkWaModal && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Broadcast WA Tagihan ({selectedIds.length} Pelanggan)</h3>
              <button onClick={() => setShowBulkWaModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              <label className="block text-slate-400 font-medium">Format Pesan WhatsApp:</label>
              <textarea
                rows={5}
                value={templateWaBulk}
                onChange={(e) => setTemplateWaBulk(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Gunakan variabel <code>[nama]</code> dan <code>[link_bayar]</code> untuk menyisipkan data pelanggan.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBulkWaModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleBulkWaSend}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-md shadow-emerald-900/30"
              >
                Kirim Pesan Sekarang
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Progress Broadcast WA */}
      {showWaProgress && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Proses Pengiriman WA Massal</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progress: {waProgress.terkirim + waProgress.gagal} / {waProgress.total}</span>
                <span className="text-emerald-400">Sukses: {waProgress.terkirim}</span>
                <span className="text-rose-400">Gagal: {waProgress.gagal}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${waProgress.total > 0 ? ((waProgress.terkirim + waProgress.gagal) / waProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1">
              {waProgress.logs?.map((log, idx) => (
                <div key={idx} className={log.sukses ? 'text-emerald-400' : 'text-rose-400'}>
                  {log.pesan || `${log.nama}: ${log.sukses ? 'Terkirim' : 'Gagal'}`}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowWaProgress(false)}
                disabled={waProgress.terkirim + waProgress.gagal < waProgress.total}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Bayar Tunai',
            icon: '💵',
            variant: 'success',
            loading: bulkLoading,
            onClick: handleBulkPayCash,
          },
          {
            label: 'Broadcast WA',
            icon: '📲',
            variant: 'default',
            loading: bulkLoading,
            onClick: () => setShowBulkWaModal(true),
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
    </div>
  )
}