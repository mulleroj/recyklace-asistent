import React from 'react';
import { WasteCategory } from '../../../types';
import { getCategoryIcon } from '../../../components/CategoryBadge';

const getCategoryBorderColor = (category: string) => {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('plast')) return 'border-yellow-400';
    if (lowerCat.includes('papír')) return 'border-blue-600';
    if (lowerCat.includes('sklo')) return 'border-green-700';
    if (lowerCat.includes('bio')) return 'border-amber-900';
    if (lowerCat.includes('kovy')) return 'border-gray-500';
    if (lowerCat.includes('směsný')) return 'border-zinc-800';
    return 'border-slate-300';
};

const RecyclingGuide: React.FC = () => {
    const categories = [
        { category: WasteCategory.PLAST, description: 'Plastové lahve, kelímky, fólie, Tetrapaky.' },
        { category: WasteCategory.PAPIR, description: 'Noviny, časopisy, krabice, kancelářský papír.' },
        { category: WasteCategory.SKLO, description: 'Lahve od nápojů, zavařovačky, tabulové sklo.' },
        { category: WasteCategory.BIO, description: 'Zbytky ovoce, zeleniny, kávová sedlina, listí.' },
        { category: WasteCategory.KOVY, description: 'Plechovky, konzervy, kovová víčka.' },
        { category: WasteCategory.SMESNY, description: 'Znečištěný papír, hygienické potřeby, keramika.' },
    ];

    return (
        <section className="mt-12 mb-10">
            <h3 className="text-2xl font-black uppercase italic text-slate-500 px-6 mb-6">Průvodce tříděním</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((item) => {
                    const borderColor = getCategoryBorderColor(item.category);
                    return (
                        <div key={item.category} className={`bg-white p-6 rounded-3xl shadow-lg border-l-[12px] ${borderColor}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl w-8 h-8">{getCategoryIcon(item.category)}</span>
                                <span className="font-black uppercase italic text-slate-800">{item.category}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-500">{item.description}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default RecyclingGuide;
