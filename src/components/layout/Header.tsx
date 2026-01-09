
import React, { useState, useEffect, useRef } from 'react';

interface HeaderProps {
    isOnline: boolean;
    soundEnabled: boolean;
    onToggleSound: () => void;
    onOpenNotificationSettings: () => void;
    onOpenHelp: () => void;
    onOpenApiKey: () => void;
    onOpenCalendar: () => void;
    onOpenAnalytics: () => void;
}

const Header: React.FC<HeaderProps> = ({ isOnline, soundEnabled, onToggleSound, onOpenNotificationSettings, onOpenHelp, onOpenApiKey, onOpenCalendar, onOpenAnalytics }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Detect screen width and update mobile state
    useEffect(() => {
        const checkMobile = () => {
            // Use 768px as breakpoint - anything below is mobile
            setIsMobile(window.innerWidth < 768);
        };

        // Check on mount
        checkMobile();

        // Listen for resize events
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <>
            {!isOnline && (
                <div className="bg-orange-600 text-white py-3 px-4 text-center font-bold text-lg sticky top-0 z-50 shadow-lg">
                    Režim offline: Pouze lokální databáze 📦
                </div>
            )}

            <header className={`transition-all duration-700 border-b-[10px] shadow-xl sticky ${!isOnline ? 'top-[48px]' : 'top-0'} z-30 ${isOnline ? 'bg-emerald-600 border-emerald-800' : 'bg-slate-700 border-slate-900'}`}>
                <div className="max-w-2xl mx-auto px-4 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <h1 className="text-white text-2xl font-black uppercase italic tracking-tighter">Třídič</h1>
                    </div>

                    {/* Desktop menu - all buttons visible */}
                    {!isMobile && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onOpenCalendar}
                                className="p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30"
                                aria-label="Kalendář"
                            >
                                <span className="text-xl">📅</span>
                            </button>
                            <button
                                onClick={onOpenHelp}
                                className="p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30"
                                aria-label="Nápověda"
                            >
                                <span className="text-xl">❓</span>
                            </button>
                            <button
                                onClick={onOpenAnalytics}
                                className="p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30"
                                aria-label="Statistiky"
                            >
                                <span className="text-xl">📊</span>
                            </button>
                            <button
                                onClick={onOpenApiKey}
                                className="p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30"
                                aria-label="API klíč"
                            >
                                <span className="text-xl">🔑</span>
                            </button>
                            <button
                                onClick={onOpenNotificationSettings}
                                className="p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30"
                                aria-label="Nastavení upozornění"
                            >
                                <span className="text-xl">🔔</span>
                            </button>
                            <button
                                onClick={onToggleSound}
                                className={`p-4 rounded-2xl border-2 transition-all active:scale-90 flex items-center gap-2 ${soundEnabled ? 'bg-white/20 text-white border-white/30' : 'bg-black/20 text-white/40 border-black/10'}`}
                            >
                                <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
                                <span className="text-xs font-bold uppercase">{soundEnabled ? 'Hlas zap' : 'Ticho'}</span>
                            </button>
                        </div>
                    )}

                    {/* Mobile menu - compact with dropdown */}
                    {isMobile && (
                        <div className="flex items-center gap-2" ref={menuRef}>
                            {/* Calendar button always visible on mobile */}
                            <button
                                onClick={onOpenCalendar}
                                className="p-3 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30"
                                aria-label="Kalendář"
                            >
                                <span className="text-xl">📅</span>
                            </button>

                            {/* Dropdown menu button with everything else */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-3 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30"
                                    aria-label="Menu"
                                >
                                    <span className="text-xl">⋯</span>
                                </button>

                                {/* Dropdown menu with ALL options */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border-4 border-emerald-200 overflow-hidden min-w-[200px] z-50">
                                        <button
                                            onClick={() => {
                                                onOpenNotificationSettings();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <span className="text-xl">🔔</span>
                                            <span className="font-bold text-slate-700">Upozornění</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                onToggleSound();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
                                            <span className="font-bold text-slate-700">{soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                onOpenAnalytics();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <span className="text-xl">📊</span>
                                            <span className="font-bold text-slate-700">Statistiky</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                onOpenApiKey();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <span className="text-xl">🔑</span>
                                            <span className="font-bold text-slate-700">API klíč</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                onOpenHelp();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3"
                                        >
                                            <span className="text-xl">❓</span>
                                            <span className="font-bold text-slate-700">Nápověda</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};

export default Header;
