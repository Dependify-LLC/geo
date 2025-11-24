import React from 'react';

interface SubLocation {
    id: number;
    name: string;
    type: string;
    status: string;
    businessCount: number;
}

interface SubLocationListProps {
    searchId: number;
    sublocations: SubLocation[];
    onDownload: () => void;
    onProceed: () => void;
}

export function SubLocationList({ searchId, sublocations, onDownload, onProceed }: SubLocationListProps) {
    return (
        <div className="sublocation-list">
            <h2>📍 Discovered Sub-Locations</h2>
            <p className="sublocation-count">
                Found {sublocations.length} sub-locations to scrape
            </p>

            <div className="sublocation-actions">
                <button onClick={onDownload} className="download-btn">
                    ⬇️ Download List (CSV)
                </button>
                <button onClick={onProceed} className="proceed-btn">
                    🚀 Proceed to Scraping
                </button>
            </div>

            <div className="sublocation-table-container">
                <table className="sublocation-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Businesses Found</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sublocations.map((sublocation) => (
                            <tr key={sublocation.id}>
                                <td><strong>{sublocation.name}</strong></td>
                                <td>
                                    <span className="type-badge">
                                        {sublocation.type}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge status-${sublocation.status}`}>
                                        {sublocation.status}
                                    </span>
                                </td>
                                <td className="business-count">
                                    {sublocation.businessCount || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
                .sublocation-list {
                    margin: 2rem 0;
                    padding: 1.5rem;
                    background: #f5f5f5;
                    border-radius: 8px;
                }

                .sublocation-list h2 {
                    margin: 0 0 0.5rem 0;
                    color: #333;
                }

                .sublocation-count {
                    color: #666;
                    margin-bottom: 1rem;
                }

                .sublocation-actions {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .download-btn, .proceed-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .download-btn {
                    background: #007bff;
                    color: white;
                }

                .download-btn:hover {
                    background: #0056b3;
                }

                .proceed-btn {
                    background: #28a745;
                    color: white;
                }

                .proceed-btn:hover {
                    background: #218838;
                }

                .sublocation-table-container {
                    overflow-x: auto;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .sublocation-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .sublocation-table th {
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #333;
                    background: #f8f9fa;
                    border-bottom: 2px solid #dee2e6;
                }

                .sublocation-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #dee2e6;
                }

                .sublocation-table tbody tr:hover {
                    background: #f8f9fa;
                }

                .type-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    background: #e3f2fd;
                    color: #1976d2;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    text-transform: capitalize;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-transform: capitalize;
                }

                .status-pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .status-scraping {
                    background: #cfe2ff;
                    color: #084298;
                }

                .status-completed {
                    background: #d1e7dd;
                    color: #0f5132;
                }

                .status-failed {
                    background: #f8d7da;
                    color: #842029;
                }

                .business-count {
                    font-weight: 600;
                    color: #28a745;
                }
            `}</style>
        </div>
    );
}
