import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../../../utils/analytics';

interface AnalyticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState<any>(null);
    const [popularQueries, setPopularQueries] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<'session' | 'day' | 'week' | 'all'>('session');

    useEffect(() => {
        if (isOpen) {
            refreshStats();
        }
    }, [isOpen, timeRange]);

    const refreshStats = () => {
        const analytics = getAnalytics();

        let fromDate: number | undefined;
        const now = Date.now();

        switch (timeRange) {
            case 'day':
                fromDate = now - (24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
                fromDate = undefined;
                break;
            case 'session':
            default:
                fromDate = undefined; // Uses session start time
        }

        setStats(analytics.getStats(fromDate));
        setPopularQueries(analytics.getPopularQueries(10));
    };

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
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic">📊 Statistiky</h2>
                        <p className="text-sm opacity-90 mt-1">Analytics & Monitoring Dashboard</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2 p-4 bg-slate-50 border-b-2 border-slate-100">
                    {(['session', 'day', 'week', 'all'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${timeRange === range
                                    ? 'bg-purple-600 text-white'
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon="🔍"
                            label="Celkem vyhledávání"
                            value={stats.totalSearches}
                            color="blue"
                        />
                        <StatCard
                            icon="💾"
                            label="Cache Hit Rate"
                            value={`${stats.cacheHitRate}%`}
                            color="green"
                        />
                        <StatCard
                            icon="🤖"
                            label="AI Volání"
                            value={stats.aiCalls}
                            color="purple"
                        />
                        <StatCard
                            icon="💡"
                            label="Návrhy přijaty"
                            value={`${stats.suggestionAcceptanceRate}%`}
                            color="orange"
                        />
                    </div>

                    {/* Search Breakdown */}
                    <div className="bg-slate-50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">🔍 Rozložení vyhledávání</h3>
                        <div className="space-y-3">
                            <ProgressBar
                                label="Lokální databáze"
                                value={stats.localHits}
                                total={stats.totalSearches}
                                color="emerald"
                            />
                            <ProgressBar
                                label="AI Cache"
                                value={stats.cacheHits}
                                total={stats.totalSearches}
                                color="blue"
                            />
                            <ProgressBar
                                label="AI Volání"
                                value={stats.aiCalls}
                                total={stats.totalSearches}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Suggestions */}
                    {stats.suggestionsShown > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">💡 Návrhy</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-blue-600">{stats.suggestionsShown}</div>
                                    <div className="text-sm text-slate-600">Zobrazeno</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-green-600">{stats.suggestionsAccepted}</div>
                                    <div className="text-sm text-slate-600">Přijato</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-black text-red-600">{stats.suggestionsRejected}</div>
                                    <div className="text-sm text-slate-600">Odmítnuto</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Stats */}
                    {stats.imagesCaptured > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">📸 Obrázky</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-slate-600">Vyfoceno</div>
                                    <div className="text-2xl font-black text-slate-800">{stats.imagesCaptured}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-600">Cache Hit Rate</div>
                                    <div className="text-2xl font-black text-slate-800">{stats.imageCacheHitRate}%</div>
                                </div>
                            </div>
                            {stats.compressionSavings && (
                                <div className="mt-4 pt-4 border-t-2 border-slate-200">
                                    <div className="text-sm text-slate-600">Průměrná komprese</div>
                                    <div className="text-2xl font-black text-green-600">
                                        {stats.compressionSavings.averageReduction}%
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {formatBytes(stats.compressionSavings.totalOriginalSize)} → {formatBytes(stats.compressionSavings.totalCompressedSize)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Popular Queries */}
                    {popularQueries.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">🔥 Nejčastější dotazy</h3>
                            <div className="space-y-2">
                                {popularQueries.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl">
                                        <span className="font-medium text-slate-700">
                                            {i + 1}. {item.query}
                                        </span>
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                                            {item.count}×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User Feedback */}
                    {(stats.feedbackPositive > 0 || stats.feedbackNegative > 0) && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 text-slate-800">👍 Zpětná vazba</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-green-600">{stats.feedbackPositive}</div>
                                    <div className="text-sm text-slate-600">Pozitivní</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-black text-red-600">{stats.feedbackNegative}</div>
                                    <div className="text-sm text-slate-600">Negativní</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t-2 border-slate-100 p-4 flex justify-between items-center bg-slate-50">
                    <button
                        onClick={refreshStats}
                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-all"
                    >
                        🔄 Obnovit
                    </button>
                    <button
                        onClick={exportData}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all"
                    >
                        📥 Exportovat data
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper components
const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({
    icon,
    label,
    value,
    color,
}) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} rounded-2xl p-4 text-white`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs opacity-90">{label}</div>
            <div className="text-2xl font-black mt-1">{value}</div>
        </div>
    );
};

const ProgressBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({
    label,
    value,
    total,
    color,
}) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    const colors = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="font-bold text-slate-900">{value} ({Math.round(percentage)}%)</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors[color as keyof typeof colors]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

export default AnalyticsDashboard;
