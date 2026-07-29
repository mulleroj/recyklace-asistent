import React, { useEffect, useRef, useState } from 'react';

interface HeaderProps {
    isOnline: boolean;
    soundEnabled: boolean;
    onToggleSound: () => void;
    onOpenNotificationSettings: () => void;
    onOpenHelp: () => void;
    onOpenCalendar: () => void;
    onOpenAnalytics: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isOnline,
    soundEnabled,
    onToggleSound,
    onOpenNotificationSettings,
    onOpenHelp,
    onOpenCalendar,
    onOpenAnalytics,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const menuButtonClass = 'p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-90 bg-white/20 text-white border-white/30 hover:bg-white/30 min-h-12 min-w-12';

    return (
        <>
            {!isOnline && (
                <div className="bg-orange-600 text-white py-3 px-4 text-center font-bold text-base sticky top-0 z-50 shadow-lg" role="status">
                    Rezim offline: funguje lokalni databaze.
                </div>
            )}

            <header className={`transition-all duration-300 border-b-[10px] shadow-xl sticky ${!isOnline ? 'top-[48px]' : 'top-0'} z-30 ${isOnline ? 'bg-emerald-600 border-emerald-800' : 'bg-slate-700 border-slate-900'}`}>
                <div className="max-w-2xl mx-auto px-4 min-h-24 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-white p-2 rounded-2xl shrink-0" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <h1 className="text-white text-xl sm:text-2xl font-black uppercase italic">Tridic</h1>
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                        <button onClick={onOpenCalendar} className={menuButtonClass} aria-label="Kalendar svozu">Cal</button>
                        <button onClick={onOpenHelp} className={menuButtonClass} aria-label="Napoveda">?</button>
                        <button onClick={onOpenAnalytics} className={menuButtonClass} aria-label="Statistiky">Stats</button>
                        <button onClick={onOpenNotificationSettings} className={menuButtonClass} aria-label="Nastaveni upozorneni">Bell</button>
                        <button onClick={onToggleSound} className={menuButtonClass} aria-label={soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}>
                            {soundEnabled ? 'Sound' : 'Mute'}
                        </button>
                    </div>

                    <div className="sm:hidden relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen((open) => !open)}
                            className={menuButtonClass}
                            aria-label="Menu"
                            aria-expanded={isMenuOpen}
                        >
                            Menu
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border-4 border-emerald-200 overflow-hidden min-w-[220px] z-50">
                                {[
                                    ['Kalendar', onOpenCalendar],
                                    ['Upozorneni', onOpenNotificationSettings],
                                    [soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk', onToggleSound],
                                    ['Statistiky', onOpenAnalytics],
                                    ['Stahnout aplikaci', () => window.dispatchEvent(new Event('show-install-prompt'))],
                                    ['Napoveda', onOpenHelp],
                                ].map(([label, action]) => (
                                    <button
                                        key={String(label)}
                                        onClick={() => {
                                            (action as () => void)();
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors font-bold text-slate-700 border-b border-slate-100 last:border-b-0"
                                    >
                                        {String(label)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
