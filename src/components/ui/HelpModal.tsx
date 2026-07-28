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
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-all"
                    >
                        X
                    </button>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic">Pomocník s tříděním</h2>
                        <p className="text-emerald-100 text-sm">Lokální recyklační průvodce</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-slate-100">
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`flex-1 py-4 font-bold text-sm uppercase transition-all ${activeTab === 'guide' ? 'text-emerald-600 border-b-4 border-emerald-500 bg-emerald-50' : 'text-slate-400'}`}
                    >
                        Návod
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex-1 py-4 font-bold text-sm uppercase transition-all ${activeTab === 'about' ? 'text-emerald-600 border-b-4 border-emerald-500 bg-emerald-50' : 'text-slate-400'}`}
                    >
                        O aplikaci
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'guide' && (
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Vyhledání odpadu</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Napište název odpadu do vyhledávacího pole a stiskněte <strong>HLEDAT</strong>.
                                    Aplikace hledá lokálně ve vestavěné databázi a ve vašich vlastních položkách.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Hlasové zadání</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Mikrofon převede hlas na text a aplikace tento text vyhledá stejně jako ručně napsaný dotaz.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Vlastní databáze</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Když položku nenajdete, přidejte ji ručně do vlastní databáze. Vlastní položky zůstávají v tomto prohlížeči.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Upozornění na svoz</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Klikněte na zvonek v záhlaví pro nastavení upozornění. Aplikace připomíná termíny ze svozového kalendáře Povrlů.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                                <p className="font-bold text-amber-800">Důležité upozornění</p>
                                <p className="text-amber-700 text-sm mt-1">
                                    Kalendář svozu odpadu je platný pouze pro <strong>obec Povrly</strong>.
                                </p>
                            </div>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Co aplikace umí?</h3>
                                <ul className="space-y-2 text-slate-600">
                                    <li>Určit správnou kategorii pro známý odpad.</li>
                                    <li>Vyhledávat lokálně s tolerancí překlepů.</li>
                                    <li>Nabídnout podobné položky bez síťového dotazu.</li>
                                    <li>Ukládat vlastní položky a historii do localStorage.</li>
                                    <li>Zobrazit svozový kalendář a fungovat po načtení offline.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-slate-800 mb-3">Soukromí</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Vyhledávání odpadu neodesílá dotazy ani fotografie žádnému rozpoznávacímu poskytovateli.
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
