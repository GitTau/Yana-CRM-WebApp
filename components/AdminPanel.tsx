
import React, { useState, useMemo } from 'react';
import { Rate, Vehicle, User, City, VehicleStatus, UserRole, Booking, BookingStatus, Battery, BatteryStatus, RefundRequest, Customer } from '../types';
import { PlusIcon, UserGroupIcon, BikeIcon, MoneyIcon, DocumentChartBarIcon, BoltIcon, UserIcon, ArrowPathIcon, DownloadIcon, ChartBarIcon } from './icons';

type AdminSection = 'dashboard' | 'bookings' | 'inventory' | 'batteries' | 'rates' | 'users' | 'customers' | 'cities';

interface AdminPanelProps {
    rates: Rate[];
    vehicles: Vehicle[];
    users: User[];
    cities: City[];
    customers: Customer[];
    bookings: Booking[];
    batteries: Battery[];
    refundRequests: RefundRequest[];
    addCustomer: (c: any) => void;
    updateCustomer: (c: any) => void;
    deleteCustomer: (id: number) => void;
    bulkImportCustomers: (data: any[]) => void;
    addVehicle: (v: any) => void;
    updateVehicle: (v: any) => void;
    deleteVehicle: (id: number) => void;
    bulkImportVehicles: (data: any[]) => void;
    addBattery: (b: any) => void;
    updateBattery: (b: any) => void;
    deleteBattery: (id: number) => void;
    bulkImportBatteries: (data: any[]) => void;
    addRate: (r: any) => void;
    updateRate: (r: any) => void;
    deleteRate: (id: number) => void;
    bulkImportRates: (data: any[]) => void;
    addUser: (u: any) => void;
    deleteUser: (id: number) => void;
    addCity: (name: string, addr?: string) => void;
    updateCity: (id: number, name: string, addr?: string) => void;
    processRefundRequest: (id: number) => void;
    settleBookingDue: (id: number) => void;
    importLegacyData: (data: any[]) => Promise<void>;
    updateBooking: (b: Booking) => Promise<void>;
    deleteBooking: (id: number) => Promise<void>;
}

// Helpers
const matchEnum = <T extends string>(value: string, enumObj: Record<string, T>, defaultValue: T): T => {
    if (!value) return defaultValue;
    const normalized = value.trim().toLowerCase();
    const found = Object.values(enumObj).find(v => v.toLowerCase() === normalized);
    return found || defaultValue;
};

// Helper to format date as DD-MM-YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    // Handle YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    // Fallback for ISO strings
    try {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateStr;
    }
};

const downloadCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};

