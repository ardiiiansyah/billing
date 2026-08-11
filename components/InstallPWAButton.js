'use client'

import { useState, useEffect } from 'react'

export default function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showInstallBtn, setShowInstallBtn] = useState(false)

    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowInstallBtn(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setShowInstallBtn(false)
        }
    }

    if (!showInstallBtn) return null

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-5 right-5 z-50 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm transition animate-bounce"
        >
            <span>📲</span> Install Aplikasi Sultan WiFi
        </button>
    )
}