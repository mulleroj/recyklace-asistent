
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Hledám..." }) => {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            {/* Animated recycling icon */}
            <div className="relative">
                {/* Outer rotating ring */}
                <div className="w-24 h-24 rounded-full border-4 border-emerald-200 animate-spin"
                    style={{ borderTopColor: '#059669', animationDuration: '1.5s' }}>
                </div>

                {/* Inner pulsing icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-pulse">
                        ♻️
                    </div>
                </div>
            </div>

            {/* Loading message with dots animation */}
            <div className="mt-6 text-center">
                <p className="text-lg font-bold text-slate-600">
                    {message}
                </p>
                <div className="flex justify-center gap-1 mt-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
            </div>

            {/* Fun messages */}
            <p className="text-sm text-slate-400 mt-4 text-center max-w-xs">
                Prohledávám databázi odpadu...
            </p>
        </div>
    );
};

export default LoadingSpinner;
