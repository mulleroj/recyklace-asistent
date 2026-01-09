import React, { useState } from 'react';
import { AIProvider, getProviderIcon, getProviderSignupUrl } from '../../../services/aiProviderInterface';

interface ApiKeyPromptProps {
    isOpen: boolean;
    onSave: (apiKey: string, provider: AIProvider) => void;
    onSkip?: () => void;
    errorMessage?: string;
    selectedProvider?: AIProvider;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({
    isOpen,
    onSave,
    onSkip,
    errorMessage,
    selectedProvider
}) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [provider, setProvider] = useState<AIProvider>(
        selectedProvider || AIProvider.GEMINI
    );

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onSave(apiKey.trim(), provider);
        }
    };

    const getProviderInfo = (p: AIProvider) => {
        const info = {
            [AIProvider.GEMINI]: {
                name: 'Google Gemini',
                icon: '🔷',
                badge: 'Doporučeno',
                badgeColor: 'bg-emerald-500',
                description: 'Zdarma, rychlé, spolehlivé',
                url: 'https://aistudio.google.com/app/apikey',
                urlLabel: 'Google AI Studio'
            },
            [AIProvider.OPENAI]: {
                name: 'OpenAI GPT-4',
                icon: '🟢',
                badge: 'Prémiové',
                badgeColor: 'bg-blue-500',
                description: 'Vynikající přesnost, placené',
                url: 'https://platform.openai.com/api-keys',
                urlLabel: 'OpenAI Platform'
            },
            [AIProvider.NONE]: {
                name: '',
                icon: '',
                badge: '',
                badgeColor: '',
                description: '',
                url: '',
                urlLabel: ''
            }
        };
        return info[p];
    };

    const currentProviderInfo = getProviderInfo(provider);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl">🔑</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic">AI Nastavení</h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        Pro pokročilé AI funkce můžete zadat vlastní API klíč
                    </p>
                    <p className="text-xs text-emerald-600 mt-2 font-bold">
                        💡 Aplikace funguje i bez API klíče pomocí offline databáze
                    </p>
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="text-red-700 font-bold text-sm">Problém s API</p>
                                <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Provider selection */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-600 mb-3 uppercase">
                        Vyberte poskytovatele AI
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {[AIProvider.GEMINI, AIProvider.OPENAI].map((p) => {
                            const info = getProviderInfo(p);
                            const isSelected = provider === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setProvider(p)}
                                    className={`relative p-4 rounded-2xl border-3 transition-all ${isSelected
                                        ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="text-3xl mb-2">{info.icon}</div>
                                        <div className="font-black text-sm text-slate-800">{info.name}</div>
                                        <div className={`text-xs font-bold text-white ${info.badgeColor} rounded-full px-2 py-1 mt-2 inline-block`}>
                                            {info.badge}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-2">{info.description}</div>
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2 uppercase">
                            {currentProviderInfo.name} API Klíč
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={provider === AIProvider.OPENAI ? 'sk-...' : 'AIzaSy...'}
                                className="w-full px-4 py-3 pr-12 border-3 border-slate-200 rounded-2xl text-lg font-mono focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!apiKey.trim()}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-lg uppercase rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        Uložit klíč
                    </button>

                    {onSkip && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="w-full py-3 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors"
                        >
                            Pokračovat bez AI
                        </button>
                    )}
                </form>

                {/* Help section */}
                <div className="mt-6 pt-6 border-t-2 border-slate-100">
                    <p className="text-xs text-slate-400 text-center mb-3">
                        Nemáte API klíč? Získejte ho zdarma:
                    </p>
                    <a
                        href={currentProviderInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
                    >
                        <span>🔗</span>
                        {currentProviderInfo.urlLabel}
                        <span className="text-xs">↗</span>
                    </a>
                </div>

                {/* Info */}
                <div className="mt-4 bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs text-slate-500 text-center">
                        <span className="font-bold">🔒 Bezpečné:</span> Klíč je uložen pouze ve vašem zařízení a nikam se neodesílá.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyPrompt;
