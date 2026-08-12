'use client'

// components/BulkActionBar.js
// Floating action bar yang muncul saat ada item yang diseleksi

export default function BulkActionBar({ selectedCount, onClear, actions }) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 bg-slate-800 border border-slate-600 shadow-2xl shadow-black/60 rounded-2xl px-5 py-3.5">
                {/* Badge Jumlah Item */}
                <div className="flex items-center gap-2 pr-3 border-r border-slate-600">
                    <span className="w-6 h-6 flex items-center justify-center bg-cyan-600 text-white text-xs font-bold rounded-full">
                        {selectedCount}
                    </span>
                    <span className="text-slate-300 text-sm font-medium whitespace-nowrap">
                        item dipilih
                    </span>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={action.onClick}
                            disabled={action.loading}
                            title={action.title || action.label}
                            className={`
                                flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${action.variant === 'danger'
                                    ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800'
                                    : action.variant === 'success'
                                        ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800'
                                        : action.variant === 'warning'
                                            ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800'
                                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
                                }
                            `}
                        >
                            <span>{action.icon}</span>
                            <span>{action.loading ? 'Memproses...' : action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tombol Batal */}
                <button
                    onClick={onClear}
                    className="ml-1 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm"
                    title="Batal seleksi"
                >
                    ✕
                </button>
            </div>
        </div>
    )
}
