
import React, { useEffect, useState } from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'guide' | 'about'>('guide');

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-all"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl">
                            <span className="text-3xl">♻️</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase italic">Pomocník s tříděním</h2>
                            <p className="text-emerald-100 text-sm">Váš průvodce recyklací</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b-2 border-slate-100">
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`flex-1 py-4 font-bold text-sm uppercase transition-all ${activeTab === 'guide' ? 'text-emerald-600 border-b-4 border-emerald-500 bg-emerald-50' : 'text-slate-400'}`}
                    >
                        📖 Návod
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex-1 py-4 font-bold text-sm uppercase transition-all ${activeTab === 'about' ? 'text-emerald-600 border-b-4 border-emerald-500 bg-emerald-50' : 'text-slate-400'}`}
                    >
                        ℹ️ O aplikaci
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'guide' && (
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="text-2xl">🔍</span> Vyhledání odpadu
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Napište název odpadu do vyhledávacího pole a stiskněte <strong>HLEDAT</strong>.
                                    Aplikace používá inteligentní vyhledávání, které toleruje překlepy a různé varianty názvů.
                                    Pokud není přesná shoda, zobrazí se návrhy podobných položek.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="text-2xl">🎤</span> Hlasové ovládání
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Klikněte na ikonu mikrofonu a řekněte název odpadu.
                                    Aplikace rozpozná váš hlas a vyhledá odpad automaticky.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="text-2xl">📷</span> Rozpoznání fotkou
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Klikněte na ikonu fotoaparátu a vyfoťte odpad.
                                    AI analyzuje obrázek a určí správnou kategorii. Odpovědi AI se ukládají
                                    do cache pro rychlejší opakované dotazy.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="text-2xl">🔔</span> Upozornění na svoz
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Klikněte na zvonek v záhlaví pro nastavení upozornění.
                                    Aplikace vám připomene nadcházející svoz odpadu.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="text-2xl">➕</span> Vlastní databáze
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Můžete přidat vlastní položky do databáze pomocí tlačítka
                                    "Přidat vlastní odpad". Tyto položky se vyhledají rychleji.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            {/* Warning about location */}
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <p className="font-bold text-amber-800">Důležité upozornění</p>
                                        <p className="text-amber-700 text-sm mt-1">
                                            Kalendář svozu odpadu je platný pouze pro <strong>obec Povrly</strong>
                                            (okres Ústí nad Labem). Pro jiné obce nemusí být termíny správné.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Co aplikace umí?</h3>
                                <ul className="space-y-2 text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Určit správnou popelnici pro odpad
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Inteligentní vyhledávání s tolerancí překlepů
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Návrhy podobných položek
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Rozpoznat odpad z fotografie (AI)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Hlasové vyhledávání
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Upozornění na svoz odpadu
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        AI cache pro rychlé opakované dotazy
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Optimalizace obrázků pro rychlejší zpracování
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        Funguje i offline (základní funkce)
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Typy odpadu</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 bg-yellow-100 p-2 rounded-xl">
                                        <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                                        <span>Plasty</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-100 p-2 rounded-xl">
                                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                                        <span>Papír</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-green-100 p-2 rounded-xl">
                                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                                        <span>Sklo</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-xl">
                                        <div className="w-4 h-4 bg-amber-700 rounded"></div>
                                        <span>Bioodpad</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-100 p-2 rounded-xl col-span-2">
                                        <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                        <span>Směsný odpad</span>
                                    </div>
                                </div>
                            </section>

                            <section className="text-center pt-4 border-t-2 border-slate-100">
                                <p className="text-xs text-slate-400">
                                    Vytvořeno s ♻️ pro obec Povrly
                                </p>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
