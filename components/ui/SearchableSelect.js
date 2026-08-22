'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

export default function SearchableSelect({
    options = [], // Mendukung [{ id, nama, kode_pelanggan, paket: { nama_paket, harga }, no_wa }] atau format string
    value,
    onChange,
    placeholder = "Cari & pilih pelanggan (Nama / ID)...",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Menutup dropdown saat klik di luar area
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerSearch = searchTerm.toLowerCase();
        return options.filter(opt => {
            const nama = opt.nama?.toLowerCase() || '';
            const kode = opt.kode_pelanggan?.toLowerCase() || '';
            const noWa = opt.no_wa || '';
            const paketNama = typeof opt.paket === 'object' ? (opt.paket?.nama_paket?.toLowerCase() || '') : (typeof opt.paket === 'string' ? opt.paket.toLowerCase() : '');
            
            return (
                nama.includes(lowerSearch) ||
                kode.includes(lowerSearch) ||
                noWa.includes(lowerSearch) ||
                paketNama.includes(lowerSearch)
            );
        });
    }, [searchTerm, options]);

    const handleSelect = (option) => {
        // Mendukung passing id string/angka atau whole object jika dibutuhkan
        if (typeof onChange === 'function') {
            onChange(option.id !== undefined ? option.id : option);
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt.id === value);

    const getPaketLabel = (opt) => {
        if (!opt) return '';
        if (typeof opt.paket === 'object' && opt.paket !== null) {
            const harga = opt.paket.harga ? ` - Rp ${Number(opt.paket.harga).toLocaleString('id-ID')}` : '';
            return `${opt.paket.nama_paket || 'Paket'}${harga}`;
        }
        if (typeof opt.paket === 'string') {
            const harga = opt.harga ? ` - Rp ${Number(opt.harga).toLocaleString('id-ID')}` : '';
            return `${opt.paket}${harga}`;
        }
        return '';
    };

    return (
        <div ref={wrapperRef} className="relative w-full text-xs">
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-slate-950 border ${isOpen ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-slate-800 hover:border-slate-700'} text-slate-100 rounded-xl px-3.5 py-2.5 cursor-pointer flex justify-between items-center transition shadow-sm select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="truncate pr-2">
                    {selectedOption ? (
                        <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-cyan-400 font-bold">{selectedOption.kode_pelanggan}</span>
                            <span className="font-semibold text-white">{selectedOption.nama}</span>
                            {getPaketLabel(selectedOption) && (
                                <span className="text-[11px] text-slate-400">({getPaketLabel(selectedOption)})</span>
                            )}
                        </span>
                    ) : (
                        <span className="text-slate-500">{placeholder}</span>
                    )}
                </div>
                <span className={`text-slate-400 text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-slate-800 bg-slate-950/70">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                            <span className="text-slate-400 text-xs">🔍</span>
                            <input
                                type="text"
                                className="w-full bg-transparent text-white text-xs placeholder-slate-500 outline-none"
                                placeholder="Ketik nama, ID (WIFI-xxx), atau paket..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="text-slate-500 hover:text-slate-300 text-xs px-1"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <ul className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/40">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isSelected = value === opt.id;
                                return (
                                    <li
                                        key={opt.id}
                                        onClick={() => handleSelect(opt)}
                                        className={`px-3.5 py-2.5 hover:bg-cyan-950/40 cursor-pointer flex justify-between items-center transition ${isSelected ? 'bg-cyan-950/60 border-l-2 border-cyan-400' : ''}`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-cyan-400 font-bold text-[11px]">{opt.kode_pelanggan}</span>
                                                <span className="text-white font-medium">{opt.nama}</span>
                                            </div>
                                            {getPaketLabel(opt) && (
                                                <span className="text-[10px] text-slate-400">
                                                    📦 {getPaketLabel(opt)}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <span className="text-cyan-400 font-bold text-xs">✓</span>
                                        )}
                                    </li>
                                );
                            })
                        ) : (
                            <li className="px-4 py-6 text-slate-500 text-xs text-center flex flex-col items-center gap-1">
                                <span>🔎</span>
                                <span>Pelanggan "{searchTerm}" tidak ditemukan.</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}