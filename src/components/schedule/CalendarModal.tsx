
import React, { useState } from 'react';
import { WASTE_SCHEDULE, getTypeLabel, getTypeColor } from '../../../wasteSchedule';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MONTHS = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    if (!isOpen) return null;

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        // Convert Sunday (0) to 7 for Monday-first calendar
        return day === 0 ? 6 : day - 1;
    };

    const getCollectionForDate = (day: number, month: number, year: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return WASTE_SCHEDULE.find(entry => entry.date === dateStr);
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const collection = getCollectionForDate(day, currentMonth, currentYear);
        const isToday = day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

        days.push(
            <div
                key={day}
                className={`h-12 flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all
                    ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                    ${collection ? 'text-white shadow-md' : 'text-slate-600 bg-white'}
                `}
                style={{
                    backgroundColor: collection ? getColorHex(collection.types[0]) : undefined
                }}
            >
                <span className={isToday ? 'font-black' : ''}>{day}</span>
                {collection && (
                    <span className="text-[8px] uppercase tracking-wider opacity-80">
                        {getTypeLabel(collection.types[0]).substring(0, 4)}
                    </span>
                )}
            </div>
        );
    }

    function getColorHex(type: string): string {
        const colors: Record<string, string> = {
            plast: '#facc15',
            papir: '#2563eb',
            sklo: '#16a34a',
            bio: '#b45309',
            smesny: '#52525b',
        };
        return colors[type] || '#94a3b8';
    }

    // Get upcoming collections for this month
    const monthCollections = WASTE_SCHEDULE.filter(entry => {
        const date = new Date(entry.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-all"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📅</span>
                        <div>
                            <h2 className="text-xl font-black uppercase">Kalendář svozů</h2>
                            <p className="text-emerald-100 text-xs">Obec Povrly</p>
                        </div>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between p-4 border-b-2 border-slate-100">
                    <button
                        onClick={prevMonth}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold transition-all active:scale-95"
                    >
                        ◀
                    </button>
                    <div className="text-center">
                        <h3 className="text-lg font-black text-slate-800">
                            {MONTHS[currentMonth]} {currentYear}
                        </h3>
                        <button
                            onClick={goToToday}
                            className="text-xs text-emerald-600 font-bold hover:underline"
                        >
                            Dnes
                        </button>
                    </div>
                    <button
                        onClick={nextMonth}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-bold transition-all active:scale-95"
                    >
                        ▶
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAY_NAMES.map(day => (
                            <div key={day} className="h-8 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {days}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t-2 border-slate-100">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-3">Legenda</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorHex('plast') }}></div>
                                <span>Plasty</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorHex('papir') }}></div>
                                <span>Papír</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorHex('smesny') }}></div>
                                <span>Směsný</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorHex('bio') }}></div>
                                <span>Bio</span>
                            </div>
                        </div>
                    </div>

                    {/* Month summary */}
                    {monthCollections.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-slate-100">
                            <p className="text-xs font-bold uppercase text-slate-400 mb-2">Svozy tento měsíc: {monthCollections.length}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarModal;
