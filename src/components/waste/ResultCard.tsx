import React from 'react';
import CategoryBadge from '../../../components/CategoryBadge';
import { WasteCategory, WasteItem } from '../../../types';
import { useAnnounce } from '../../hooks/useAnnounce';
import FeedbackButtons from './FeedbackButtons';
import { getAnalytics, AnalyticsEvent } from '../../../utils/analytics';

interface ResultCardProps {
    result: GarbageResult;
    onClose: () => void;
}

type GarbageResult = WasteItem & { source?: 'local' | 'user' };

const ResultCard: React.FC<ResultCardProps> = ({ result, onClose }) => {
    const { speakText } = useAnnounce(true);

    const handleNoteClick = () => {
        if (result.note) {
            speakText(result.note);
        }
    };

    const sourceLabel = result.source === 'user' ? 'Moje položka' : 'V databázi';
    const sourceColor = result.source === 'user' ? 'bg-purple-500' : 'bg-emerald-500';

    const handleFeedback = (positive: boolean, details?: { correctCategory?: WasteCategory; note?: string }) => {
        const analytics = getAnalytics();

        analytics.track(positive ? AnalyticsEvent.USER_FEEDBACK_POSITIVE : AnalyticsEvent.USER_FEEDBACK_NEGATIVE, {
            itemName: result.name,
            category: result.category,
            source: result.source,
            correctCategory: details?.correctCategory,
            userNote: details?.note,
        });
    };

    return (
        <div className="mb-10 bg-white rounded-[50px] p-12 shadow-2xl border-[12px] border-emerald-100 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className={`absolute top-0 right-0 px-6 py-2 text-[10px] font-black uppercase tracking-widest ${sourceColor} text-white`}>
                {sourceLabel}
            </div>

            <div className="mb-8 text-center">
                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {result.source === 'user' ? 'Položka z vaší databáze:' : 'Položka nalezena v databázi:'}
                </p>
                <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic">
                    {result.name} patří do:
                </h2>
            </div>

            <div className="mb-10"><CategoryBadge category={result.category as any} variant="hero" /></div>

            {result.note && (
                <div
                    onClick={handleNoteClick}
                    className="bg-slate-50 p-8 rounded-3xl border-4 border-slate-100 shadow-inner cursor-pointer hover:bg-slate-100 hover:border-emerald-200 active:scale-[0.98] transition-all group"
                    title="Klikněte pro přečtení poznámky"
                    role="button"
                    aria-label={`Přečíst poznámku: ${result.note}`}
                >
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">Zvuk</span>
                        <p className="text-2xl font-bold text-slate-700 italic text-center">"{result.note}"</p>
                    </div>
                </div>
            )}

            <FeedbackButtons
                itemId={result.id}
                itemName={result.name}
                category={result.category}
                onFeedback={handleFeedback}
            />

            <button onClick={onClose} className="w-full mt-8 h-20 bg-slate-800 text-white rounded-3xl font-black text-xl active:scale-95 transition-all shadow-lg">ROZUMÍM</button>
        </div>
    );
};

export default ResultCard;