// --- Reusable UI Components ---

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-8">
                {children}
            </div>
        </div>
    </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ variant = 'primary', className, ...props }) => {
    const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
    const variants = {
        primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
        secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm",
        danger: "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100",
        ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all" {...props} />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select className="block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all" {...props} />
);

const TableHeader: React.FC<{ headers: string[] }> = ({ headers }) => (
    <thead className="bg-slate-50/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
        <tr>
            {headers.map(h => <th key={h} className="px-6 py-4 text-left border-b border-slate-100">{h}</th>)}
        </tr>
    </thead>
);

const Badge: React.FC<{ color: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'brand'; children: React.ReactNode }> = ({ color, children }) => {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
        amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
        rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
        slate: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/20',
        brand: 'bg-brand-50 text-brand-800 ring-1 ring-brand-600/20',
    };
    return <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${colors[color]}`}>{children}</span>;
};

// --- Dashboard Component ---

const RevenueChart: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
    const dataPoints = useMemo(() => {
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        
        return last7Days.map(date => {
            const dailyTotal = bookings
                .filter(b => b.startDate === date)
                .reduce((sum, b) => sum + (b.totalRent || 0), 0);
            return { date, value: dailyTotal };
        });
    }, [bookings]);

    const maxVal = Math.max(...dataPoints.map(d => d.value), 100);
    const points = dataPoints.map((d, i) => {
        const x = (i / (dataPoints.length - 1)) * 100;
        const y = 100 - ((d.value / maxVal) * 80); // Keep some headroom
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-48 w-full flex flex-col justify-end relative overflow-hidden">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#00EAFF" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#00EAFF" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                <path d={`M0,100 ${points} 100,100 Z`} fill="url(#chartGradient)" />
                <polyline fill="none" stroke="#00EAFF" strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-bold uppercase">
                {dataPoints.map(d => <span key={d.date}>{formatDate(d.date).slice(0, 5)}</span>)}
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ bookings: Booking[], vehicles: Vehicle[], customers: Customer[] }> = ({ bookings, vehicles, customers }) => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            if (!dateRange.start && !dateRange.end) return true;
            if (dateRange.start && b.startDate < dateRange.start) return false;
            if (dateRange.end && b.startDate > dateRange.end) return false;
            return true;
        });
    }, [bookings, dateRange]);

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.amountCollected || 0), 0);
    const activeRentals = filteredBookings.filter(b => b.status === BookingStatus.Active).length;
    const utilization = Math.round((activeRentals / (vehicles.length || 1)) * 100);
    const pendingDues = filteredBookings.reduce((sum, b) => sum + Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - (b.amountCollected || 0)), 0);

    const vehicleStatus = {
        available: vehicles.filter(v => v.status === VehicleStatus.Available).length,
        rented: vehicles.filter(v => v.status === VehicleStatus.Rented).length,
        maintenance: vehicles.filter(v => v.status === VehicleStatus.Maintenance).length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 hidden sm:block">Dashboard Overview</h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold uppercase text-slate-400 whitespace-nowrap">Filter Date:</span>
                    <Input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-auto py-1 flex-1 sm:flex-none" />
                    <span className="text-slate-400">-</span>
                    <Input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-auto py-1 flex-1 sm:flex-none" />
                    {(dateRange.start || dateRange.end) && (
                        <button onClick={() => setDateRange({ start: '', end: '' })} className="text-xs font-bold text-rose-500 hover:underline">Clear</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { title: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'brand', icon: <MoneyIcon className="w-5 h-5"/> },
                    { title: 'Utilization', value: `${utilization}%`, color: 'blue', icon: <ChartBarIcon className="w-5 h-5"/> },
                    { title: 'Active Rentals', value: activeRentals, color: 'emerald', icon: <BikeIcon className="w-5 h-5"/> },
                    { title: 'Pending Dues', value: `₹${pendingDues.toLocaleString()}`, color: 'rose', icon: <MoneyIcon className="w-5 h-5"/> },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                             <div className={`p-1.5 sm:p-2 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>{stat.icon}</div>
                             <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{stat.title}</span>
                        </div>
                        <p className="text-lg sm:text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>
            {/* Charts and Tables */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900">Revenue Trend (Selected Period)</h3>
                    </div>
                    <RevenueChart bookings={filteredBookings} />
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Fleet Composition</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Rented', value: vehicleStatus.rented, color: 'bg-brand-500' },
                            { label: 'Available', value: vehicleStatus.available, color: 'bg-emerald-500' },
                            { label: 'Maintenance', value: vehicleStatus.maintenance, color: 'bg-rose-500' },
                        ].map(s => (
                            <div key={s.label}>
                                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                    <span>{s.label}</span>
                                    <span>{s.value}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${s.color}`} style={{ width: `${(s.value / vehicles.length) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Modals ---

const ImportLegacyDataModal: React.FC<{ onClose: () => void; onImport: (data: any[]) => Promise<void> }> = ({ onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const parseLegacyDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        const trimmed = dateStr.trim();
        const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        // Standardize headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const getIdx = (keyPart: string) => headers.findIndex(h => h.includes(keyPart));
        
        const idxMap = {
            customerName: getIdx('customer name'),
            vehicleId: getIdx('vehicleid'),
            batteryId: getIdx('batteryid'),
            cityId: getIdx('city id'),
            startDate: getIdx('start date'),
            endDate: getIdx('end date'),
            status: getIdx('status'),
            
            // Financials - Strict Matching based on user prompt
            totalRent: getIdx('total rent'), // Matches 'Total Rent'
            // The catch-all 'collected' might not be needed if we have online/cash specifics, but useful as fallback
            rentCollectedFallback: getIdx('total rent collected'), 
            
            rentOnline: getIdx('total rent collected online'),
            rentCash: getIdx('total rent collected cash'),
            
            securityCollected: getIdx('total security collected'),
            fines: getIdx('fines'),
        };

        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
            if (row.length < 5) continue; 
            
            const customerName = idxMap.customerName > -1 ? row[idxMap.customerName] : '';
            // Generate a dummy phone based on row index since it's missing in headers but required by DB
            const customerPhone = `000000000${i}`; 
            
            // Financials Parsing
            const rentTotal = idxMap.totalRent > -1 ? Number(row[idxMap.totalRent]) : 0;
            const rentOnline = idxMap.rentOnline > -1 ? Number(row[idxMap.rentOnline]) : 0;
            const rentCash = idxMap.rentCash > -1 ? Number(row[idxMap.rentCash]) : 0;
            
            // Calculate Total Collected
            // If Online + Cash > 0, use that. Otherwise, try the fallback column.
            let amountCollected = 0;
            if ((rentOnline + rentCash) > 0) {
                amountCollected = rentOnline + rentCash;
            } else if (idxMap.rentCollectedFallback > -1) {
                amountCollected = Number(row[idxMap.rentCollectedFallback]);
            }
            
            const securityDeposit = idxMap.securityCollected > -1 ? Number(row[idxMap.securityCollected]) : 0;
            const fineAmount = idxMap.fines > -1 ? Number(row[idxMap.fines]) : 0;

            result.push({
                customerName, 
                customerPhone,
                vehicleId: idxMap.vehicleId > -1 ? Number(row[idxMap.vehicleId]) : null,
                batteryId: idxMap.batteryId > -1 ? Number(row[idxMap.batteryId]) : null,
                cityId: idxMap.cityId > -1 ? Number(row[idxMap.cityId]) : 1,
                startDate: parseLegacyDate(idxMap.startDate > -1 ? row[idxMap.startDate] : ''),
                endDate: parseLegacyDate(idxMap.endDate > -1 ? row[idxMap.endDate] : ''),
                status: idxMap.status > -1 ? row[idxMap.status] : 'completed - settled',
                totalRent: rentTotal,
                amountCollected: amountCollected,
                securityDeposit: securityDeposit,
                fineAmount: fineAmount
            });
        }
        return result;
    };

    const handleSubmit = async () => {
        if (!file) { setError("Please select a CSV file."); return; }
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const parsedData = parseCSV(text);
                if (parsedData.length === 0) throw new Error("No valid data found.");
                await onImport(parsedData);
                onClose();
            } catch (err: any) { setError("Error parsing CSV: " + err.message); } finally { setIsProcessing(false); }
        };
        reader.readAsText(file);
    };

    return (
        <Modal title="Import Legacy Data" onClose={onClose}>
            <div className="space-y-6">
                 <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl text-sm text-brand-900 flex gap-3">
                    <div className="p-2 bg-brand-100 rounded-lg h-fit"><DocumentChartBarIcon className="w-5 h-5"/></div>
                    <div>
                        <p className="font-bold mb-1">Instructions</p>
                        <p className="opacity-80">Ensure CSV headers match: Customer Name, VehicleID, BatteryID, City ID, Start Date, End Date, Status, Total Rent, Total Rent Collected Online, Total Rent Collected Cash, Total Security Collected, Fines</p>
                    </div>
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                    <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                </div>
                {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg font-bold">{error}</div>}
                <div className="flex gap-4 pt-4">
                    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing || !file} className="flex-[2]">{isProcessing ? 'Processing...' : 'Upload Data'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const ManageBookingsModal: React.FC<{ bookings: Booking[]; onClose: () => void; onUpdate: (b: Booking) => Promise<void>; onDelete: (id: number) => Promise<void>; }> = ({ bookings, onClose, onUpdate, onDelete }) => {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Booking>>({});

    const handleEdit = (b: Booking) => {
        setEditingId(b.id);
        setFormData(b);
    };

    const handleSave = async () => {
        if (editingId && formData) {
            await onUpdate(formData as Booking);
            setEditingId(null);
            setFormData({});
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this booking log?')) {
            await onDelete(id);
        }
    };

    return (
        <Modal title="Manage Booking Logs" onClose={onClose}>
            <div className="h-[70vh] overflow-y-auto pb-safe">
                {editingId ? (
                    <div className="space-y-4 max-w-lg mx-auto">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Edit Booking #{editingId}</h3>
                            <Button variant="secondary" onClick={() => { setEditingId(null); setFormData({}); }} className="text-xs">Cancel</Button>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label><Input value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><Input value={formData.customerPhone || ''} onChange={e => setFormData({...formData, customerPhone: e.target.value})} /></div>
                         </div>
                         <div className="grid grid-cols-3 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Vehicle ID</label><Input type="number" value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: Number(e.target.value)})} /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">City ID</label><Input type="number" value={formData.cityId || ''} onChange={e => setFormData({...formData, cityId: Number(e.target.value)})} /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>{Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Start Date</label><Input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">End Date</label><Input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} /></div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                             <div className="flex gap-2">
                                <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Total Rent</label><Input type="number" value={formData.totalRent || 0} onChange={e => setFormData({...formData, totalRent: Number(e.target.value)})} /></div>
                                <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Collected</label><Input type="number" value={formData.amountCollected || 0} onChange={e => setFormData({...formData, amountCollected: Number(e.target.value)})} /></div>
                             </div>
                             <div className="flex gap-2">
                                <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Security</label><Input type="number" value={formData.securityDeposit || 0} onChange={e => setFormData({...formData, securityDeposit: Number(e.target.value)})} /></div>
                                <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Fines</label><Input type="number" value={formData.fineAmount || 0} onChange={e => setFormData({...formData, fineAmount: Number(e.target.value)})} /></div>
                             </div>
                         </div>
                         <Button onClick={handleSave} className="w-full">Save Changes</Button>
                    </div>
                ) : (
                    <>
                        <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['ID', 'Customer', 'Vehicle', 'Status', 'Dates', 'Financials', 'Actions']} />
                                <tbody className="divide-y divide-slate-50">
                                    {bookings.map(b => (
                                        <tr key={b.id}>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#{b.id}</td>
                                            <td className="px-6 py-4 font-bold">{b.customerName}</td>
                                            <td className="px-6 py-4 text-slate-600">#{b.vehicleId}</td>
                                            <td className="px-6 py-4"><Badge color={b.status === 'Active' ? 'brand' : b.status === 'Returned' ? 'emerald' : 'amber'}>{b.status}</Badge></td>
                                            <td className="px-6 py-4 text-xs">{formatDate(b.startDate)} <br/> {formatDate(b.endDate)}</td>
                                            <td className="px-6 py-4 text-xs">
                                                Rent: ₹{b.totalRent}<br/>
                                                Coll: ₹{b.amountCollected}<br/>
                                                Due: <span className="text-rose-600 font-bold">₹{Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - (b.amountCollected || 0))}</span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                <button onClick={() => handleEdit(b)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                                <button onClick={() => handleDelete(b.id)} className="text-rose-600 font-bold text-xs hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden space-y-3">
                            {bookings.map(b => (
                                <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-black text-slate-400">#{b.id}</span>
                                            <p className="font-bold text-slate-900">{b.customerName}</p>
                                        </div>
                                        <Badge color={b.status === 'Active' ? 'brand' : b.status === 'Returned' ? 'emerald' : 'amber'}>{b.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                                        <div>Bike: <b>#{b.vehicleId}</b></div>
                                        <div>Due: <span className="text-rose-600 font-bold">₹{Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - (b.amountCollected || 0))}</span></div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                                        <button onClick={() => handleEdit(b)} className="text-brand-600 font-bold text-xs">Edit</button>
                                        <button onClick={() => handleDelete(b.id)} className="text-rose-600 font-bold text-xs">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

const CustomerHistoryModal: React.FC<{ customer: Customer; bookings: Booking[]; vehicles: Vehicle[]; onClose: () => void; }> = ({ customer, bookings, vehicles, onClose }) => {
    const customerBookings = useMemo(() => bookings.filter(b => b.customerPhone === customer.phone || b.customerName === customer.name).sort((a,b) => b.id - a.id), [bookings, customer]);
    return (
        <Modal title="Customer History" onClose={onClose}>
             <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="flex-1">
                    <h3 className="text-3xl font-black text-slate-900">{customer.name}</h3>
                    <p className="text-slate-500 font-medium">{customer.phone}</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono text-slate-500 bg-slate-50 p-4 rounded-xl">
                        <div><span className="block font-bold text-slate-400 uppercase">Aadhar</span>{customer.aadharNumber || '-'}</div>
                        <div><span className="block font-bold text-slate-400 uppercase">PAN</span>{customer.panNumber || '-'}</div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="bg-emerald-50 p-4 rounded-xl text-center"><p className="text-emerald-600 font-bold text-xs uppercase">Spent</p><p className="text-xl font-black text-emerald-900">₹{customerBookings.reduce((s,b)=>s+(b.amountCollected||0),0)}</p></div>
                    <div className="bg-brand-50 p-4 rounded-xl text-center"><p className="text-brand-600 font-bold text-xs uppercase">Rides</p><p className="text-xl font-black text-brand-900">{customerBookings.length}</p></div>
                </div>
             </div>
             <div className="border border-slate-100 rounded-xl bg-white overflow-hidden">
                 <div className="hidden sm:block overflow-x-auto max-h-60">
                     <table className="w-full text-sm text-left">
                        <TableHeader headers={['ID', 'Bike', 'Dates', 'Status', 'Paid']} />
                        <tbody className="divide-y divide-slate-50">
                            {customerBookings.map(b => (
                                <tr key={b.id}>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">#{b.id}</td>
                                    <td className="px-6 py-4 font-bold">#{b.vehicleId}</td>
                                    <td className="px-6 py-4 text-xs">{formatDate(b.startDate)} to {formatDate(b.endDate)}</td>
                                    <td className="px-6 py-4"><Badge color={b.status==='Active'?'brand':'slate'}>{b.status}</Badge></td>
                                    <td className="px-6 py-4 font-bold">₹{b.amountCollected}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                 </div>
                 <div className="sm:hidden p-4 space-y-3 max-h-96 overflow-y-auto">
                    {customerBookings.map(b => (
                        <div key={b.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-slate-400">#{b.id}</span>
                                <Badge color={b.status==='Active'?'brand':'slate'}>{b.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="block font-bold text-slate-900">Bike #{b.vehicleId}</span>
                                    <span className="text-[10px] text-slate-500">{formatDate(b.startDate)} - {formatDate(b.endDate)}</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-700">₹{b.amountCollected}</span>
                            </div>
                        </div>
                    ))}
                    {customerBookings.length === 0 && <div className="text-center text-slate-400 text-xs italic">No history found.</div>}
                 </div>
             </div>
        </Modal>
    );
};

const ManageVehiclesModal: React.FC<{ vehicles: Vehicle[]; cities: City[]; onClose: () => void; onAdd: any; onUpdate: any; onDelete: any; onBulk: any; }> = ({ vehicles, cities, onClose, onAdd, onUpdate, onDelete, onBulk }) => {
    const [tab, setTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    const [model, setModel] = useState('');
    const [cityId, setCityId] = useState(cities[0]?.id || 1);
    const [status, setStatus] = useState<VehicleStatus>(VehicleStatus.Available);
    const [bulkText, setBulkText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { modelName: model, cityId, status, batteryId: null };
        if (editId) onUpdate({ ...data, id: editId }); else onAdd(data);
        resetForm();
    };

    const handleEdit = (v: Vehicle) => {
        setEditId(v.id);
        setModel(v.modelName);
        setCityId(v.cityId);
        setStatus(v.status);
        setTab('add');
    };

    const handleBulk = () => {
        const lines = bulkText.split('\n');
        const data = [];
        for (const line of lines) {
            const [m, cName, s] = line.split(',');
            if (m && cName) {
                const c = cities.find(ct => ct.name.toLowerCase() === cName.trim().toLowerCase());
                if (c) {
                    data.push({
                        modelName: m.trim(),
                        cityId: c.id,
                        status: matchEnum(s?.trim(), VehicleStatus, VehicleStatus.Available),
                        batteryId: null
                    });
                }
            }
        }
        if (data.length) onBulk(data);
        resetForm();
    };

    const resetForm = () => {
        setEditId(null); setModel(''); setStatus(VehicleStatus.Available); setBulkText(''); setTab('list');
    };

    return (
        <Modal title="Manage Inventory" onClose={onClose}>
            <div className="flex gap-2 border-b border-slate-100 mb-6">
                {['list', 'add', 'bulk'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-all ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="h-[60vh] overflow-y-auto">
                {tab === 'list' && (
                    <table className="w-full text-sm text-left">
                        <TableHeader headers={['ID', 'Model', 'City', 'Status', 'Actions']} />
                        <tbody className="divide-y divide-slate-50">
                            {vehicles.map(v => (
                                <tr key={v.id}>
                                    <td className="px-6 py-4 text-slate-500">#{v.id}</td>
                                    <td className="px-6 py-4 font-bold">{v.modelName}</td>
                                    <td className="px-6 py-4">{cities.find(c=>c.id===v.cityId)?.name}</td>
                                    <td className="px-6 py-4"><Badge color={v.status==='Available'?'emerald':'slate'}>{v.status}</Badge></td>
                                    <td className="px-6 py-4 space-x-3">
                                        <button onClick={() => handleEdit(v)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                        <button onClick={() => onDelete(v.id)} className="text-rose-600 font-bold text-xs hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'add' && (
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Model Name</label><Input value={model} onChange={e => setModel(e.target.value)} required /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">City</label><Select value={cityId} onChange={e => setCityId(Number(e.target.value))}>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><Select value={status} onChange={e => setStatus(e.target.value as any)}>{Object.values(VehicleStatus).map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
                        <Button type="submit" className="w-full">{editId ? 'Update Vehicle' : 'Add Vehicle'}</Button>
                    </form>
                )}

                {tab === 'bulk' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                            <p className="font-bold mb-1">Format: Model, City Name, Status</p>
                            <code>E-Bike Pro, San Francisco, Available</code>
                        </div>
                        <textarea className="w-full h-48 p-4 border rounded-xl text-sm font-mono" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Paste CSV data here..." />
                        <Button onClick={handleBulk} className="w-full">Process Import</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ManageBatteriesModal: React.FC<{ batteries: Battery[]; cities: City[]; onClose: () => void; onAdd: any; onUpdate: any; onDelete: any; onBulk: any; }> = ({ batteries, cities, onClose, onAdd, onUpdate, onDelete, onBulk }) => {
    const [tab, setTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    const [serial, setSerial] = useState('');
    const [cityId, setCityId] = useState(cities[0]?.id || 1);
    const [charge, setCharge] = useState(100);
    const [status, setStatus] = useState<BatteryStatus>(BatteryStatus.Available);
    const [bulkText, setBulkText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { serialNumber: serial, cityId, status, chargePercentage: charge, assignedVehicleId: null };
        if (editId) onUpdate({ ...data, id: editId }); else onAdd(data);
        resetForm();
    };

    const handleEdit = (b: Battery) => {
        setEditId(b.id);
        setSerial(b.serialNumber);
        setCityId(b.cityId);
        setCharge(b.chargePercentage);
        setStatus(b.status);
        setTab('add');
    };

    const handleBulk = () => {
        const lines = bulkText.split('\n');
        const data = [];
        for (const line of lines) {
            const [s, cName, ch, st] = line.split(',');
            if (s && cName) {
                const c = cities.find(ct => ct.name.toLowerCase() === cName.trim().toLowerCase());
                if (c) {
                    data.push({
                        serialNumber: s.trim(),
                        cityId: c.id,
                        chargePercentage: Number(ch) || 100,
                        status: matchEnum(st?.trim(), BatteryStatus, BatteryStatus.Available),
                        assignedVehicleId: null
                    });
                }
            }
        }
        if (data.length) onBulk(data);
        resetForm();
    };

    const resetForm = () => {
        setEditId(null); setSerial(''); setCharge(100); setStatus(BatteryStatus.Available); setBulkText(''); setTab('list');
    };

    return (
        <Modal title="Manage Batteries" onClose={onClose}>
            <div className="flex gap-2 border-b border-slate-100 mb-6">
                {['list', 'add', 'bulk'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-all ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="h-[60vh] overflow-y-auto">
                {tab === 'list' && (
                    <table className="w-full text-sm text-left">
                        <TableHeader headers={['Serial', 'City', 'Charge', 'Status', 'Actions']} />
                        <tbody className="divide-y divide-slate-50">
                            {batteries.map(b => (
                                <tr key={b.id}>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{b.serialNumber}</td>
                                    <td className="px-6 py-4">{cities.find(c=>c.id===b.cityId)?.name}</td>
                                    <td className="px-6 py-4 font-bold">{b.chargePercentage}%</td>
                                    <td className="px-6 py-4"><Badge color={b.status==='Available'?'emerald':'amber'}>{b.status}</Badge></td>
                                    <td className="px-6 py-4 space-x-3">
                                        <button onClick={() => handleEdit(b)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                        <button onClick={() => onDelete(b.id)} className="text-rose-600 font-bold text-xs hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'add' && (
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Serial Number</label><Input value={serial} onChange={e => setSerial(e.target.value)} required /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">City</label><Select value={cityId} onChange={e => setCityId(Number(e.target.value))}>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Charge %</label><Input type="number" min="0" max="100" value={charge} onChange={e => setCharge(Number(e.target.value))} required /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><Select value={status} onChange={e => setStatus(e.target.value as any)}>{Object.values(BatteryStatus).map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
                        </div>
                        <Button type="submit" className="w-full">{editId ? 'Update Battery' : 'Add Battery'}</Button>
                    </form>
                )}

                {tab === 'bulk' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                            <p className="font-bold mb-1">Format: Serial, City Name, Charge, Status</p>
                            <code>BATT-001, San Francisco, 100, Available</code>
                        </div>
                        <textarea className="w-full h-48 p-4 border rounded-xl text-sm font-mono" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Paste CSV data here..." />
                        <Button onClick={handleBulk} className="w-full">Process Import</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ManageRatesModal: React.FC<{ rates: Rate[]; cities: City[]; onClose: () => void; onAdd: any; onUpdate: any; onDelete: any; onBulk: any; }> = ({ rates, cities, onClose, onAdd, onUpdate, onDelete, onBulk }) => {
    const [tab, setTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    const [cityId, setCityId] = useState(cities[0]?.id || 1);
    const [clientName, setClientName] = useState('');
    const [dailyRent, setDailyRent] = useState('');
    const [monthlyRent, setMonthlyRent] = useState('');
    const [securityDeposit, setSecurityDeposit] = useState('');
    const [bulkText, setBulkText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            cityId: Number(cityId),
            clientName: clientName || null,
            dailyRent: Number(dailyRent),
            monthlyRent: monthlyRent ? Number(monthlyRent) : null,
            securityDeposit: Number(securityDeposit)
        };
        if (editId) onUpdate({ ...data, id: editId }); else onAdd(data);
        resetForm();
    };

    const handleEdit = (r: Rate) => {
        setEditId(r.id);
        setCityId(r.cityId);
        setClientName(r.clientName || '');
        setDailyRent(String(r.dailyRent));
        setMonthlyRent(r.monthlyRent ? String(r.monthlyRent) : '');
        setSecurityDeposit(String(r.securityDeposit));
        setTab('add');
    };

    const handleBulk = () => {
        const lines = bulkText.split('\n');
        const data = [];
        for (const line of lines) {
            const [cName, d, m, s, client] = line.split(',');
            if (cName && d) {
                const c = cities.find(ct => ct.name.toLowerCase() === cName.trim().toLowerCase());
                if (c) {
                    data.push({
                        cityId: c.id,
                        dailyRent: Number(d),
                        monthlyRent: m ? Number(m) : null,
                        securityDeposit: Number(s) || 0,
                        clientName: client ? client.trim() : null
                    });
                }
            }
        }
        if (data.length) onBulk(data);
        resetForm();
    };

    const resetForm = () => {
        setEditId(null); setCityId(cities[0]?.id || 1); setClientName(''); setDailyRent(''); setMonthlyRent(''); setSecurityDeposit(''); setBulkText(''); setTab('list');
    };

    return (
        <Modal title="Manage Rate Plans" onClose={onClose}>
            <div className="flex gap-2 border-b border-slate-100 mb-6">
                {['list', 'add', 'bulk'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-all ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="h-[60vh] overflow-y-auto">
                {tab === 'list' && (
                    <table className="w-full text-sm text-left">
                        <TableHeader headers={['City', 'Plan Name', 'Daily', 'Monthly', 'Deposit', 'Actions']} />
                        <tbody className="divide-y divide-slate-50">
                            {rates.map(r => (
                                <tr key={r.id}>
                                    <td className="px-6 py-4">{cities.find(c=>c.id===r.cityId)?.name}</td>
                                    <td className="px-6 py-4 font-bold">{r.clientName || 'Standard'}</td>
                                    <td className="px-6 py-4">₹{r.dailyRent}</td>
                                    <td className="px-6 py-4">{r.monthlyRent ? `₹${r.monthlyRent}` : '-'}</td>
                                    <td className="px-6 py-4">₹{r.securityDeposit}</td>
                                    <td className="px-6 py-4 space-x-3">
                                        <button onClick={() => handleEdit(r)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                        <button onClick={() => onDelete(r.id)} className="text-rose-600 font-bold text-xs hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'add' && (
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">City</label><Select value={cityId} onChange={e => setCityId(Number(e.target.value))}>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Plan Name (Optional)</label><Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Corporate A" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Daily Rent (₹)</label><Input type="number" value={dailyRent} onChange={e => setDailyRent(e.target.value)} required /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Monthly Rent (₹)</label><Input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Security Deposit (₹)</label><Input type="number" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} required /></div>
                        <Button type="submit" className="w-full">{editId ? 'Update Rate' : 'Add Rate'}</Button>
                    </form>
                )}

                {tab === 'bulk' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                            <p className="font-bold mb-1">Format: City, Daily, Monthly, Deposit, PlanName</p>
                            <code>San Francisco, 250, 5000, 1000, Standard</code>
                        </div>
                        <textarea className="w-full h-48 p-4 border rounded-xl text-sm font-mono" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Paste CSV data here..." />
                        <Button onClick={handleBulk} className="w-full">Process Import</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ManageCitiesModal: React.FC<{ cities: City[]; onClose: () => void; onAdd: (name: string, addr?: string) => void; onUpdate: (id: number, name: string, addr?: string) => void; }> = ({ cities, onClose, onAdd, onUpdate }) => {
    const [tab, setTab] = useState<'list' | 'add'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editId) onUpdate(editId, name, address); else onAdd(name, address);
        resetForm();
    };

    const handleEdit = (c: City) => {
        setEditId(c.id);
        setName(c.name);
        setAddress(c.zapPointAddress || '');
        setTab('add');
    };

    const resetForm = () => {
        setEditId(null); setName(''); setAddress(''); setTab('list');
    };

    return (
        <Modal title="Manage Cities" onClose={onClose}>
            <div className="flex gap-2 border-b border-slate-100 mb-6">
                {['list', 'add'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-all ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="h-[60vh] overflow-y-auto">
                {tab === 'list' && (
                    <table className="w-full text-sm text-left">
                        <TableHeader headers={['ID', 'City Name', 'Hub Address', 'Actions']} />
                        <tbody className="divide-y divide-slate-50">
                            {cities.map(c => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4 text-slate-500">#{c.id}</td>
                                    <td className="px-6 py-4 font-bold">{c.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{c.zapPointAddress || '-'}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleEdit(c)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'add' && (
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto mt-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">City Name</label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Hub Address (Optional)</label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                        <Button type="submit" className="w-full">{editId ? 'Update City' : 'Add City'}</Button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

const ManageCustomersModal: React.FC<{ customers: Customer[]; cities: City[]; onClose: () => void; onAdd: any; onUpdate: any; onDelete: any; onBulk: any; }> = ({ customers, cities, onClose, onAdd, onUpdate, onDelete, onBulk }) => {
    const [tab, setTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    
    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cityId, setCityId] = useState(cities[0]?.id || 1);
    const [address, setAddress] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [pan, setPan] = useState('');
    const [bankName, setBankName] = useState('');
    const [accNum, setAccNum] = useState('');
    const [ifsc, setIfsc] = useState('');
    
    const [bulkText, setBulkText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            name, phone, cityId, address, aadharNumber: aadhar, panNumber: pan,
            bankDetails: {
                bankName, accountNumber: accNum, ifscCode: ifsc, accountName: name
            }
        };
        if (editId) onUpdate({ ...data, id: editId }); else onAdd(data);
        resetForm();
    };

    const handleEdit = (c: Customer) => {
        setEditId(c.id);
        setName(c.name);
        setPhone(c.phone);
        setCityId(c.cityId || cities[0]?.id || 1);
        setAddress(c.address || '');
        setAadhar(c.aadharNumber || '');
        setPan(c.panNumber || '');
        setBankName(c.bankDetails?.bankName || '');
        setAccNum(c.bankDetails?.accountNumber || '');
        setIfsc(c.bankDetails?.ifscCode || '');
        setTab('add');
    };

    const handleBulk = () => {
        const lines = bulkText.split('\n');
        const data = [];
        for (const line of lines) {
            const [n, p, cName, aadh] = line.split(',');
            if (n && p) {
                const c = cities.find(ct => ct.name.toLowerCase() === cName.trim().toLowerCase());
                if (c) {
                    data.push({
                        name: n.trim(), phone: p.trim(), cityId: c.id, 
                        address: '', aadharNumber: aadh ? aadh.trim() : '', panNumber: '',
                        bankDetails: { bankName: '', accountNumber: '', ifscCode: '', accountName: n.trim() }
                    });
                }
            }
        }
        if (data.length) onBulk(data);
        resetForm();
    };

    const resetForm = () => {
        setEditId(null); setName(''); setPhone(''); setCityId(cities[0]?.id || 1); setAddress(''); setAadhar(''); setPan(''); setBankName(''); setAccNum(''); setIfsc(''); setBulkText(''); setTab('list');
    };

    return (
        <Modal title="Manage Customers" onClose={onClose}>
            <div className="flex gap-2 border-b border-slate-100 mb-6">
                {['list', 'add', 'bulk'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-all ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="h-[60vh] overflow-y-auto">
                {tab === 'list' && (
                    <table className="w-full text-sm text-left">
                        <TableHeader headers={['Name', 'Phone', 'City', 'KYC', 'Actions']} />
                        <tbody className="divide-y divide-slate-50">
                            {customers.map(c => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{c.phone}</td>
                                    <td className="px-6 py-4">{cities.find(ct => ct.id === c.cityId)?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{c.aadharNumber ? <Badge color="emerald">Verified</Badge> : <Badge color="amber">Pending</Badge>}</td>
                                    <td className="px-6 py-4 space-x-3">
                                        <button onClick={() => handleEdit(c)} className="text-brand-600 font-bold text-xs hover:underline">Edit</button>
                                        <button onClick={() => onDelete(c.id)} className="text-rose-600 font-bold text-xs hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'add' && (
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto mt-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">City</label><Select value={cityId} onChange={e => setCityId(Number(e.target.value))}>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Address</label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                        
                        <div className="pt-4 border-t border-slate-100">
                             <h4 className="text-sm font-bold text-brand-600 mb-3 uppercase">Identity Documents</h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <div><label className="text-xs font-bold text-slate-500 uppercase">Aadhar Number</label><Input value={aadhar} onChange={e => setAadhar(e.target.value)} /></div>
                                 <div><label className="text-xs font-bold text-slate-500 uppercase">PAN Number</label><Input value={pan} onChange={e => setPan(e.target.value)} /></div>
                             </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                             <h4 className="text-sm font-bold text-brand-600 mb-3 uppercase">Bank Details</h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <div><label className="text-xs font-bold text-slate-500 uppercase">Bank Name</label><Input value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                                 <div><label className="text-xs font-bold text-slate-500 uppercase">IFSC Code</label><Input value={ifsc} onChange={e => setIfsc(e.target.value)} /></div>
                             </div>
                             <div className="mt-4"><label className="text-xs font-bold text-slate-500 uppercase">Account Number</label><Input value={accNum} onChange={e => setAccNum(e.target.value)} /></div>
                        </div>
                        
                        <Button type="submit" className="w-full">{editId ? 'Update Customer' : 'Add Customer'}</Button>
                    </form>
                )}

                {tab === 'bulk' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                            <p className="font-bold mb-1">Format: Name, Phone, City, Aadhar</p>
                            <code>John Doe, 9876543210, San Francisco, 123456789012</code>
                        </div>
                        <textarea className="w-full h-48 p-4 border rounded-xl text-sm font-mono" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Paste CSV data here..." />
                        <Button onClick={handleBulk} className="w-full">Process Import</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const [section, setSection] = useState<AdminSection>('dashboard');
    const [showLegacyImport, setShowLegacyImport] = useState(false);
    
    // Modal Toggles
    const [showInventory, setShowInventory] = useState(false);
    const [showBatteries, setShowBatteries] = useState(false);
    const [showRates, setShowRates] = useState(false);
    const [showCustomers, setShowCustomers] = useState(false);
    const [showBookings, setShowBookings] = useState(false);
    const [showCities, setShowCities] = useState(false);
    
    // History Modal State
    const [viewHistoryFor, setViewHistoryFor] = useState<Customer | null>(null);
    
    // Export Handler
    const handleExport = (type: 'bookings' | 'vehicles' | 'customers') => {
        const data = type === 'bookings' ? props.bookings 
                   : type === 'vehicles' ? props.vehicles 
                   : props.customers;
        downloadCSV(data, type);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Console</h1>
                    <p className="text-slate-500 font-medium">Overview & Configuration</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:flex-none">
                        <Button variant="secondary" className="gap-2 w-full md:w-auto justify-center">
                            <DownloadIcon className="w-4 h-4"/> Export
                        </Button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-10">
                            <button onClick={() => handleExport('bookings')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Export Bookings</button>
                            <button onClick={() => handleExport('vehicles')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Export Inventory</button>
                            <button onClick={() => handleExport('customers')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Export Customers</button>
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => setShowLegacyImport(true)} className="gap-2 flex-1 md:flex-none justify-center">
                        <ArrowPathIcon className="w-4 h-4"/> Import
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-200 w-full md:w-fit overflow-x-auto no-scrollbar">
                {['dashboard', 'bookings', 'inventory', 'batteries', 'rates', 'cities', 'users', 'customers'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setSection(s as AdminSection)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap flex-shrink-0 ${section === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Section Content */}
            {section === 'dashboard' && <DashboardView bookings={props.bookings} vehicles={props.vehicles} customers={props.customers} />}
            
            {section === 'bookings' && (
                 <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                        <h2 className="text-xl font-bold">Booking Logs</h2>
                        <Button onClick={() => setShowBookings(true)}><DocumentChartBarIcon className="w-4 h-4 mr-2"/> Manage Bookings</Button>
                    </div>
                     <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['ID', 'Customer', 'Vehicle', 'Start Date', 'Status', 'Paid', 'Due']} />
                                <tbody className="divide-y divide-slate-50">
                                    {props.bookings.sort((a,b) => b.id - a.id).slice(0, 20).map(b => (
                                        <tr key={b.id}>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#{b.id}</td>
                                            <td className="px-6 py-4 font-bold">{b.customerName}</td>
                                            <td className="px-6 py-4">#{b.vehicleId}</td>
                                            <td className="px-6 py-4">{formatDate(b.startDate)}</td>
                                            <td className="px-6 py-4"><Badge color={b.status === 'Active' ? 'brand' : b.status === 'Returned' ? 'emerald' : 'amber'}>{b.status}</Badge></td>
                                            <td className="px-6 py-4">₹{b.amountCollected}</td>
                                            <td className="px-6 py-4 text-rose-600 font-bold">₹{Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - (b.amountCollected || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden p-4 space-y-3">
                            {props.bookings.sort((a,b) => b.id - a.id).slice(0, 20).map(b => (
                                <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-black text-slate-400">#{b.id}</span>
                                            <p className="font-bold text-slate-900">{b.customerName}</p>
                                        </div>
                                        <Badge color={b.status === 'Active' ? 'brand' : b.status === 'Returned' ? 'emerald' : 'amber'}>{b.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                                        <div>Bike: <b>#{b.vehicleId}</b></div>
                                        <div>Start: {formatDate(b.startDate)}</div>
                                        <div>Paid: ₹{b.amountCollected}</div>
                                        <div>Due: <span className="text-rose-600 font-bold">₹{Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - (b.amountCollected || 0))}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">Showing last 20 records. Use Manage Bookings to see all.</div>
                    </div>
                 </div>
            )}
            
            {section === 'inventory' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                        <h2 className="text-xl font-bold">Vehicle Inventory</h2>
                        <Button onClick={() => setShowInventory(true)}><PlusIcon className="w-4 h-4 mr-2"/> Manage Vehicles</Button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['ID', 'Model', 'City', 'Status', 'Battery']} />
                                <tbody className="divide-y divide-slate-50">
                                    {props.vehicles.map(v => (
                                        <tr key={v.id}>
                                            <td className="px-6 py-4 text-slate-500">#{v.id}</td>
                                            <td className="px-6 py-4 font-bold">{v.modelName}</td>
                                            <td className="px-6 py-4">{props.cities.find(c => c.id === v.cityId)?.name}</td>
                                            <td className="px-6 py-4"><Badge color={v.status === 'Available' ? 'emerald' : 'brand'}>{v.status}</Badge></td>
                                            <td className="px-6 py-4 text-slate-500">{v.batteryId ? `#${v.batteryId}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden p-4 space-y-3">
                            {props.vehicles.map(v => (
                                <div key={v.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">#{v.id}</p>
                                        <p className="font-bold text-slate-900">{v.modelName}</p>
                                        <p className="text-xs text-slate-500">{props.cities.find(c => c.id === v.cityId)?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge color={v.status === 'Available' ? 'emerald' : 'brand'}>{v.status}</Badge>
                                        <p className="text-xs text-slate-400 mt-1">{v.batteryId ? `Batt: #${v.batteryId}` : 'No Batt'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {section === 'batteries' && (
                 <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Battery Inventory</h2>
                        <Button onClick={() => setShowBatteries(true)}><BoltIcon className="w-4 h-4 mr-2"/> Manage Batteries</Button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['Serial', 'City', 'Charge', 'Status']} />
                                <tbody className="divide-y divide-slate-50">
                                    {props.batteries.map(b => (
                                        <tr key={b.id}>
                                            <td className="px-6 py-4 font-medium">{b.serialNumber}</td>
                                            <td className="px-6 py-4">{props.cities.find(c => c.id === b.cityId)?.name}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{b.chargePercentage}%</td>
                                            <td className="px-6 py-4"><Badge color={b.status === 'Available' ? 'emerald' : 'amber'}>{b.status}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden p-4 space-y-3">
                            {props.batteries.map(b => (
                                <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-900">{b.serialNumber}</p>
                                        <p className="text-xs text-slate-500">{props.cities.find(c => c.id === b.cityId)?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-800">{b.chargePercentage}%</p>
                                        <Badge color={b.status === 'Available' ? 'emerald' : 'amber'}>{b.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {section === 'rates' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                        <h2 className="text-xl font-bold">Rental Plans</h2>
                        <Button onClick={() => setShowRates(true)}><PlusIcon className="w-4 h-4 mr-2"/> Manage Rates</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {props.rates.map(r => (
                            <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand-200 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MoneyIcon className="w-12 h-12 text-brand-500"/></div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">{props.cities.find(c => c.id === r.cityId)?.name}</span>
                                    {r.clientName && <Badge color="blue">{r.clientName}</Badge>}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline"><span className="text-sm font-medium text-slate-600">Daily Rent</span><span className="text-2xl font-black text-slate-900">₹{r.dailyRent}</span></div>
                                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-100"><span className="text-sm font-medium text-slate-600">Monthly</span><span className="text-lg font-bold text-slate-700">{r.monthlyRent ? `₹${r.monthlyRent}` : '-'}</span></div>
                                    <div className="flex justify-between items-baseline"><span className="text-sm font-medium text-slate-600">Deposit</span><span className="text-lg font-bold text-slate-700">₹{r.securityDeposit}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}

            {section === 'cities' && (
                 <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                        <h2 className="text-xl font-bold">Operational Cities</h2>
                        <Button onClick={() => setShowCities(true)}><PlusIcon className="w-4 h-4 mr-2"/> Manage Cities</Button>
                    </div>
                     <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['ID', 'City Name', 'Hub Address']} />
                                <tbody className="divide-y divide-slate-50">
                                    {props.cities.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 text-slate-500">#{c.id}</td>
                                            <td className="px-6 py-4 font-bold">{c.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{c.zapPointAddress || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden p-4 space-y-3">
                            {props.cities.map(c => (
                                <div key={c.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-slate-900">{c.name}</span>
                                        <span className="text-xs font-bold text-slate-400">ID: {c.id}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{c.zapPointAddress || 'No Address'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            )}

            {section === 'customers' && (
                 <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100">
                        <h2 className="text-xl font-bold">Customer Database</h2>
                        <Button onClick={() => setShowCustomers(true)}><UserGroupIcon className="w-4 h-4 mr-2"/> Manage Customers</Button>
                    </div>
                     <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                                <TableHeader headers={['Name', 'Phone', 'City', 'KYC']} />
                                <tbody className="divide-y divide-slate-50">
                                    {props.customers.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                <button onClick={() => setViewHistoryFor(c)} className="hover:text-brand-600 hover:underline text-left">
                                                    {c.name}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{c.phone}</td>
                                            <td className="px-6 py-4">{props.cities.find(ct => ct.id === c.cityId)?.name || 'N/A'}</td>
                                            <td className="px-6 py-4">{c.aadharNumber ? <Badge color="emerald">Verified</Badge> : <Badge color="amber">Pending</Badge>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden p-4 space-y-3">
                            {props.customers.map(c => (
                                <div onClick={() => setViewHistoryFor(c)} key={c.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
                                    <div>
                                        <p className="font-bold text-slate-900 hover:text-brand-600">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-1">{props.cities.find(ct => ct.id === c.cityId)?.name || 'N/A'}</p>
                                        {c.aadharNumber ? <Badge color="emerald">Verified</Badge> : <Badge color="amber">Pending</Badge>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            )}

            {/* Modals */}
            {viewHistoryFor && (
                <CustomerHistoryModal 
                    customer={viewHistoryFor} 
                    bookings={props.bookings} 
                    vehicles={props.vehicles} 
                    onClose={() => setViewHistoryFor(null)} 
                />
            )}

            {showLegacyImport && <ImportLegacyDataModal onClose={() => setShowLegacyImport(false)} onImport={props.importLegacyData} />}
            
            {showInventory && (
                <ManageVehiclesModal 
                    vehicles={props.vehicles} 
                    cities={props.cities} 
                    onClose={() => setShowInventory(false)} 
                    onAdd={props.addVehicle} 
                    onUpdate={props.updateVehicle} 
                    onDelete={props.deleteVehicle} 
                    onBulk={props.bulkImportVehicles} 
                />
            )}
            
            {showBatteries && (
                <ManageBatteriesModal 
                    batteries={props.batteries} 
                    cities={props.cities} 
                    onClose={() => setShowBatteries(false)} 
                    onAdd={props.addBattery} 
                    onUpdate={props.updateBattery} 
                    onDelete={props.deleteBattery} 
                    onBulk={props.bulkImportBatteries} 
                />
            )}

            {showRates && (
                <ManageRatesModal
                    rates={props.rates}
                    cities={props.cities}
                    onClose={() => setShowRates(false)}
                    onAdd={props.addRate}
                    onUpdate={props.updateRate}
                    onDelete={props.deleteRate}
                    onBulk={props.bulkImportRates}
                />
            )}

            {showCities && (
                <ManageCitiesModal
                    cities={props.cities}
                    onClose={() => setShowCities(false)}
                    onAdd={props.addCity}
                    onUpdate={props.updateCity}
                />
            )}

            {showCustomers && (
                <ManageCustomersModal
                    customers={props.customers}
                    cities={props.cities}
                    onClose={() => setShowCustomers(false)}
                    onAdd={props.addCustomer}
                    onUpdate={props.updateCustomer}
                    onDelete={props.deleteCustomer}
                    onBulk={props.bulkImportCustomers}
                />
            )}

            {showBookings && (
                <ManageBookingsModal
                    bookings={props.bookings}
                    onClose={() => setShowBookings(false)}
                    onUpdate={props.updateBooking}
                    onDelete={props.deleteBooking}
                />
            )}
        </div>
    );
};
