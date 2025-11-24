import React from 'react';
import { Layout, Map, FileText, Settings } from 'lucide-react';

interface DashboardProps {
    children: React.ReactNode;
}

export function Dashboard({ children }: DashboardProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Map className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                        GeoMaster
                    </h1>
                </div>

                <nav className="space-y-2 flex-1">
                    <NavItem icon={<Layout />} label="Dashboard" active />
                    <NavItem icon={<FileText />} label="Reports" />
                    <NavItem icon={<Settings />} label="Settings" />
                </nav>

                <div className="text-xs text-slate-500 mt-auto">
                    v1.0.0 • Alpha
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}>
            {React.cloneElement(icon as React.ReactElement, { size: 18 })}
            <span className="font-medium">{label}</span>
        </button>
    );
}
