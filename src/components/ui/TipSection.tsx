
import React, { useState, useEffect } from 'react';

const TIPS = [
    "Účtenky z termopapíru nepatří do papíru, protože obsahují BPA.",
    "Z krabic od pizzy odtrhněte mastné části, ty patří do směsného odpadu.",
    "PET lahve vždy sešlápněte, ušetříte tím místo v kontejneru.",
    "Zavařovačky nemusíte vymývat dočista, stačí, když v nich nebudou zbytky jídla.",
    "Ruličky od toaletního papíru už dnes můžete vhazovat do modrého kontejneru.",
    "Staré léky vždy odneste zpět do lékárny, nikdy je nevyhazujte do koše.",
    "Polystyren patří do směsného odpadu, ne do plastu.",
    "Dřevěné špejle a párátka patří do bioodpadu.",
    "Hliníkové obaly od jogurtů patří do plastu (žlutý kontejner).",
    "Plechovky od nápojů sešlápněte a vhoďte do plastu."
];

const TipSection: React.FC = () => {
    const [tipIndex, setTipIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Set random initial tip
        setTipIndex(Math.floor(Math.random() * TIPS.length));
    }, []);

    useEffect(() => {
        // Rotate tips every 10 seconds
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setTipIndex((prev) => (prev + 1) % TIPS.length);
                setIsAnimating(false);
            }, 300);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-emerald-600 text-white p-6 rounded-[35px] shadow-xl mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-80">Tip pro udržitelnost</h4>
            <p className={`text-xl font-bold italic transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
                "{TIPS[tipIndex]}"
            </p>
        </div>
    );
};

export default TipSection;

