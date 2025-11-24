import { useState, useEffect } from 'react';
import { locationsApi } from '../api/client';
import { MapPin, ChevronDown, ChevronUp, List, Edit2, Trash2, Plus, X } from 'lucide-react';

interface SavedLocation {
    id: number;
    name: string;
    sublocationCount: number;
    primarySearchId: number | null;
    createdAt: string;
}

interface Sublocation {
    id: number;
    name: string;
    type: string;
}

interface SavedLocationsListProps {
    onLocationSelected?: (locationName: string) => void;
}

export function SavedLocationsList({ onLocationSelected }: SavedLocationsListProps) {
    const [locations, setLocations] = useState<SavedLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [sublocations, setSublocations] = useState<Sublocation[]>([]);

    // Modal states
    const [showEditLocation, setShowEditLocation] = useState(false);
    const [showAddSublocation, setShowAddSublocation] = useState(false);
    const [showEditSublocation, setShowEditSublocation] = useState(false);
    const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
    const [editingSublocation, setEditingSublocation] = useState<Sublocation | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'district' });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await locationsApi.getAll();
            setLocations(res.data);
        } catch (error) {
            console.error('Failed to fetch locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExpand = async (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
            setSublocations([]);
        } else {
            setExpandedId(id);
            try {
                const res = await locationsApi.getSublocations(id);
                setSublocations(res.data.sublocations);
            } catch (error) {
                console.error('Failed to fetch sublocations:', error);
            }
        }
    };

    const handleUpdateLocation = async () => {
        if (!editingLocation) return;
        try {
            await locationsApi.update(editingLocation.id, formData.name);
            fetchLocations();
            setShowEditLocation(false);
        } catch (error) {
            console.error('Failed to update location:', error);
        }
    };

    const handleDeleteLocation = async (id: number) => {
        if (!confirm('Are you sure? This will delete all sub-locations.')) return;
        try {
            await locationsApi.delete(id);
            fetchLocations();
        } catch (error) {
            console.error('Failed to delete location:', error);
        }
    };

    const handleAddSublocation = async () => {
        if (!expandedId) return;
        try {
            await locationsApi.addSublocation(expandedId, formData.name, formData.type);
            handleExpand(expandedId); // Refresh
            setShowAddSublocation(false);
        } catch (error) {
            console.error('Failed to add sublocation:', error);
        }
    };

    const handleUpdateSublocation = async () => {
        if (!editingSublocation || !expandedId) return;
        try {
            await locationsApi.updateSublocation(expandedId, editingSublocation.id, formData.name, formData.type);
            handleExpand(expandedId); // Refresh
            setShowEditSublocation(false);
        } catch (error) {
            console.error('Failed to update sublocation:', error);
        }
    };

    const handleDeleteSublocation = async (subId: number) => {
        if (!confirm('Are you sure?') || !expandedId) return;
        try {
            await locationsApi.deleteSublocation(expandedId, subId);
            handleExpand(expandedId); // Refresh
        } catch (error) {
            console.error('Failed to delete sublocation:', error);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <List className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Saved Locations</h3>
                <span className="text-xs text-gray-400">({locations.length} available)</span>
            </div>

            {loading ? (
                <p className="text-gray-400">Loading...</p>
            ) : locations.length === 0 ? (
                <p className="text-gray-400">No saved locations yet. Discover a location to get started!</p>
            ) : (
                <div className="space-y-2">
                    {locations.map(loc => (
                        <div key={loc.id} className="bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between p-4">
                                <div
                                    className="flex items-center gap-3 cursor-pointer flex-1"
                                    onClick={() => handleExpand(loc.id)}
                                >
                                    <MapPin className="w-4 h-4 text-blue-400" />
                                    <div>
                                        <p className="font-medium text-white">{loc.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {loc.sublocationCount} sub-locations
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onLocationSelected && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onLocationSelected(loc.name);
                                            }}
                                            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                        >
                                            Use This
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingLocation(loc);
                                                    setFormData({ name: loc.name, type: '' });
                                                    setShowEditLocation(true);
                                                }}
                                                className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteLocation(loc.id);
                                                }}
                                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                    {expandedId === loc.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {expandedId === loc.id && (
                                <div className="px-4 pb-4">
                                    <div className="bg-gray-800 rounded p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs text-gray-400">Sub-locations:</p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        setFormData({ name: '', type: 'district' });
                                                        setShowAddSublocation(true);
                                                    }}
                                                    className="text-xs flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                                                >
                                                    <Plus size={12} /> Add
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {sublocations.map((sub) => (
                                                <div key={sub.id} className="flex items-center justify-between text-sm text-gray-300 p-1 hover:bg-gray-700 rounded">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-blue-400">•</span>
                                                        {sub.name}
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSublocation(sub);
                                                                    setFormData({ name: sub.name, type: sub.type });
                                                                    setShowEditSublocation(true);
                                                                }}
                                                                className="p-1 text-blue-400 hover:bg-blue-500/20 rounded"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSublocation(sub.id)}
                                                                className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Location Modal */}
            {showEditLocation && editingLocation && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Location</h3>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowEditLocation(false)} className="px-4 py-2 text-gray-300">Cancel</button>
                            <button onClick={handleUpdateLocation} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Sublocation Modal */}
            {showAddSublocation && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Add Sub-location</h3>
                        <input
                            type="text"
                            placeholder="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-3"
                        />
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4"
                        >
                            <option value="district">District</option>
                            <option value="neighborhood">Neighborhood</option>
                            <option value="area">Area</option>
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowAddSublocation(false)} className="px-4 py-2 text-gray-300">Cancel</button>
                            <button onClick={handleAddSublocation} className="px-4 py-2 bg-green-600 text-white rounded">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Sublocation Modal */}
            {showEditSublocation && editingSublocation && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Sub-location</h3>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-3"
                        />
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4"
                        >
                            <option value="district">District</option>
                            <option value="neighborhood">Neighborhood</option>
                            <option value="area">Area</option>
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowEditSublocation(false)} className="px-4 py-2 text-gray-300">Cancel</button>
                            <button onClick={handleUpdateSublocation} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
