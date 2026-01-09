import React from 'react';
import CategoryBadge from '../../../components/CategoryBadge';

interface SuggestionItem {
    name: string;
    category: string;
    note?: string;
}

interface SuggestionListProps {
    suggestions: SuggestionItem[];
    onSelect: (suggestion: SuggestionItem) => void;
    onUseAI: () => void;
    onCancel: () => void;
}

const SuggestionList: React.FC<SuggestionListProps> = ({
    suggestions,
    onSelect,
    onUseAI,
    onCancel,
}) => {
    if (suggestions.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                    <h3 className="text-2xl font-black uppercase italic">
                        🤔 Možná myslíte...
                    </h3>
                    <p className="text-sm opacity-90 mt-1">
                        Nenašel jsem přesnou shodu. Vyberte podobnou položku nebo použijte AI.
                    </p>
                </div>

                {/* Suggestions */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => onSelect(suggestion)}
                            className="w-full bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl p-4 transition-all active:scale-95 text-left"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 text-lg">
                                        {suggestion.name}
                                    </div>
                                    {suggestion.note && (
                                        <div className="text-sm text-slate-600 mt-1">
                                            {suggestion.note}
                                        </div>
                                    )}
                                </div>
                                <CategoryBadge category={suggestion.category as any} variant="minimal" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="border-t-2 border-slate-100 p-4 space-y-2">
                    <button
                        onClick={onUseAI}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">🤖</span>
                        Použít AI asistenta
                        <span className="text-xs opacity-75">(spotřebuje kredit)</span>
                    </button>

                    <button
                        onClick={onCancel}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all active:scale-95"
                    >
                        Zrušit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuggestionList;
