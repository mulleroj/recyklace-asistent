import React, { useState } from 'react';
import { WasteCategory } from '../../../types';

interface FeedbackButtonsProps {
    itemId: string;
    itemName: string;
    category: WasteCategory;
    onFeedback: (positive: boolean, details?: { correctCategory?: WasteCategory; note?: string }) => void;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
    itemId,
    itemName,
    category,
    onFeedback,
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false);

    const handlePositive = () => {
        onFeedback(true);
        setFeedbackGiven(true);
        setTimeout(() => setFeedbackGiven(false), 2000);
    };

    const handleNegative = () => {
        setShowDetails(true);
    };

    if (feedbackGiven) {
        return (
            <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                <span className="text-green-700 font-bold">✅ Děkujeme za zpětnou vazbu!</span>
            </div>
        );
    }

    if (showDetails) {
        return (
            <NegativeFeedbackForm
                itemName={itemName}
                currentCategory={category}
                onSubmit={(details) => {
                    onFeedback(false, details);
                    setShowDetails(false);
                    setFeedbackGiven(true);
                    setTimeout(() => setFeedbackGiven(false), 2000);
                }}
                onCancel={() => setShowDetails(false)}
            />
        );
    }

    return (
        <div className="mt-4 border-t-2 border-slate-100 pt-4">
            <p className="text-sm text-slate-600 font-medium mb-3 text-center">
                Byl tento výsledek správný?
            </p>
            <div className="flex gap-3">
                <button
                    onClick={handlePositive}
                    className="flex-1 py-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl font-bold text-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">👍</span>
                    Ano
                </button>
                <button
                    onClick={handleNegative}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-400 rounded-xl font-bold text-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">👎</span>
                    Ne
                </button>
            </div>
        </div>
    );
};

const NegativeFeedbackForm: React.FC<{
    itemName: string;
    currentCategory: WasteCategory;
    onSubmit: (details: { correctCategory?: WasteCategory; note?: string }) => void;
    onCancel: () => void;
}> = ({ itemName, currentCategory, onSubmit, onCancel }) => {
    const [correctCategory, setCorrectCategory] = useState<WasteCategory | ''>('');
    const [note, setNote] = useState('');

    const categories = [
        { value: WasteCategory.PLAST, label: 'Žlutá: Plasty' },
        { value: WasteCategory.PAPIR, label: 'Modrá: Papír' },
        { value: WasteCategory.SKLO, label: 'Zelená: Sklo' },
        { value: WasteCategory.KOVY, label: 'Šedá: Kovy' },
        { value: WasteCategory.BIO, label: 'Hnědá: Bioodpad' },
        { value: WasteCategory.KOMUNALNI, label: 'Černá: Směsný odpad' },
        { value: WasteCategory.SBERNY_DVUR, label: 'Sběrný dvůr' },
        { value: WasteCategory.NEBEZPECNY, label: 'Nebezpečný odpad' },
    ];

    return (
        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <h4 className="font-bold text-red-900 mb-3">Pomožte nám zlepšit třídění</h4>

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Kam "{itemName}" správně patří?
                    </label>
                    <select
                        value={correctCategory}
                        onChange={(e) => setCorrectCategory(e.target.value as WasteCategory)}
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-400 focus:outline-none"
                    >
                        <option value="">Vyberte správnou kategorii...</option>
                        {categories
                            .filter(c => c.value !== currentCategory)
                            .map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))
                        }
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Poznámka (volitelné)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Např. 'Plastová část patří do žlutého kontejneru'"
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-400 focus:outline-none resize-none"
                        rows={2}
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={() => onSubmit({ correctCategory: correctCategory as WasteCategory, note })}
                        disabled={!correctCategory && !note}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
                    >
                        Odeslat
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
                    >
                        Zrušit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackButtons;
