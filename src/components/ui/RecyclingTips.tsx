
import React, { useState, useEffect } from 'react';

const RECYCLING_TIPS = [
    {
        icon: "💡",
        tip: "Plastové lahve sešlápněte a zavíčkujte – šetříte místo v kontejneru.",
        category: "plast"
    },
    {
        icon: "📦",
        tip: "Krabice od pizzy s mastnotou patří do směsného odpadu, ne do papíru.",
        category: "papir"
    },
    {
        icon: "🥤",
        tip: "Kelímky od jogurtů stačí vymáchnout, nemusí být dokonale čisté.",
        category: "plast"
    },
    {
        icon: "🍾",
        tip: "Skleněné obaly třiďte podle barvy jen u zvonů s rozdělenými otvory.",
        category: "sklo"
    },
    {
        icon: "🔋",
        tip: "Baterie nikdy nevyhazujte do koše – odevzdejte je v obchodě nebo sběrném dvoře.",
        category: "nebezpecny"
    },
    {
        icon: "📱",
        tip: "Starý telefon obsahuje vzácné kovy – odevzdejte ho k recyklaci.",
        category: "elektro"
    },
    {
        icon: "🥚",
        tip: "Vaječné skořápky patří do bioodpadu nebo na kompost.",
        category: "bio"
    },
    {
        icon: "💊",
        tip: "Prošlé léky odevzdejte v lékárně – nikdy je nevyhazujte do odpadu.",
        category: "nebezpecny"
    },
    {
        icon: "🧴",
        tip: "Prázdné spreje od deodorantů patří do plastu, ne do směsného.",
        category: "plast"
    },
    {
        icon: "☕",
        tip: "Kávová sedlina je skvělé hnojivo pro pokojovky.",
        category: "bio"
    },
    {
        icon: "👕",
        tip: "Staré oblečení darujte do kontejnerů na textil, ne do směsného.",
        category: "textil"
    },
    {
        icon: "🪥",
        tip: "Zubní kartáčky patří bohužel do směsného odpadu.",
        category: "smesny"
    },
    {
        icon: "🎄",
        tip: "Vánoční stromek bez ozdob patří do bioodpadu.",
        category: "bio"
    },
    {
        icon: "💳",
        tip: "Platební karty rozstříhejte a vyhoďte do směsného odpadu.",
        category: "smesny"
    },
    {
        icon: "🧃",
        tip: "Nápojové kartony (Tetra Pak) patří do plastu, ne do papíru!",
        category: "plast"
    }
];

const RecyclingTips: React.FC = () => {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Rotate tips every 8 seconds
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentTipIndex((prev) => (prev + 1) % RECYCLING_TIPS.length);
                setIsAnimating(false);
            }, 300);
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    const currentTip = RECYCLING_TIPS[currentTipIndex];

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            plast: 'from-yellow-400 to-orange-400',
            papir: 'from-blue-400 to-blue-600',
            sklo: 'from-green-400 to-green-600',
            bio: 'from-amber-500 to-amber-700',
            smesny: 'from-zinc-400 to-zinc-600',
            nebezpecny: 'from-red-400 to-red-600',
            elektro: 'from-purple-400 to-purple-600',
            textil: 'from-pink-400 to-pink-600',
        };
        return colors[category] || 'from-emerald-400 to-emerald-600';
    };

    return (
        <div className="mb-6">
            <div
                className={`bg-gradient-to-r ${getCategoryColor(currentTip.category)} rounded-3xl p-5 shadow-lg transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}
            >
                <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0 bg-white/20 rounded-2xl p-3">
                        {currentTip.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
                            💡 Tip na recyklaci
                        </p>
                        <p className="text-white font-semibold text-sm leading-relaxed">
                            {currentTip.tip}
                        </p>
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-1 mt-4">
                    {RECYCLING_TIPS.map((_, index) => (
                        <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentTipIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RecyclingTips;
