'use client' // Wajib menggunakan client component untuk error boundary

import { useEffect } from 'react'

export default function DashboardError({ error, reset }) {
    useEffect(() => {
        // Log error secara aman di console server/browser untuk debugging developer
        console.error('Terjadi kesalahan sistem:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-4">
                <div className="text-4xl">🛡️</div>
                <h2 className="text-lg font-bold text-white">Sistem Mengamankan Sesi Ini</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                    Terjadi kendala saat memuat data atau server sedang sibuk. Demi keamanan, detail error disembunyikan. Silakan coba muat ulang halaman.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-600/25"
                    >
                        Coba Muat Ulang
                    </button>
                </div>
            </div>
        </div>
    )
}