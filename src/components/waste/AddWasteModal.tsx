import React, { useState } from 'react';
import { WasteCategory } from '../../../types';
import { WASTE_DATABASE } from '../../../constants';
import { findLocalMatch } from '../../../utils/fuzzySearch';

interface AddWasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: { name: string; category: WasteCategory; note: string }) => void;
}

const CATEGORY_OPTIONS = [
    { value: WasteCategory.PLAST, label: 'Žlutá: Plasty', color: 'bg-yellow-400' },
    { value: WasteCategory.PAPIR, label: 'Modrá: Papír', color: 'bg-blue-600' },
    { value: WasteCategory.SKLO, label: 'Zelená: Sklo', color: 'bg-green-700' },
    { value: WasteCategory.BIO, label: 'Hnědá: Bioodpad', color: 'bg-amber-900' },
    { value: WasteCategory.KOVY, label: 'Šedá: Kovy', color: 'bg-gray-500' },
    { value: WasteCategory.SMESNY, label: 'Černá: Směsný odpad', color: 'bg-zinc-800' },
    { value: WasteCategory.SBERNY_DVUR, label: 'Sběrný dvůr', color: 'bg-red-600' },
    { value: WasteCategory.TEXTIL, label: 'Textil', color: 'bg-purple-600' },
    { value: WasteCategory.OLEJE, label: 'Oleje', color: 'bg-orange-600' },
    { value: WasteCategory.LEKARNA, label: 'Lékárna', color: 'bg-emerald-600' },
];

// Heuristická pravidla pro návrh kategorie na základě klíčových slov
const KEYWORD_RULES: Array<{ keywords: string[]; category: WasteCategory; note?: string }> = [
    // Plasty
    { keywords: ['plast', 'pet', 'láhev', 'flaška', 'kelímek', 'fólie', 'sáček', 'igelit', 'obal', 'tetrapak', 'tetra pak', 'polystyren'], category: WasteCategory.PLAST, note: 'Sešlápnout a vhodit do žlutého kontejneru.' },

    // Papír
    { keywords: ['papír', 'noviny', 'časopis', 'krabice', 'karton', 'lepenka', 'kniha', 'sešit', 'katalog', 'letáky', 'obálka'], category: WasteCategory.PAPIR, note: 'Složit a vhodit do modrého kontejneru. Nesmí být mokrý nebo mastný.' },

    // Sklo
    { keywords: ['sklo', 'sklenice', 'láhev od vína', 'zavařovačka', 'skleněn'], category: WasteCategory.SKLO, note: 'Vhodit do zeleného (barevné) nebo bílého (čiré) kontejneru. Bez víček.' },

    // Bioodpad
    { keywords: ['bio', 'ovoce', 'zelenina', 'listí', 'tráva', 'slupky', 'skořápky', 'kávová sedlina', 'čajové sáčky', 'zbytky jídla', 'kompost'], category: WasteCategory.BIO, note: 'Patří do hnědé popelnice nebo na kompost.' },

    // Kovy
    { keywords: ['kov', 'plechovka', 'konzerva', 'hliník', 'alobal', 'víčko', 'drát', 'šroub', 'hřebík'], category: WasteCategory.KOVY, note: 'Prázdné a čisté do šedého kontejneru na kovy.' },

    // Elektro / Sběrný dvůr
    { keywords: ['elektro', 'spotřebič', 'počítač', 'telefon', 'mobil', 'televize', 'monitor', 'lednice', 'pračka', 'baterie', 'akumulátor', 'žárovka', 'zářivka', 'kabel'], category: WasteCategory.SBERNY_DVUR, note: 'Odevzdat v obchodě s elektronikou nebo na sběrném dvoře.' },

    // Textil
    { keywords: ['textil', 'oblečení', 'šaty', 'tričko', 'kalhoty', 'boty', 'obuv', 'hadry', 'prostěradlo', 'ručník', 'záclona'], category: WasteCategory.TEXTIL, note: 'Do kontejneru na textil nebo charitě.' },

    // Oleje
    { keywords: ['olej', 'fritovací', 'motorový olej', 'mazivo'], category: WasteCategory.OLEJE, note: 'Slít do PET láhve a odevzdat na sběrném dvoře.' },

    // Lékárna
    { keywords: ['lék', 'léky', 'prášky', 'tablety', 'sirup', 'mast', 'injekce', 'jehla'], category: WasteCategory.LEKARNA, note: 'Odevzdat v lékárně. Nikdy nevyhazovat do koše!' },

    // Nebezpečný odpad / Sběrný dvůr
    { keywords: ['barva', 'lak', 'ředidlo', 'rozpouštědlo', 'pesticid', 'chemikálie', 'azbest', 'eternit'], category: WasteCategory.SBERNY_DVUR, note: 'Nebezpečný odpad - odevzdat na sběrném dvoře.' },

    // Objemný odpad / Sběrný dvůr
    { keywords: ['nábytek', 'skříň', 'postel', 'matrace', 'koberec', 'křeslo', 'gauč'], category: WasteCategory.SBERNY_DVUR, note: 'Objemný odpad - odvézt na sběrný dvůr.' },
];

