
import React, { useState, useMemo } from 'react';
import { 
    Vehicle, City, MaintenanceJob, SparePartMaster, SpareInventory, 
    MaintenanceJobStatus, HealthStatus, VehicleStatus 
} from '../types';
import { 
    BikeIcon, PlusIcon, DocumentChartBarIcon, BoltIcon, 
    ArrowPathIcon, MoneyIcon 
} from './icons';

interface MaintenancePanelProps {
    selectedCityId: number;
    vehicles: Vehicle[];
    cities: City[];
    jobs: MaintenanceJob[];
    partsMaster: SparePartMaster[];
    inventory: SpareInventory[];
    updateVehicleHealth: (id: number, health: HealthStatus) => void;
    updateVehicleStatus: (id: number, status: VehicleStatus) => void;
    createJob: (job: Omit<MaintenanceJob, 'id'>) => Promise<void>;
    updateJobStatus: (id: number, status: MaintenanceJobStatus, notes?: string) => void;
}

// --- UI Sub-components ---

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
    };
    return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${colors[color] || colors.slate}`}>{children}</span>;
};

const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200/60">
        <div className="flex items-center gap-3 mb-4">
            {icon && <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">{icon}</div>}
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

// --- Main Component ---

export const MaintenancePanel: React.FC<MaintenancePanelProps> = ({
    selectedCityId,
    vehicles,
    cities,
    jobs,
    partsMaster,
    inventory,
    createJob,
    updateJobStatus
}) => {
    const [view, setView] = useState<'jobs' | 'inventory' | 'fleet'>('jobs');
    const [showNewJob, setShowNewJob] = useState(false);

    // Filter data for selected city
    const cityVehicles = vehicles.filter(v => v.cityId === selectedCityId);
    const cityJobs = jobs.filter(j => j.cityId === selectedCityId).sort((a,b) => b.id - a.id);
    const cityInventory = inventory.filter(i => i.cityId === selectedCityId);

    // KPIs
    const healthStats = useMemo(() => ({
        good: cityVehicles.filter(v => v.healthStatus === HealthStatus.Good).length,
        attention: cityVehicles.filter(v => v.healthStatus === HealthStatus.Attention).length,
        critical: cityVehicles.filter(v => v.healthStatus === HealthStatus.Critical).length,
    }), [cityVehicles]);

    const activeJobsCount = cityJobs.filter(j => j.status !== MaintenanceJobStatus.Completed && j.status !== MaintenanceJobStatus.Cancelled).length;

    const lowStockAlerts = useMemo(() => {
        return cityInventory.filter(inv => {
            const master = partsMaster.find(p => p.id === inv.partId);
            return master && inv.quantity < master.minStockLevel;
        }).length;
    }, [cityInventory, partsMaster]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
            {/* KPI Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card title="Fleet Health" icon={<DocumentChartBarIcon className="w-5 h-5"/>}>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <p className="text-xl font-bold text-emerald-600">{healthStats.good}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Good</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-amber-500">{healthStats.attention}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Needs Attn.</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-rose-600">{healthStats.critical}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Critical</p>
                        </div>
                    </div>
                </Card>

                <Card title="Active Jobs" icon={<BikeIcon className="w-5 h-5"/>}>
                    <p className="text-2xl font-bold text-slate-900">{activeJobsCount}</p>
                </Card>

                <Card title="Parts Alert" icon={<BoltIcon className="w-5 h-5"/>}>
                    <p className={`text-2xl font-bold ${lowStockAlerts > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {lowStockAlerts} <span className="text-sm font-medium text-slate-400">Low Stock</span>
                    </p>
                </Card>

                <div className="flex items-center justify-center">
                    <button 
                        onClick={() => setShowNewJob(true)}
                        className="w-full h-full bg-brand-500 hover:bg-brand-400 text-slate-900 font-bold rounded-2xl shadow-premium transition-all flex items-center justify-center gap-2 group"
                    >
                        <PlusIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                        Create Job Card
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                {(['jobs', 'inventory', 'fleet'] as const).map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${view === v ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {view === 'jobs' && (
                <div className="bg-white rounded-2xl shadow-premium border border-slate-200/60 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Issue</th>
                                <th className="px-6 py-4">Technician</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cityJobs.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No maintenance jobs in this city.</td></tr>
                            ) : (
                                cityJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-slate-500">#{job.id}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">Bike #{job.vehicleId}</td>
                                        <td className="px-6 py-4">
                                            <Badge color={
                                                job.status === MaintenanceJobStatus.Completed ? 'emerald' :
                                                job.status === MaintenanceJobStatus.InProgress ? 'blue' :
                                                job.status === MaintenanceJobStatus.WaitingParts ? 'amber' : 'slate'
                                            }>{job.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate">{job.issueDescription}</td>
                                        <td className="px-6 py-4">{job.assignedTechnician || 'Unassigned'}</td>
                                        <td className="px-6 py-4 text-right">
                                            {job.status !== MaintenanceJobStatus.Completed && (
                                                <button 
                                                    onClick={() => updateJobStatus(job.id, MaintenanceJobStatus.Completed)}
                                                    className="text-brand-600 font-bold hover:underline"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'inventory' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {partsMaster.map(part => {
                        const inv = cityInventory.find(i => i.partId === part.id);
                        const quantity = inv?.quantity || 0;
                        const isLow = quantity < part.minStockLevel;

                        return (
                            <div key={part.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                {isLow && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black px-3 py-1 uppercase rounded-bl-xl animate-pulse">Low Stock</div>}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{part.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono tracking-widest">{part.sku}</p>
                                    </div>
                                    <Badge color="slate">{part.category}</Badge>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">In Stock</p>
                                        <p className={`text-2xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Threshold</p>
                                        <p className="text-sm font-bold text-slate-600">{part.minStockLevel}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {view === 'fleet' && (
                <div className="bg-white rounded-2xl shadow-premium border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Model</th>
                                <th className="px-6 py-4">Health</th>
                                <th className="px-6 py-4">Rent Status</th>
                                <th className="px-6 py-4 text-right">Last Maint.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cityVehicles.map(v => (
                                <tr key={v.id}>
                                    <td className="px-6 py-4 text-slate-500">#{v.id}</td>
                                    <td className="px-6 py-4 font-bold">{v.modelName}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={
                                            v.healthStatus === HealthStatus.Good ? 'emerald' :
                                            v.healthStatus === HealthStatus.Attention ? 'amber' : 'rose'
                                        }>{v.healthStatus}</Badge>
                                    </td>
                                    <td className="px-6 py-4"><Badge color="slate">{v.status}</Badge></td>
                                    <td className="px-6 py-4 text-right text-slate-400 text-xs">-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Simple Create Job Modal */}
            {showNewJob && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">New Maintenance Job</h2>
                            <button onClick={() => setShowNewJob(false)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Select Vehicle</label>
                                <select id="job-v" className="w-full border p-2 rounded-lg text-sm">
                                    {cityVehicles.map(v => <option key={v.id} value={v.id}>{v.modelName} (#{v.id})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Issue Description</label>
                                <textarea id="job-desc" className="w-full border p-2 rounded-lg text-sm" rows={3} placeholder="Reported problem..."></textarea>
                            </div>
                            <button 
                                onClick={async () => {
                                    const vId = Number((document.getElementById('job-v') as HTMLSelectElement).value);
                                    const desc = (document.getElementById('job-desc') as HTMLTextAreaElement).value;
                                    await createJob({
                                        vehicleId: vId,
                                        cityId: selectedCityId,
                                        status: MaintenanceJobStatus.Open,
                                        priority: 'Medium',
                                        issueDescription: desc,
                                        estimatedCost: 0,
                                        actualCost: 0,
                                        downtimeHours: 0
                                    });
                                    setShowNewJob(false);
                                }}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                                Open Job Card
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
