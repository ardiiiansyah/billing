'use client';
import { useState, useEffect } from 'react';

export default function PushNotificationManager() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Periksa apakah browser sudah berlangganan push notification sebelumnya
        async function checkSubscription() {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    setIsSubscribed(true);
                }
            }
            setLoading(false);
        }
        checkSubscription();
    }, []);

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });

            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: { 'Content-Type': 'application/json' },
            });

            setIsSubscribed(true);
            alert('Notifikasi berhasil diaktifkan!');
        } catch (err) {
            console.error('Gagal mengaktifkan notifikasi:', err);
        }
    };

    // Jika sedang memuat atau jika sudah berlangganan, tombol tidak akan ditampilkan (hilang)
    if (loading || isSubscribed) {
        return null;
    }

    return (
        <button
            onClick={subscribeUser}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-95 flex items-center gap-1.5"
        >
            Aktifkan Notifikasi
        </button>
    );
}