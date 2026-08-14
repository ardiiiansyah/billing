'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button' // atau Relative path: '../components/ui/button'
import { Download } from 'lucide-react'

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
        <Button
            onClick={handleInstallClick}
            variant="outline"
            className="w-full justify-start text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all"
        >
            <Download className="mr-2 h-4 w-4" />
            Install Aplikasi
        </Button>
    )
}