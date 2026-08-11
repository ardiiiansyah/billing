'use client'

import { useState, useEffect } from 'react'

export default function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Cek apakah perangkat iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setIsIOS(true)
        }

        // Cek jika sudah di-install sebagai PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        const handleBeforeInstall = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }, [])

    const handleInstallClick = async () => {
        if (isIOS) {
            alert('Untuk iPhone/iPad:\n1. Klik tombol Share (ikon panah ke atas) di Safari/Chrome\n2. Pilih "Add to Home Screen" / "Tambah ke Utama"')
            return
        }

        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setDeferredPrompt(null)
                setIsInstalled(true)
            }
        } else {
            alert('Untuk memasang aplikasi:\nTekan Menu (titik 3) di browser kamu -> Pilih "Instal aplikasi" / "Tambahkan ke Layar Utama"')
        }
    }

    // Jika sudah dijalankan sebagai PWA, sembunyikan tombol
    if (isInstalled) return null

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-5 right-5 z-50 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm transition transform hover:scale-105 border border-cyan-300"
        >
            <span>📲</span> Install Aplikasi
        </button>
    )
}