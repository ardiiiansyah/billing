'use client';
import { useState } from 'react';

export default function PushNotificationManager() {
    const [isSubscribed, setIsSubscribed] = useState(false);

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

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
    };

    return (
        <button onClick={subscribeUser} className="bg-blue-600 text-white px-4 py-2 rounded">
            {isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
        </button>
    );
}