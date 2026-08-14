'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPelanggan: 0,
    pelangganAktif: 0,
    tagihanBelumBayar: 0,
    pendapatanBulanIni: 0,
    isolir: 0,
  })
  const [grafikData, setGrafikData] = useState([])
  const [distribusiPaket, setDistribusiPaket] = useState([])
  const [tagihanTerbaru, setTagihanTerbaru] = useState([])
  const [pelangganBaru, setPelangganBaru] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const now = new Date()
      const bulanIni = now.getMonth() + 1
      const tahunIni = now.getFullYear()

      const [
        { count: totalPelanggan },
        { count: pelangganAktif },
        { count: isolir },
        { data: tagihanUnpaid },
        { data: pembayaranBulanIni },
        { data: pembayaran6Bulan },
        { data: pelangganDenganPaket },
        { data: tagihan5Terbaru },
        { data: pelanggan5Baru },
      ] = await Promise.all([
        supabase.from('pelanggan').select('*', { count: 'exact', head: true }),
        supabase.from('pelanggan').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
        supabase.from('pelanggan').select('*', { count: 'exact', head: true }).eq('status', 'isolir'),
        supabase.from('tagihan').select('jumlah_tagihan').eq('status_pembayaran', 'belum_bayar'),
        supabase.from('pembayaran').select('jumlah_bayar').gte('tanggal_bayar', `${tahunIni}-${String(bulanIni).padStart(2, '0')}-01`),
        supabase.from('pembayaran').select('jumlah_bayar, tanggal_bayar').gte('tanggal_bayar', new Date(tahunIni, bulanIni - 7, 1).toISOString()),
        supabase.from('pelanggan').select('paket(nama_paket)').eq('status', 'aktif'),
        supabase.from('tagihan').select('*, pelanggan(nama)').order('created_at', { ascending: false }).limit(5),
        supabase.from('pelanggan').select('*, paket(nama_paket)').order('created_at', { ascending: false }).limit(5),
      ])

      const totalUnpaid = tagihanUnpaid?.reduce((a, b) => a + Number(b.jumlah_tagihan), 0) || 0
      const totalPaid = pembayaranBulanIni?.reduce((a, b) => a + Number(b.jumlah_bayar), 0) || 0

      setStats({
        totalPelanggan: totalPelanggan || 0,
        pelangganAktif: pelangganAktif || 0,
        tagihanBelumBayar: totalUnpaid,
        pendapatanBulanIni: totalPaid,
        isolir: isolir || 0,
      })

      const grafik = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(tahunIni, bulanIni - 1 - i, 1)
        const bln = d.getMonth() + 1
        const thn = d.getFullYear()
        const total = pembayaran6Bulan?.filter(p => {
          const pd = new Date(p.tanggal_bayar)
          return pd.getMonth() + 1 === bln && pd.getFullYear() === thn
        }).reduce((a, b) => a + Number(b.jumlah_bayar), 0) || 0
        grafik.push({ bulan: BULAN[bln - 1], total })
      }
      setGrafikData(grafik)

      const paketCount = {}
      pelangganDenganPaket?.forEach(p => {
        const nama = p.paket?.nama_paket || 'Tidak ada paket'
        paketCount[nama] = (paketCount[nama] || 0) + 1
      })
      setDistribusiPaket(Object.entries(paketCount).map(([name, value]) => ({ name, value })))

      setTagihanTerbaru(tagihan5Terbaru || [])
      setPelangganBaru(pelanggan5Baru || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

  const statusBadge = (status) => {
    const map = {
      belum_bayar: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      lunas: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
      sebagian: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
      dibatalkan: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    }
    return map[status] || 'bg-slate-800 text-slate-400 border border-slate-700'
  }

  const statCards = [
    {
      label: 'Total Pelanggan',
      value: stats.totalPelanggan,
      icon: '👥',
      valueColor: 'text-white',
      bgIcon: 'bg-blue-500/10 text-blue-400',
      glow: 'hover:shadow-blue-500/20 hover:border-blue-500/40',
      gradient: 'from-blue-950/20 to-slate-900/90'
    },
    {
      label: 'Pelanggan Aktif',
      value: stats.pelangganAktif,
      icon: '✅',
      valueColor: 'text-emerald-400',
      bgIcon: 'bg-emerald-500/10 text-emerald-400',
      glow: 'hover:shadow-emerald-500/20 hover:border-emerald-500/40',
      gradient: 'from-emerald-950/20 to-slate-900/90'
    },
    {
      label: 'Tagihan Belum Bayar',
      value: formatRupiah(stats.tagihanBelumBayar),
      icon: '⚠️',
      valueColor: 'text-amber-400',
      bgIcon: 'bg-amber-500/10 text-amber-400',
      glow: 'hover:shadow-amber-500/20 hover:border-amber-500/40',
      gradient: 'from-amber-950/20 to-slate-900/90'
    },
    {
      label: 'Pendapatan Bulan Ini',
      value: formatRupiah(stats.pendapatanBulanIni),
      icon: '💰',
      valueColor: 'text-cyan-400',
      bgIcon: 'bg-cyan-500/10 text-cyan-400',
      glow: 'hover:shadow-cyan-500/20 hover:border-cyan-500/40',
      gradient: 'from-cyan-950/20 to-slate-900/90'
    },
    {
      label: 'Isolir',
      value: stats.isolir,
      icon: '🔴',
      valueColor: 'text-rose-400',
      bgIcon: 'bg-rose-500/10 text-rose-400',
      glow: 'hover:shadow-rose-500/20 hover:border-rose-500/40',
      gradient: 'from-rose-950/20 to-slate-900/90'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header Dashboard Modern */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Live System
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center gap-1.5">
            <span>👋</span> Selamat datang kembali! Berikut ringkasan performa usaha WiFi kamu hari ini.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
          {/* Badge Tanggal Hari Ini */}
          <div className="flex flex-col items-start sm:items-end text-xs text-slate-400 font-medium px-3.5 py-1.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Hari Ini</span>
            <span className="text-slate-200 font-bold text-xs">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <Link
            href="/dashboard/tagihan"
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/25 active:scale-95 flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Tagihan Baru
          </Link>
        </div>
      </div>

      {/* Stat Cards 3D */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`
              bg-gradient-to-b ${s.gradient} 
              border border-slate-800/80 
              rounded-2xl p-4 
              shadow-lg shadow-black/40 
              transition-all duration-300 ease-out 
              hover:-translate-y-1 hover:shadow-2xl ${s.glow}
              cursor-pointer
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-slate-400">{s.label}</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold shadow-inner ${s.bgIcon}`}>
                {s.icon}
              </span>
            </div>
            <p className={`text-xl font-extrabold tracking-tight ${s.valueColor}`}>
              {loading ? '...' : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Grafik & Distribusi Paket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Pendapatan */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>📈</span> Pendapatan 6 Bulan Terakhir
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Tren Pembayaran</span>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center text-slate-500 text-xs">Memuat data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={grafikData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="bulan" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}rb`} />
                <Tooltip
                  formatter={v => [formatRupiah(v), 'Total']}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribusi Paket */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>🥧</span> Distribusi Paket
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Pelanggan Aktif</span>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center text-slate-500 text-xs">Memuat data...</div>
          ) : distribusiPaket.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
              <span className="text-xl">📦</span>
              <span>Belum ada data paket</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={distribusiPaket}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {distribusiPaket.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={4} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabel Tagihan & Pelanggan Baru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tagihan Terbaru */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>🧾</span> Tagihan Terbaru
            </h3>
            <Link href="/dashboard/tagihan" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition">
              Lihat Semua →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="text-slate-400 bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-800/60">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold">Pelanggan</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Nominal</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Jatuh Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-500">Memuat data...</td></tr>
                ) : tagihanTerbaru.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      <div className="flex flex-col items-center gap-1">
                        <span>📝</span>
                        <span>Belum ada tagihan</span>
                      </div>
                    </td>
                  </tr>
                ) : tagihanTerbaru.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                    <td className="px-5 py-3 font-medium text-white">{t.pelanggan?.nama || '-'}</td>
                    <td className="px-5 py-3 text-emerald-400 font-semibold">{formatRupiah(t.jumlah_tagihan)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${statusBadge(t.status_pembayaran)}`}>
                        {t.status_pembayaran?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pelanggan Baru */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>👥</span> Pelanggan Baru
            </h3>
            <Link href="/dashboard/pelanggan" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition">
              Lihat Semua →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="text-slate-400 bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-800/60">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold">Nama</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Paket</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={3} className="text-center py-8 text-slate-500">Memuat data...</td></tr>
                ) : pelangganBaru.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-500">
                      <div className="flex flex-col items-center gap-1">
                        <span>👤</span>
                        <span>Belum ada pelanggan</span>
                      </div>
                    </td>
                  </tr>
                ) : pelangganBaru.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">{p.nama}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.kode_pelanggan}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-300 font-medium">{p.paket?.nama_paket || '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${p.status === 'aktif'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}