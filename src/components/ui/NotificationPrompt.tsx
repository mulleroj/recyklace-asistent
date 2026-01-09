import React, { useState, useEffect } from 'react';

interface NotificationPromptProps {
    onClose: () => void;
}

const NotificationPrompt: React.FC<NotificationPromptProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

    useEffect(() => {
        if (!('Notification' in window)) {
            setStatus('unsupported');
        } else if (Notification.permission === 'granted') {
            setStatus('granted');
        } else if (Notification.permission === 'denied') {
            setStatus('denied');
        }
    }, []);

    const handleRequestPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            setStatus(permission as 'granted' | 'denied');

            if (permission === 'granted') {
                // Register for periodic sync if supported
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;

                    // Try to register periodic sync
                    if ('periodicSync' in registration) {
                        try {
                            // @ts-ignore - periodicSync is not in all TypeScript definitions
                            await registration.periodicSync.register('check-waste-collection', {
                                minInterval: 24 * 60 * 60 * 1000, // 24 hours
                            });
                        } catch (e) {
                            console.log('Periodic sync not supported:', e);
                        }
                    }

                    // Trigger immediate check
                    registration.active?.postMessage({ type: 'CHECK_NOTIFICATIONS' });
                }

                // Save preference to localStorage
                localStorage.setItem('notifications_enabled', 'true');

                // Try to show success notification (may not work in all browsers)
                try {
                    new Notification('🚛 Notifikace aktivovány!', {
                        body: 'Budeme vás upozorňovat 2 dny před svozem odpadu.',
                        icon: '/icon-512.png',
                    });
                } catch (e) {
                    console.log('Could not show notification:', e);
                }

                // Close immediately
                onClose();
            } else {
                // Permission denied - also close after a moment
                setTimeout(onClose, 2000);
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            onClose();
        }
    };

    if (status === 'unsupported') {
        return null; // Don't show anything if notifications aren't supported
    }

    if (status === 'granted') {
        return (
            <div className="fixed bottom-4 left-4 right-4 bg-emerald-600 text-white rounded-2xl p-4 shadow-xl z-50 animate-pulse">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <p className="font-bold">Notifikace jsou aktivní!</p>
                </div>
            </div>
        );
    }

    if (status === 'denied') {
        return (
            <div className="fixed bottom-4 left-4 right-4 bg-red-100 border-4 border-red-300 text-red-800 rounded-2xl p-4 shadow-xl z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔕</span>
                        <div>
                            <p className="font-bold">Notifikace jsou zakázány</p>
                            <p className="text-sm opacity-75">Povolte je v nastavení prohlížeče</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-red-600 font-bold">✕</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-2xl z-50">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-white/70 hover:text-white font-bold text-xl"
            >
                ✕
            </button>

            <div className="flex items-start gap-4">
                <div className="text-4xl">🔔</div>
                <div className="flex-1">
                    <h3 className="font-black text-lg mb-1">Zapnout upozornění?</h3>
                    <p className="text-sm opacity-90 mb-4">
                        Budeme vás upozorňovat <strong>2 dny před svozem</strong> odpadu, abyste nezapomněli vynést popelnice.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={handleRequestPermission}
                            className="flex-1 py-3 bg-white text-emerald-700 rounded-xl font-black uppercase text-sm active:scale-95 transition-all shadow-lg"
                        >
                            ✓ Ano, zapnout
                        </button>
                        <button
                            onClick={onClose}
                            className="py-3 px-4 bg-white/20 rounded-xl font-bold text-sm active:scale-95 transition-all"
                        >
                            Ne
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPrompt;
