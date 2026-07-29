import React, { useCallback, useEffect, useState } from 'react';
import { getAnalytics } from '../../../utils/analytics';

interface AnalyticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Stats {
    totalSearches: number;
    localHits: number;
    notFound: number;
    suggestionsShown: number;
    suggestionsAccepted: number;
    suggestionsRejected: number;
    userAddedItems: number;
    feedbackPositive: number;
    feedbackNegative: number;
    suggestionAcceptanceRate: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [popularQueries, setPopularQueries] = useState<Array<{ query: string; count: number }>>([]);
    const [timeRange, setTimeRange] = useState<'session' | 'day' | 'week' | 'all'>('session');

    const refreshStats = useCallback(() => {
        const analytics = getAnalytics();
        const now = Date.now();
        const fromDate = timeRange === 'day'
            ? now - (24 * 60 * 60 * 1000)
            : timeRange === 'week'
                ? now - (7 * 24 * 60 * 60 * 1000)
                : undefined;

        setStats(analytics.getStats(fromDate));
        setPopularQueries(analytics.getPopularQueries(10));
    }, [timeRange]);

    useEffect(() => {
        if (isOpen) refreshStats();
    }, [isOpen, refreshStats]);

    const exportData = () => {
        const analytics = getAnalytics();
        const data = analytics.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen || !stats) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">Statistiky</h2>
                        <p className="text-sm opacity-90 mt-1">Lokální vyhledávání a vlastní položky</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl transition-all"
                    >
                        X
                    </button>
                </div>

                <div className="flex gap-2 p-4 bg-slate-50 border-b-2 border-slate-100">
                    {(['session', 'day', 'week', 'all'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${timeRange === range
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {range === 'session' && 'Tato relace'}
                            {range === 'day' && 'Dnes'}
                            {range === 'week' && 'Tento týden'}
                            {range === 'all' && 'Vše'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Vyhledávání" value={stats.totalSearches} color="blue" />
                        <StatCard label="Nalezeno lokálně" value={stats.localHits} color="green" />
                        <StatCard label="Nenalezeno" value={stats.notFound} color="orange" />
                        <StatCard label="Vlastní položky" value={stats.userAddedItems} color="purple" />
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Rozložení vyhledávání</h3>
                        <div className="space-y-3">
                            <ProgressBar label="Lokální zásahy" value={stats.localHits} total={stats.totalSearches} color="emerald" />
                            <ProgressBar label="Nenalezené dotazy" value={stats.notFound} total={stats.totalSearches} color="orange" />
                        </div>
                    </div>

                    {stats.suggestionsShown > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">Návrhy podobných položek</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <Metric label="Zobrazeno" value={stats.suggestionsShown} />
                                <Metric label="Přijato" value={stats.suggestionsAccepted} />
                                <Metric label="Upraveno" value={stats.suggestionsRejected} />
                            </div>
                        </div>
                    )}

                    {popularQueries.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">Nejčastější dotazy</h3>
                            <div className="space-y-2">
                                {popularQueries.map((item, index) => (
                                    <div key={`${item.query}-${index}`} className="flex justify-between items-center p-3 bg-white rounded-xl">
                                        <span className="font-medium text-slate-700">{index + 1}. {item.query}</span>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                                            {item.count}x
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(stats.feedbackPositive > 0 || stats.feedbackNegative > 0) && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">Zpětná vazba</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Metric label="Pozitivní" value={stats.feedbackPositive} />
                                <Metric label="Negativní" value={stats.feedbackNegative} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t-2 border-slate-100 p-4 flex justify-between items-center bg-slate-50">
                    <button onClick={refreshStats} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-all">
                        Obnovit
                    </button>
                    <button onClick={exportData} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all">
                        Exportovat data
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string | number; color: 'blue' | 'green' | 'orange' | 'purple' }> = ({
    label,
    value,
    color,
}) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        orange: 'from-orange-500 to-orange-600',
        purple: 'from-purple-500 to-purple-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 text-white`}>
            <div className="text-xs opacity-90">{label}</div>
            <div className="text-2xl font-black mt-1">{value}</div>
        </div>
    );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="text-center">
        <div className="text-3xl font-black text-emerald-600">{value}</div>
        <div className="text-sm text-slate-600">{label}</div>
    </div>
);

const ProgressBar: React.FC<{ label: string; value: number; total: number; color: 'emerald' | 'orange' }> = ({
    label,
    value,
    total,
    color,
}) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const colors = {
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="font-bold text-slate-900">{value} ({Math.round(percentage)}%)</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${colors[color]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
