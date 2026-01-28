import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });

        // Log to analytics if available
        try {
            const analytics = (window as any).analytics;
            if (analytics && analytics.track) {
                analytics.track('APP_CRASH', {
                    error: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                });
            }
        } catch (e) {
            console.error('Failed to log error to analytics', e);
        }
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        window.location.href = '/';
    };

    private handleClearData = async (): Promise<void> => {
        if (confirm('Vymazat všechna data a restartovat aplikaci?')) {
            try {
                // Clear localStorage
                localStorage.clear();

                // Clear service worker cache
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }

                // Unregister service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                }

                window.location.href = '/';
            } catch (e) {
                console.error('Failed to clear data', e);
                alert('Chyba při mazání dat. Zkuste přejít na /reset.html');
            }
        }
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                        <div className="text-center">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h1 className="text-2xl font-black text-red-600 mb-2">
                                Aplikace narazila na chybu
                            </h1>
                            <p className="text-slate-600">
                                Omlouváme se za potíže. Zkuste aplikaci restartovat.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="bg-red-50 rounded-xl p-4 text-xs">
                                <summary className="font-bold text-red-700 cursor-pointer mb-2">
                                    Detaily chyby (vývojářský režim)
                                </summary>
                                <div className="space-y-2 text-red-900 font-mono">
                                    <div>
                                        <strong>Chyba:</strong> {this.state.error.message}
                                    </div>
                                    {this.state.error.stack && (
                                        <div>
                                            <strong>Stack trace:</strong>
                                            <pre className="whitespace-pre-wrap text-xs mt-1 bg-white p-2 rounded">
                                                {this.state.error.stack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-lg"
                            >
                                🔄 Restartovat aplikaci
                            </button>

                            <button
                                onClick={this.handleClearData}
                                className="w-full py-4 bg-red-100 text-red-700 rounded-2xl font-bold hover:bg-red-200 active:scale-95 transition-all border-2 border-red-300"
                            >
                                🗑️ Vymazat data a restartovat
                            </button>

                            <a
                                href="/reset.html"
                                className="block w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-center hover:bg-slate-200 active:scale-95 transition-all"
                            >
                                🔧 Otevřít pokročilý reset
                            </a>
                        </div>

                        <div className="text-center text-xs text-slate-500">
                            Pokud problém přetrvává, zkuste aplikaci odinstalovat a nainstalovat znovu.
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
