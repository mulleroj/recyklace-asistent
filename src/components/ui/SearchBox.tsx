import React from 'react';

interface SearchBoxProps {
    query: string;
    setQuery: (query: string) => void;
    onSearch: () => void;
    onVoice: () => void;
    isListening: boolean;
    loading: boolean;
    error: string | null;
}

const SearchBox: React.FC<SearchBoxProps> = ({
    query,
    setQuery,
    onSearch,
    onVoice,
    isListening,
    loading,
    error
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) onSearch();
    };

    return (
        <section className="mb-10">
            <form onSubmit={handleSubmit} className="relative mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Napište název odpadu..."
                    className="w-full h-24 px-8 pr-20 rounded-[35px] border-[8px] border-white bg-white text-2xl font-bold focus:outline-none shadow-2xl focus:border-emerald-300 transition-all"
                />
                <button
                    type="button"
                    onClick={onVoice}
                    className={`absolute right-4 top-4 w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-100 hover:bg-slate-200'}`}
                    aria-label="Hlasové zadání"
                >
                    Mic
                </button>
            </form>

            <button
                onClick={onSearch}
                disabled={loading || !query.trim()}
                className="w-full h-24 text-2xl font-black rounded-[35px] border-b-[12px] bg-emerald-600 border-emerald-900 text-white shadow-xl active:border-b-4 active:translate-y-2 transition-all disabled:opacity-50"
            >
                HLEDAT
            </button>

            {error && <div className="mt-6 p-6 bg-red-100 border-4 border-red-500 rounded-3xl text-red-700 font-bold text-center animate-bounce-short">{error}</div>}
        </section>
    );
};

export default SearchBox;
