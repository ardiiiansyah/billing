'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const LAST_ACTIVE_KEY = 'sultan_last_active_time'

export default function AutoLogout({ timeoutMinutes = 5 }) {
    const router = useRouter()
    const isLoggingOutRef = useRef(false)
    const timeoutMs = timeoutMinutes * 60 * 1000

    const performLogout = useCallback(async (reason = 'Sesi Anda telah berakhir karena tidak aktif selama 5 menit.') => {
        if (isLoggingOutRef.current) return
        isLoggingOutRef.current = true

        try {
            await supabase.auth.signOut()
        } catch (e) {
            console.error('Logout error:', e)
        } finally {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(LAST_ACTIVE_KEY)
            }
            router.push(`/login?message=${encodeURIComponent(reason)}`)
        }
    }, [router])

    const updateLastActive = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
        }
    }, [])

    const checkInactivity = useCallback(() => {
        if (typeof window === 'undefined') return
        const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY)
        if (!lastActiveStr) {
            updateLastActive()
            return
        }

        const lastActive = parseInt(lastActiveStr, 10)
        const now = Date.now()
        if (now - lastActive >= timeoutMs) {
            performLogout()
        }
    }, [timeoutMs, performLogout, updateLastActive])

    useEffect(() => {
        // Cek langsung saat komponen dipasang
        checkInactivity()
        updateLastActive()

        // 1. Interval berkala untuk mengecek waktu inaktivitas saat aplikasi terbuka
        const intervalId = setInterval(() => {
            checkInactivity()
        }, 10000) // cek setiap 10 detik

        // 2. Listener interaksi pengguna untuk memperbarui timestamp aktivitas (di-throttle)
        let lastTouchTime = 0
        const handleUserActivity = () => {
            const now = Date.now()
            if (now - lastTouchTime > 3000) { // throttle 3 detik
                lastTouchTime = now
                updateLastActive()
            }
        }

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
        activityEvents.forEach((ev) => {
            window.addEventListener(ev, handleUserActivity, { passive: true })
        })

        // 3. Khusus Mobile & Desktop: saat aplikasi diminimalkan / layar terkunci / beralih tab
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Simpan timestamp saat user meninggalkan aplikasi
                updateLastActive()
            } else {
                // Saat user kembali membuka aplikasi
                checkInactivity()
                updateLastActive()
            }
        }

        const handlePageShow = () => {
            checkInactivity()
            updateLastActive()
        }

        const handlePageHide = () => {
            updateLastActive()
        }

        const handleFocus = () => {
            checkInactivity()
            updateLastActive()
        }

        const handleBlur = () => {
            updateLastActive()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('pageshow', handlePageShow)
        window.addEventListener('pagehide', handlePageHide)
        window.addEventListener('focus', handleFocus)
        window.addEventListener('blur', handleBlur)

        return () => {
            clearInterval(intervalId)
            activityEvents.forEach((ev) => {
                window.removeEventListener(ev, handleUserActivity)
            })
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('pageshow', handlePageShow)
            window.removeEventListener('pagehide', handlePageHide)
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('blur', handleBlur)
        }
    }, [checkInactivity, updateLastActive])

    return null
}