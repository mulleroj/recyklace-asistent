import React, { useState, useEffect } from 'react';

interface NotificationSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NotificationPrefs {
    enabled: boolean;
    daysBefore: number; // 0 = v den svozu, 1 = den předem, 2 = 2 dny předem
    time: string; // HH:MM formát
    soundEnabled: boolean; // Zvuková notifikace
}

const DEFAULT_PREFS: NotificationPrefs = {
    enabled: false,
    daysBefore: 2,
    time: '10:00',
    soundEnabled: true
};

const STORAGE_KEY = 'waste_notification_prefs';

export const getNotificationPrefs = (): NotificationPrefs => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
        return DEFAULT_PREFS;
    }
};

export const saveNotificationPrefs = (prefs: NotificationPrefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    // Komunikace se Service Workerem
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_NOTIFICATION_PREFS',
            prefs
        });
    }
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
    const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [testSent, setTestSent] = useState(false);
    const [testError, setTestError] = useState<string>('');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        setDebugLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${message}`]);
        console.log(message);
    };

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const handleRequestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission === 'granted') {
                setPrefs(prev => ({ ...prev, enabled: true }));
            }
        }
    };

    const handleSave = () => {
        saveNotificationPrefs(prefs);
        onClose();
    };

    const handleTestNotification = async () => {
        setDebugLogs([]); // Clear previous logs
        addLog('🔔 Kliknutí na testovací tlačítko');
        setTestError('');
        setTestSent(false);

        if (permissionStatus !== 'granted') {
            addLog('❌ Oprávnění NEuděleno: ' + permissionStatus);
            setTestError('Nejsou povoleny notifikace');
            return;
        }

        addLog('✅ Oprávnění uděleno');

        try {
            // Check if Service Worker is available
            if (!('serviceWorker' in navigator)) {
                addLog('❌ Service Worker není podporován');
                setTestError('Prohlížeč nepodporuje notifikace');
                return;
            }

            // Check current registration status
            const currentReg = await navigator.serviceWorker.getRegistration();
            addLog('🔍 Hledám Service Worker registraci...');

            if (!currentReg) {
                addLog('❌ Service Worker není zaregistrován!');
                addLog('💡 Zkuste restartovat aplikaci');
                setTestError('Service Worker není zaregistrován. Restartujte aplikaci.');
                return;
            }

            addLog('✅ Registrace nalezena: ' + currentReg.scope);

            // Check if SW is active
            if (!currentReg.active && !currentReg.waiting && !currentReg.installing) {
                addLog('❌ Service Worker není aktivní');
                setTestError('Service Worker není aktivní. Restartujte aplikaci.');
                return;
            }

            addLog(`SW Stav: ${currentReg.active ? '✅ Active' : currentReg.waiting ? '⏸️ Waiting' : '⏳ Installing'}`);
            addLog('🔍 Čekám na Service Worker...');

            // Try to get Service Worker with longer timeout (15 seconds)
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Service Worker timeout po 15s')), 15000)
            );

            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                timeoutPromise
            ]) as ServiceWorkerRegistration;

            addLog('✅ Service Worker připraven');
            addLog('📤 Odesílám notifikaci...');

            await registration.showNotification('🚛 Testovací upozornění', {
                body: 'Takhle bude vypadat upozornění na svoz odpadu!',
                icon: '/icon-512.png',
                badge: '/icon-512.png',
                tag: 'test-notification',
                requireInteraction: false,
                silent: false
            });

            addLog('✅ Notifikace úspěšně odeslána!');
            setTestSent(true);
            setTimeout(() => setTestSent(false), 3000);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Neznámá chyba';
            addLog('❌ CHYBA: ' + errorMsg);

            if (errorMsg.includes('timeout')) {
                setTestError('Service Worker je nedostupný. Zkuste restartovat aplikaci.');
            } else {
                setTestError(`Chyba: ${errorMsg}`);
            }
        }
    };

    const getDaysLabel = (days: number) => {
        if (days === 0) return 'V den svozu (ráno)';
        if (days === 1) return '1 den předem';
        return `${days} dny předem`;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                // Close when clicking outside the modal
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto relative">
                {/* Floating close button - always visible */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-10 h-10 bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-all active:scale-95"
                    aria-label="Zavřít"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 pr-14 text-white">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔔</span>
                        <h2 className="text-xl font-black">Nastavení upozornění</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Permission status */}
                    {permissionStatus !== 'granted' && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                            <p className="text-amber-800 text-sm mb-3">
                                {permissionStatus === 'denied'
                                    ? '⚠️ Notifikace jsou zakázány v prohlížeči. Povolte je v nastavení.'
                                    : '📱 Pro upozornění je potřeba povolit notifikace.'}
                            </p>
                            {permissionStatus === 'default' && (
                                <button
                                    onClick={handleRequestPermission}
                                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold active:scale-95 transition-all"
                                >
                                    Povolit notifikace
                                </button>
                            )}
                        </div>
                    )}

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800">Upozornění aktivní</p>
                            <p className="text-sm text-slate-500">Dostanete připomínku před svozem</p>
                        </div>
                        <button
                            onClick={() => setPrefs(prev => ({ ...prev, enabled: !prev.enabled }))}
                            disabled={permissionStatus !== 'granted'}
                            aria-label="Zapnout/vypnout upozornění"
                            className={`w-14 h-8 rounded-full transition-all relative ${prefs.enabled && permissionStatus === 'granted'
                                ? 'bg-emerald-500'
                                : 'bg-slate-300'
                                } ${permissionStatus !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${prefs.enabled && permissionStatus === 'granted' ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {/* Days before */}
                    <div>
                        <p className="font-bold text-slate-800 mb-3">Kdy upozornit</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[2, 1, 0].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setPrefs(prev => ({ ...prev, daysBefore: days }))}
                                    disabled={!prefs.enabled}
                                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${prefs.daysBefore === days
                                        ? 'bg-emerald-500 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        } ${!prefs.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {getDaysLabel(days)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time picker */}
                    <div>
                        <p className="font-bold text-slate-800 mb-3">V kolik hodin</p>
                        <div className="grid grid-cols-4 gap-2">
                            {['08:00', '10:00', '18:00', '20:00'].map(time => (
                                <button
                                    key={time}
                                    onClick={() => setPrefs(prev => ({ ...prev, time }))}
                                    disabled={!prefs.enabled}
                                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${prefs.time === time
                                        ? 'bg-emerald-500 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        } ${!prefs.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sound toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800">🔊 Zvukové upozornění</p>
                            <p className="text-sm text-slate-500">Přehraje zvuk při notifikaci</p>
                        </div>
                        <button
                            onClick={() => setPrefs(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                            disabled={!prefs.enabled}
                            aria-label="Zapnout/vypnout zvuk"
                            className={`w-14 h-8 rounded-full transition-all relative ${prefs.soundEnabled && prefs.enabled
                                ? 'bg-emerald-500'
                                : 'bg-slate-300'
                                } ${!prefs.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${prefs.soundEnabled && prefs.enabled ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {/* Test notification */}
                    {permissionStatus === 'granted' && (
                        <div className="space-y-3">
                            <button
                                onClick={handleTestNotification}
                                className={`w-full py-3 border-2 border-dashed rounded-xl font-bold transition-all ${testSent
                                    ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                                    : 'border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'
                                    }`}
                            >
                                {testSent ? '✓ Odesláno!' : '🔔 Otestovat upozornění'}
                            </button>
                            {testError && (
                                <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                                    ⚠️ {testError}
                                </p>
                            )}

                            {/* Debug log panel for mobile */}
                            {debugLogs.length > 0 && (
                                <div className="bg-slate-800 text-slate-100 rounded-lg p-3 text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                                    <div className="text-slate-400 font-bold mb-1">📋 Debug logy:</div>
                                    {debugLogs.map((log, i) => (
                                        <div key={i} className="text-slate-200">{log}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {prefs.enabled && permissionStatus === 'granted' && (
                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                            <p className="text-emerald-800 text-sm">
                                ✓ Budete upozorněni <strong>{getDaysLabel(prefs.daysBefore).toLowerCase()}</strong> v <strong>{prefs.time}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-lg"
                    >
                        Uložit nastavení
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
