
import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Listen for manual show event from header button
        const handleManualShow = () => {
            setIsVisible(true);
            localStorage.removeItem('install_prompt_dismissed');
        };

        window.addEventListener('show-install-prompt', handleManualShow);

        // Check if already dismissed
        const dismissed = localStorage.getItem('install_prompt_dismissed');
        if (dismissed) {
            return () => window.removeEventListener('show-install-prompt', handleManualShow);
        }

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return () => window.removeEventListener('show-install-prompt', handleManualShow);
        }

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(isIOSDevice);

        // Listen for the beforeinstallprompt event (Android/Chrome)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Show prompt after delay for all devices (if not already shown via beforeinstallprompt)
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('show-install-prompt', handleManualShow);
            clearTimeout(timer);
        };
    }, []);

    const handleInstall = async () => {
        // If we have the native prompt (Android/Chrome/Edge), use it
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
            }

            setDeferredPrompt(null);
            setIsVisible(false);
            return;
        }

        // Otherwise show platform-specific instructions
        setShowIOSInstructions(true);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setShowIOSInstructions(false);
        localStorage.setItem('install_prompt_dismissed', 'true');
    };

    if (isInstalled || !isVisible) {
        return null;
    }

    // Instructions Modal (for iOS and browsers without native install)
    if (showIOSInstructions) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                <div className="bg-white rounded-t-3xl w-full max-w-lg p-6">
                    <div className="text-center mb-6">
                        <span className="text-5xl">📲</span>
                        <h3 className="text-xl font-black text-slate-800 mt-4">Jak nainstalovat aplikaci</h3>
                    </div>

                    {isIOS ? (
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">1️⃣</span>
                                <p className="text-slate-700">Klepněte na ikonu <strong>sdílení</strong> (□↑) dole</p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">2️⃣</span>
                                <p className="text-slate-700">Vyberte <strong>"Přidat na plochu"</strong></p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">3️⃣</span>
                                <p className="text-slate-700">Potvrďte klepnutím na <strong>"Přidat"</strong></p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">1️⃣</span>
                                <p className="text-slate-700">Klikněte na <strong>menu prohlížeče</strong> (⋮ nebo ⋯)</p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">2️⃣</span>
                                <p className="text-slate-700">Vyberte <strong>"Nainstalovat aplikaci"</strong> nebo <strong>"Přidat na plochu"</strong></p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-2xl">
                                <span className="text-2xl">3️⃣</span>
                                <p className="text-slate-700">Potvrďte instalaci</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleDismiss}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg active:scale-95 transition-all"
                    >
                        Rozumím
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-5 shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0 bg-white/20 rounded-2xl p-3">
                        📲
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
                            Nainstalovat aplikaci
                        </p>
                        <p className="text-white font-semibold text-sm leading-relaxed mb-3">
                            Přidejte si Třídič na plochu pro rychlejší přístup a offline použití.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="flex-1 py-3 bg-white text-purple-700 rounded-xl font-black uppercase text-sm active:scale-95 transition-all shadow-lg"
                            >
                                ✓ Nainstalovat
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="py-3 px-4 bg-white/20 rounded-xl font-bold text-white text-sm active:scale-95 transition-all"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
