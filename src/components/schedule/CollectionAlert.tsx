import React, { useEffect, useState } from 'react';
import {
    getNextCollection,
    getUpcomingCollections,
    getDaysUntil,
    getTypeLabel,
    getTypeColor,
    formatDate,
    ScheduleEntry
} from '../../../wasteSchedule';

interface CollectionAlertProps {
    compact?: boolean;
}

const CollectionAlert: React.FC<CollectionAlertProps> = ({ compact = false }) => {
    const [nextCollection, setNextCollection] = useState<ScheduleEntry | null>(null);
    const [upcomingCollections, setUpcomingCollections] = useState<ScheduleEntry[]>([]);
    const [daysUntil, setDaysUntil] = useState<number>(0);
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        const updateSchedule = () => {
            const next = getNextCollection();
            const upcoming = getUpcomingCollections(3);

            setNextCollection(next);
            setUpcomingCollections(upcoming);

            if (next) {
                const days = getDaysUntil(next.date);
                setDaysUntil(days);

                // Show notification if collection is 2 days away or less
                if (days <= 2 && days >= 0) {
                    setShowNotification(true);

                    // Request browser notification permission and show notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('🗑️ Svoz odpadu', {
                            body: `Za ${days} ${days === 1 ? 'den' : 'dny'}: ${next.types.map(getTypeLabel).join(', ')}`,
                            icon: '/favicon.ico',
                            tag: 'waste-collection'
                        });
                    }
                }
            }
        };

        updateSchedule();

        // Update every hour
        const interval = setInterval(updateSchedule, 60 * 60 * 1000);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, []);

    if (!nextCollection) {
        return null;
    }

    const getUrgencyStyles = () => {
        if (daysUntil <= 0) return 'bg-red-100 border-red-400 text-red-800';
        if (daysUntil <= 2) return 'bg-amber-100 border-amber-400 text-amber-800';
        return 'bg-emerald-50 border-emerald-300 text-emerald-800';
    };

    const getDaysLabel = () => {
        if (daysUntil === 0) return 'DNES!';
        if (daysUntil === 1) return 'ZÍTRA!';
        if (daysUntil === 2) return 'POZÍTŘÍ';
        return `Za ${daysUntil} dní`;
    };

    if (compact) {
        return (
            <div className={`rounded-2xl border-4 p-4 mb-6 ${getUrgencyStyles()}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🚛</span>
                        <div>
                            <p className="font-black uppercase text-sm">{getDaysLabel()}</p>
                            <p className="text-xs font-bold opacity-75">{formatDate(nextCollection.date)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {nextCollection.types.map((type, i) => (
                            <span
                                key={i}
                                className={`${getTypeColor(type)} text-white px-3 py-1 rounded-full text-xs font-black uppercase`}
                            >
                                {getTypeLabel(type)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            {/* Main alert */}
            <div className={`rounded-[30px] border-4 p-6 ${getUrgencyStyles()} ${showNotification ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">🚛</div>
                    <div>
                        <h3 className="font-black uppercase text-xl">{getDaysLabel()}</h3>
                        <p className="font-bold opacity-75">{formatDate(nextCollection.date)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {nextCollection.types.map((type, i) => (
                        <span
                            key={i}
                            className={`${getTypeColor(type)} text-white px-4 py-2 rounded-2xl text-sm font-black uppercase shadow-lg`}
                        >
                            {getTypeLabel(type)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Upcoming collections */}
            {upcomingCollections.length > 1 && (
                <div className="mt-4 px-2">
                    <h4 className="text-sm font-bold uppercase text-slate-400 mb-2">Další svozy</h4>
                    <div className="space-y-2">
                        {upcomingCollections.slice(1).map((entry, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/50 rounded-xl px-4 py-2">
                                <span className="text-sm font-bold text-slate-600">{formatDate(entry.date)}</span>
                                <div className="flex gap-1">
                                    {entry.types.map((type, j) => (
                                        <span
                                            key={j}
                                            className={`${getTypeColor(type)} w-4 h-4 rounded-full`}
                                            title={getTypeLabel(type)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollectionAlert;
