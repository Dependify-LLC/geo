import React, { useState } from 'react';
import { ExternalLink, Star, MapPin, Phone, Globe, Download } from 'lucide-react';

interface Business {
    id: number;
    name: string;
    address?: string;
    rating?: string;
    reviewsCount?: number;
    website?: string;
    phone?: string;
    enrichment: any[];
}

interface ResultsTableProps {
    results: Business[];
    onSelectBusiness: (business: Business) => void;
    onResearchSelected: (businessIds: number[]) => void;
    onDownloadReport: (businessId: number) => void;
}

export function ResultsTable({ results, onSelectBusiness, onResearchSelected, onDownloadReport }: ResultsTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    if (results.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                No results found yet. Start a search to see data.
            </div>
        );
    }

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === results.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(results.map(r => r.id)));
        }
    };

    const handleResearchSelected = () => {
        if (selectedIds.size > 0) {
            onResearchSelected(Array.from(selectedIds));
            setSelectedIds(new Set()); // Clear selection after research
        }
    };

    const getEnrichmentStatus = (business: Business) => {
        if (!business.enrichment || business.enrichment.length === 0) {
            return <span className="px-2 py-1 text-xs rounded bg-gray-600 text-gray-300">Not Enriched</span>;
        }

        const enrichment = business.enrichment[0];
        const status = enrichment.status || 'completed';

        if (status === 'researching') {
            return <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white animate-pulse">Researching...</span>;
        } else if (status === 'completed') {
            return <span className="px-2 py-1 text-xs rounded bg-green-600 text-white">✓ Enriched</span>;
        } else if (status === 'failed') {
            return <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">✗ Failed</span>;
        }
        return <span className="px-2 py-1 text-xs rounded bg-yellow-600 text-white">Pending</span>;
    };

    const isEnriched = (business: Business) => {
        return business.enrichment && business.enrichment.length > 0 && business.enrichment[0].status === 'completed';
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    const selectedEnrichedIds = Array.from(selectedIds).filter(id => {
        const business = results.find(b => b.id === id);
        return business && isEnriched(business);
    });

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-900 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-white font-medium">
                        {selectedIds.size} business{selectedIds.size > 1 ? 'es' : ''} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleResearchSelected}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            🔍 Research Selected ({selectedIds.size})
                        </button>
                        {isAdmin && selectedEnrichedIds.length > 0 && (
                            <button
                                onClick={() => {
                                    onResearchSelected(selectedEnrichedIds);
                                    setSelectedIds(new Set());
                                }}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                            >
                                🔄 Re-research ({selectedEnrichedIds.length})
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Results Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === results.length && results.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Business Name</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Rating</th>
                                <th className="px-6 py-4">Enrichment</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {results.map((business) => (
                                <tr key={business.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(business.id)}
                                            onChange={() => toggleSelect(business.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {business.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                                        <div className="flex items-center gap-2">
                                            {business.address && (
                                                <>
                                                    <MapPin size={14} className="flex-shrink-0" />
                                                    <span>{business.address}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        <div className="space-y-1">
                                            {business.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={14} />
                                                    <span className="text-xs">{business.phone}</span>
                                                </div>
                                            )}
                                            {business.website && (
                                                <div className="flex items-center gap-2">
                                                    <Globe size={14} />
                                                    <a
                                                        href={business.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-400 hover:underline"
                                                    >
                                                        Website
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {business.rating && (
                                            <div className="flex items-center gap-1">
                                                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                <span className="text-slate-200">{business.rating}</span>
                                                {business.reviewsCount && (
                                                    <span className="text-slate-500 text-xs">
                                                        ({business.reviewsCount})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getEnrichmentStatus(business)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onSelectBusiness(business)}
                                                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                                            >
                                                View Details
                                            </button>
                                            {isEnriched(business) && (
                                                <button
                                                    onClick={() => onDownloadReport(business.id)}
                                                    className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors flex items-center gap-1"
                                                    title="Download Report"
                                                >
                                                    <Download size={12} />
                                                    Report
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