// Normalizace textu pro porovnání
const normalize = (str: string) =>
    str.toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

// Heuristické doplnění kategorie na základě klíčových slov
function suggestCategoryFromKeywords(name: string): { category: WasteCategory; note: string } | null {
    const normalizedName = normalize(name);

    // Nejprve zkusíme najít v hlavní databázi
    const dbMatch = findLocalMatch(name, WASTE_DATABASE);
    if (dbMatch) {
        return {
            category: dbMatch.category as WasteCategory,
            note: dbMatch.note || ''
        };
    }

    // Pokud nenajdeme v databázi, použijeme klíčová slova
    for (const rule of KEYWORD_RULES) {
        for (const keyword of rule.keywords) {
            if (normalizedName.includes(normalize(keyword))) {
                return {
                    category: rule.category,
                    note: rule.note || ''
                };
            }
        }
    }

    return null;
}

const AddWasteModal: React.FC<AddWasteModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<WasteCategory>(WasteCategory.SMESNY);
    const [note, setNote] = useState('');
    const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

    const handleSuggest = () => {
        if (!name.trim()) {
            setSuggestionMessage('Nejprve zadejte název odpadu.');
            return;
        }

        const suggestion = suggestCategoryFromKeywords(name.trim());

        if (suggestion) {
            setCategory(suggestion.category);
            setNote(suggestion.note);
            setSuggestionMessage('✓ Kategorie navržena na základě klíčových slov.');
        } else {
            setSuggestionMessage('Nebyl nalezen návrh. Vyberte kategorii ručně.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        onAdd({
            name: name.trim(),
            category,
            note: note.trim()
        });

        setName('');
        setCategory(WasteCategory.SMESNY);
        setNote('');
        setSuggestionMessage(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-black uppercase italic text-slate-800 mb-6 text-center">
                    Přidat do databáze
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 uppercase">
                            Název odpadu *
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setSuggestionMessage(null);
                                }}
                                placeholder="např. Krabice od pizzy"
                                className="flex-1 px-6 py-4 rounded-2xl border-4 border-slate-200 text-lg font-bold focus:outline-none focus:border-emerald-400 transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleSuggest}
                                disabled={!name.trim()}
                                className="px-4 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2"
                                title="Navrhnout kategorii (offline)"
                            >
                                💡
                            </button>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2 font-bold">
                            💡 Klikněte pro automatický návrh kategorie (funguje offline)
                        </p>
                        {suggestionMessage && (
                            <p className={`text-xs mt-2 font-bold ${suggestionMessage.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>
                                {suggestionMessage}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 uppercase">
                            Kategorie *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as WasteCategory)}
                            className="w-full px-6 py-4 rounded-2xl border-4 border-slate-200 text-lg font-bold focus:outline-none focus:border-emerald-400 transition-all bg-white"
                            aria-label="Vyberte kategorii odpadu"
                        >
                            {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 uppercase">
                            Poznámka (volitelné)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Jak správně třídit, tipy..."
                            rows={3}
                            className="w-full px-6 py-4 rounded-2xl border-4 border-slate-200 text-lg font-bold focus:outline-none focus:border-emerald-400 transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl border-4 border-slate-300 text-slate-600 font-black text-lg uppercase active:scale-95 transition-all"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-4 rounded-2xl bg-emerald-600 border-4 border-emerald-700 text-white font-black text-lg uppercase active:scale-95 transition-all shadow-lg"
                        >
                            Přidat
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddWasteModal;
