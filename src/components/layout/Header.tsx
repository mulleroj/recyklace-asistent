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

const iconProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    className: 'h-5 w-5',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2,
    'aria-hidden': true,
} as const;

const CalendarIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3m8-3v3M4 8h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
);

const HelpIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9a3 3 0 015.83 1c0 2-3 2.5-3 4.5M12 17.5h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);

const ChartIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20V10m7 10V4m7 16v-7" />
    </svg>
);

const BellIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const SoundOnIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 6a9 9 0 010 12" />
    </svg>
);

const SoundOffIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM16 9l5 6m0-6l-5 6" />
    </svg>
);

const MenuIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
);

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
        if (!isMenuOpen) return;
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
    }, [isMenuOpen]);

    const iconButtonClass =
        'inline-flex items-center justify-center h-11 w-11 rounded-xl text-white bg-white/10 border border-white/20 transition-colors hover:bg-white/25 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

    const soundLabel = soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk';
    const menuLabel = isMenuOpen ? 'Zavřít nabídku' : 'Otevřít nabídku';

    return (
        <div className="sticky top-0 z-40">
            {!isOnline && (
                <div className="bg-orange-600 text-white py-2 px-4 text-center font-semibold text-sm" role="status">
                    Režim offline: funguje lokální databáze.
                </div>
            )}

            <header className={`transition-colors duration-300 border-b-4 shadow-md ${isOnline ? 'bg-emerald-600 border-emerald-800' : 'bg-slate-700 border-slate-900'}`}>
                <div className="max-w-2xl mx-auto px-3 sm:px-4 min-h-[80px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-white text-xl sm:text-2xl font-black tracking-tight truncate">Třídič</h1>
                            <p className="hidden sm:block text-emerald-100 text-xs font-medium">Recyklační asistent</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5">
                        <button type="button" onClick={onOpenCalendar} className={iconButtonClass} aria-label="Kalendář svozů" title="Kalendář svozů">
                            <CalendarIcon />
                        </button>
                        <button type="button" onClick={onOpenHelp} className={iconButtonClass} aria-label="Nápověda" title="Nápověda">
                            <HelpIcon />
                        </button>
                        <button type="button" onClick={onOpenAnalytics} className={iconButtonClass} aria-label="Statistiky" title="Statistiky">
                            <ChartIcon />
                        </button>
                        <button type="button" onClick={onOpenNotificationSettings} className={iconButtonClass} aria-label="Nastavení upozornění" title="Nastavení upozornění">
                            <BellIcon />
                        </button>
                        <button type="button" onClick={onToggleSound} className={iconButtonClass} aria-label={soundLabel} title={soundLabel}>
                            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
                        </button>
                    </div>

                    <div className="sm:hidden flex items-center gap-1.5">
                        <button type="button" onClick={onOpenCalendar} className={iconButtonClass} aria-label="Kalendář svozů" title="Kalendář svozů">
                            <CalendarIcon />
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((open) => !open)}
                                className={iconButtonClass}
                                aria-label={menuLabel}
                                title={menuLabel}
                                aria-expanded={isMenuOpen}
                                aria-haspopup="true"
                            >
                                {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-emerald-200 overflow-hidden min-w-[210px] max-w-[calc(100vw-1.5rem)] z-50">
                                    {[
                                        ['Upozornění', onOpenNotificationSettings],
                                        [soundLabel, onToggleSound],
                                        ['Statistiky', onOpenAnalytics],
                                        ['Stáhnout aplikaci', () => window.dispatchEvent(new Event('show-install-prompt'))],
                                        ['Nápověda', onOpenHelp],
                                    ].map(([label, action]) => (
                                        <button
                                            key={String(label)}
                                            type="button"
                                            onClick={() => {
                                                (action as () => void)();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full min-h-11 px-4 py-3 text-left hover:bg-emerald-50 focus-visible:bg-emerald-50 transition-colors font-semibold text-slate-700 border-b border-slate-100 last:border-b-0"
                                        >
                                            {String(label)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
};

export default Header;
