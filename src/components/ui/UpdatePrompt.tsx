import React from 'react';

interface UpdatePromptProps {
    onUpdate: () => void;
    onDismiss: () => void;
}

const UpdatePrompt: React.FC<UpdatePromptProps> = ({ onUpdate, onDismiss }) => {
    return (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
            <div className="max-w-md mx-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">🎉</div>
                    <div className="flex-1">
                        <h3 className="font-black text-lg mb-1">
                            Nová verze k dispozici!
                        </h3>
                        <p className="text-emerald-50 text-sm mb-4">
                            Aktualizujte aplikaci pro nejlepší zážitek a nové funkce.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onUpdate}
                                className="flex-1 bg-white text-emerald-600 font-bold py-3 px-4 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-lg"
                            >
                                Aktualizovat nyní
                            </button>
                            <button
                                onClick={onDismiss}
                                className="px-4 py-3 bg-emerald-600/30 text-white font-bold rounded-xl hover:bg-emerald-600/50 active:scale-95 transition-all"
                            >
                                Později
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatePrompt;
