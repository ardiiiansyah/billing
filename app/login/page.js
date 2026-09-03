'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [isForgotMode, setIsForgotMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const msg = params.get('message')
      if (msg) {
        setInfoMsg(msg)
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg(error.message || 'Login gagal. Periksa email & password Anda.')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      })

      if (error) {
        setErrorMsg(error.message || 'Gagal mengirim email reset password.')
      } else {
        setInfoMsg(`Link reset password telah dikirim ke ${email}. Silakan cek inbox atau folder spam Anda.`)
        setIsForgotMode(false)
        setEmail('')
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at top, #0c1a2e 0%, #0f172a 50%, #020817 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #0e7490 0%, transparent 70%)' }}
      />

      {/* Card: max-w-sm untuk mobile, max-w-4xl & flex-row khusus desktop (md) */}
      <div
        className="w-full max-w-sm md:max-w-4xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(99, 179, 237, 0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Kolom Kiri: Form Login (Lebar penuh di mobile, 50% di desktop) */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex justify-center w-full mb-5">
              <img
                src="/logo-login.png"
                alt="Beat Net Indonesia"
                className="w-44 h-auto object-contain block drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Beat Net Indonesia</h1>
            <p className="text-xs text-slate-400 mt-1.5 tracking-wider uppercase">Portal Admin & Pengelola</p>

            {/* Divider */}
            <div className="mt-5 w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs">masuk ke akun</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </div>

          {/* Info Message */}
          {infoMsg && (
            <div className="mb-5 p-3.5 bg-amber-950/40 border border-amber-500/20 text-amber-300 text-xs rounded-2xl flex items-start gap-2.5">
              <span className="text-base mt-0.5 shrink-0">⏱️</span>
              <span className="leading-relaxed">{infoMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded-2xl flex items-start gap-2.5">
              <span className="text-base mt-0.5 shrink-0">⚠️</span>
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          {isForgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
                  Email Admin
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sultanwifi.id"
                  className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  style={{
                    background: 'rgba(2, 8, 23, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 text-white font-semibold rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? 'rgba(8, 145, 178, 0.5)'
                      : 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(8, 145, 178, 0.3)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Mengirim...
                    </span>
                  ) : (
                    'Kirim Link Reset Password'
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setIsForgotMode(false); setErrorMsg(''); setEmail('') }}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors duration-200"
                >
                  ← Kembali ke Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sultanwifi.id"
                  className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  style={{
                    background: 'rgba(2, 8, 23, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  style={{
                    background: 'rgba(2, 8, 23, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 text-white font-semibold rounded-xl text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? 'rgba(8, 145, 178, 0.5)'
                      : 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(8, 145, 178, 0.3)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    'Masuk ke Dashboard'
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setIsForgotMode(true); setErrorMsg(''); setPassword('') }}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors duration-200"
                >
                  Lupa password?
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Kolom Kanan: Panel Tambahan Khusus Desktop (Hidden di HP, Tampil di md+) */}
        <div
          className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
            borderLeft: '1px solid rgba(99, 179, 237, 0.1)'
          }}
        >
          {/* Efek dekorasi cahaya */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-bold tracking-wide">Selamat Datang Kembali!</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              Kelola pelanggan, pantau status jaringan, dan operasikan sistem WiFi rumahan Anda dengan lebih cepat dan terpusat.
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Sistem Portal Aktif
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="mt-6 text-slate-600 text-xs text-center">
        © {new Date().getFullYear()} Beat Net Indonesia
      </p>
    </main>
  )
}