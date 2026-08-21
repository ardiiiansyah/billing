'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function BulkActionBar({ selectedCount, onClear, actions = [] }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || selectedCount === 0) return null

    const getVariantStyle = (variant) => {
        switch (variant) {
            case 'danger':
                return 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
            case 'success':
                return 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'warning':
                return 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
            default:
                return 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        }
    }

    return createPortal(
        <div style={{ position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 2147483647 }} className="w-[92vw] max-w-sm px-2">
            <div className="flex flex-col gap-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-3">

                {/* Bagian Atas: Info Jumlah & Tombol Batal */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                            {selectedCount}
                        </span>
                        <span className="text-slate-300 text-xs font-medium">
                            pelanggan terpilih
                        </span>
                    </div>
                    <button
                        onClick={onClear}
                        className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
                        title="Batal seleksi"
                    >
                        <span>✕</span> Batalkan
                    </button>
                </div>

                {/* Tombol Aksi (Grid 2 Kolom yang Rapi di HP) */}
                <div className="grid grid-cols-2 gap-2">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={action.onClick}
                            disabled={action.loading}
                            title={action.title || action.label}
                            className={`
                                flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 whitespace-nowrap
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${getVariantStyle(action.variant)}
                            `}
                        >
                            <span>{action.icon}</span>
                            <span>{action.loading ? '...' : action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    )
}