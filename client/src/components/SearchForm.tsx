import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchApi } from '../api/client';

interface SearchFormProps {
    onSearchStarted: (id: string, cached?: boolean) => void;
    preFillLocation?: string;
}

export function SearchForm({ onSearchStarted, preFillLocation }: SearchFormProps) {
    const [location, setLocation] = useState('');
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (preFillLocation) {
            setLocation(preFillLocation);
        }
    }, [preFillLocation]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location || !keyword) return;

        setLoading(true);
        try {
            const res = await searchApi.create(location, keyword);
            onSearchStarted(res.data.searchId, res.data.cached);
        } catch (error) {
            console.error(error);
            alert('Failed to start search');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-400" />
                New Intelligence Search
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Location (e.g. Austin, TX)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Keyword (e.g. Software Companies)"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg py-2.5 px-6 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Research'}
                </button>
            </form>
        </div>
    );
}
