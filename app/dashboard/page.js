'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
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

      // Stats
      const totalUnpaid = tagihanUnpaid?.reduce((a, b) => a + Number(b.jumlah_tagihan), 0) || 0
      const totalPaid = pembayaranBulanIni?.reduce((a, b) => a + Number(b.jumlah_bayar), 0) || 0

      setStats({
        totalPelanggan: totalPelanggan || 0,
        pelangganAktif: pelangganAktif || 0,
        tagihanBelumBayar: totalUnpaid,
        pendapatanBulanIni: totalPaid,
        isolir: isolir || 0,
      })

      // Grafik 6 bulan
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

      // Distribusi paket
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
      belum_bayar: 'bg-amber-900/60 text-amber-400 border border-amber-800',
      lunas: 'bg-emerald-900/60 text-emerald-400 border border-emerald-800',
      sebagian: 'bg-blue-900/60 text-blue-400 border border-blue-800',
      dibatalkan: 'bg-red-900/60 text-red-400 border border-red-800',
    }
    return map[status] || 'bg-slate-700 text-slate-300'
  }

  const statCards = [
    { label: 'Total Pelanggan', value: stats.totalPelanggan, icon: '👥', color: 'text-white', bg: 'bg-blue-950/60 text-blue-400' },
    { label: 'Pelanggan Aktif', value: stats.pelangganAktif, icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-950/60 text-emerald-400' },
    { label: 'Tagihan Belum Bayar', value: formatRupiah(stats.tagihanBelumBayar), icon: '⚠️', color: 'text-amber-400', bg: 'bg-amber-950/60 text-amber-400' },
    { label: 'Pendapatan Bulan Ini', value: formatRupiah(stats.pendapatanBulanIni), icon: '💰', color: 'text-emerald-400', bg: 'bg-emerald-950/60 text-emerald-400' },
    { label: 'Isolir', value: stats.isolir, icon: '🔴', color: 'text-red-400', bg: 'bg-red-950/60 text-red-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Selamat datang! Berikut ringkasan sistem hari ini.</p>
        </div>
        <Link href="/dashboard/tagihan" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition">
          + Tagihan Baru
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-slate-400">{s.label}</span>
              <span className={`p-1.5 rounded-lg text-sm ${s.bg}`}>{s.icon}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{loading ? '...' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Grafik & Distribusi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Pendapatan 6 Bulan Terakhir</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-500">Memuat...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={grafikData}>
                <XAxis dataKey="bulan" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}rb`} />
                <Tooltip formatter={v => formatRupiah(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">🥧 Distribusi Paket</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-500">Memuat...</div>
          ) : distribusiPaket.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500">Belum ada data paket</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distribusiPaket} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {distribusiPaket.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabel Tagihan & Pelanggan Baru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300">🧾 Tagihan Terbaru</h3>
            <Link href="/dashboard/tagihan" className="text-xs text-cyan-400 hover:underline">Lihat Semua</Link>
          </div>
          <table className="w-full text-xs text-slate-300">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="text-left px-5 py-2">Pelanggan</th>
                <th className="text-left px-5 py-2">Nominal</th>
                <th className="text-left px-5 py-2">Status</th>
                <th className="text-left px-5 py-2">Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">Memuat...</td></tr>
              ) : tagihanTerbaru.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">Belum ada tagihan</td></tr>
              ) : tagihanTerbaru.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/50">
                  <td className="px-5 py-3">{t.pelanggan?.nama || '-'}</td>
                  <td className="px-5 py-3 text-emerald-400">{formatRupiah(t.jumlah_tagihan)}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(t.status_pembayaran)}`}>{t.status_pembayaran}</span></td>
                  <td className="px-5 py-3">{new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300">👥 Pelanggan Baru</h3>
            <Link href="/dashboard/pelanggan" className="text-xs text-cyan-400 hover:underline">Lihat Semua</Link>
          </div>
          <table className="w-full text-xs text-slate-300">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="text-left px-5 py-2">Nama</th>
                <th className="text-left px-5 py-2">Paket</th>
                <th className="text-left px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-6 text-slate-500">Memuat...</td></tr>
              ) : pelangganBaru.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-6 text-slate-500">Belum ada pelanggan</td></tr>
              ) : pelangganBaru.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-white">{p.nama}</div>
                    <div className="text-slate-500">{p.kode_pelanggan}</div>
                  </td>
                  <td className="px-5 py-3">{p.paket?.nama_paket || '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'aktif' ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-800' : 'bg-red-900/60 text-red-400 border border-red-800'}`}>
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
  )
}