'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase otomatis parse token dari URL hash saat halaman load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setErrorMsg('Password dan konfirmasi password tidak cocok.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setErrorMsg(error.message || 'Gagal mengubah password.')
      } else {
        setSuccessMsg('Password berhasil diubah! Mengalihkan ke halaman login...')
        setTimeout(() => router.push('/login'), 2500)
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
      {/* Decorative blob */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, #0e7490 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(99, 179, 237, 0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', boxShadow: '0 8px 24px rgba(8, 145, 178, 0.3)' }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Buat Password Baru</h1>
          <p className="text-xs text-slate-400 mt-1.5">Masukkan password baru untuk akun Anda</p>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-950/40 border border-green-500/20 text-green-300 text-xs rounded-2xl flex items-start gap-2.5">
            <span className="text-base mt-0.5 shrink-0">✅</span>
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded-2xl flex items-start gap-2.5">
            <span className="text-base mt-0.5 shrink-0">⚠️</span>
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {!ready && !successMsg ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm">Memverifikasi link reset password...</p>
            <p className="text-slate-600 text-xs mt-2">Jika halaman ini tidak berubah, link mungkin sudah kedaluwarsa. Silakan minta link baru.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
            >
              ← Kembali ke Login
            </button>
          </div>
        ) : !successMsg ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
                Password Baru
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                style={{
                  background: 'rgba(2, 8, 23, 0.8)',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
                Konfirmasi Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
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
                    Menyimpan...
                  </span>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Footer */}
      <p className="mt-6 text-slate-600 text-xs text-center">
        © {new Date().getFullYear()} Beat Net Indonesia
      </p>
    </main>
  )
}
