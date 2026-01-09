
import React from 'react';

interface CategoryBadgeProps {
  category: string;
  variant?: 'full' | 'minimal' | 'hero';
}

export const getCategoryIcon = (category: string) => {
  const lowerCat = category.toLowerCase();
  
  if (lowerCat.includes('plast')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  } else if (lowerCat.includes('papír')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 4h6m2-10V4" />
      </svg>
    );
  } else if (lowerCat.includes('sklo')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m0-20L8 6m4-4l4 4M6 10v10a2 2 0 002 2h8a2 2 0 002-2V10M6 10l2-2h8l2 2" />
      </svg>
    );
  } else if (lowerCat.includes('bio')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20v-8m0 0l-3 3m3-3l3 3" />
      </svg>
    );
  } else if (lowerCat.includes('směsný')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    );
  } else if (lowerCat.includes('sběrný dvůr')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 011 1v2a1 1 0 01-1 1h-1m-4-14h5l4 4v8h-1M13 10h4" />
      </svg>
    );
  } else if (lowerCat.includes('kovy')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  } else if (lowerCat.includes('oleje')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1a5.192 5.192 0 000 7.364l1 1m-8-8L7 5a5.192 5.192 0 010 7.364l-1 1" />
      </svg>
    );
  } else if (lowerCat.includes('textil')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4V2m0 2c-3 0-5 2-5 5v1l-3 3v2h16v-2l-3-3V9c0-3-2-5-5-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17h10M10 20h4" />
      </svg>
    );
  } else if (lowerCat.includes('lékárna')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export const getCategoryStyles = (category: string) => {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('plast')) return 'bg-yellow-400 text-yellow-950 border-yellow-600';
  if (lowerCat.includes('papír')) return 'bg-blue-600 text-white border-blue-800';
  if (lowerCat.includes('sklo')) return 'bg-green-700 text-white border-green-900';
  if (lowerCat.includes('bio')) return 'bg-amber-900 text-amber-50 border-amber-950';
  if (lowerCat.includes('směsný')) return 'bg-zinc-800 text-zinc-50 border-zinc-950';
  if (lowerCat.includes('sběrný dvůr')) return 'bg-red-600 text-white border-red-800';
  if (lowerCat.includes('kovy')) return 'bg-gray-500 text-white border-gray-700';
  if (lowerCat.includes('oleje')) return 'bg-orange-600 text-white border-orange-800';
  if (lowerCat.includes('textil')) return 'bg-purple-600 text-white border-purple-800';
  if (lowerCat.includes('lékárna')) return 'bg-emerald-600 text-white border-emerald-800';
  return 'bg-slate-300 text-slate-800 border-slate-400';
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, variant = 'full' }) => {
  const styles = getCategoryStyles(category);
  const icon = getCategoryIcon(category);

  if (variant === 'hero') {
    return (
      <div className={`w-full p-8 rounded-[40px] border-4 text-center ${styles} shadow-2xl flex flex-col items-center gap-6 animate-bounce-short`}>
        <div className="w-24 h-24 drop-shadow-lg">{icon}</div>
        <span className="text-3xl font-black uppercase tracking-tighter italic">{category}</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 p-2 rounded-2xl shadow-md border-2 ${styles}`}>
          {icon}
        </div>
        <span className="text-xl font-black text-slate-800 uppercase tracking-tight">{category}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-lg font-bold border-b-4 shadow-md ${styles} uppercase tracking-wider`}>
      <div className="w-6 h-6">{icon}</div>
      {category}
    </span>
  );
};

export default CategoryBadge;
