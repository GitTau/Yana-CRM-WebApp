
import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Vehicle, Rate, City, VehicleStatus, BookingStatus, PaymentMode, Battery, BatteryStatus, User, Customer, VehicleLog } from '../types';
import { BikeIcon, MoneyIcon, PlusIcon, BoltIcon, ArrowPathIcon, DocumentChartBarIcon, UserGroupIcon } from './icons';
import { POST_RIDE_CHECKLIST_ITEMS } from '../constants';

interface OperationsPanelProps {
  selectedCityId: number;
  bookings: Booking[];
  vehicles: Vehicle[];
  rates: Rate[];
  cities: City[];
  batteries: Battery[];
  users: User[];
  customers: Customer[];
  vehicleLogs: VehicleLog[];
  addBooking: (booking: Omit<Booking, 'id'>) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateBookingStatus: (bookingId: number, status: BookingStatus, checklistData?: { items: Record<string, boolean>, fine: number, notes: string, settlementAdjustment?: number, targetVehicleStatus?: VehicleStatus, paymentTransactionId?: string }) => void;
  pauseBooking: (bookingId: number, reason: string) => void;
  resumeBooking: (bookingId: number, vehicleId: number, batteryId: number | null) => void;
  changeBatteryForBooking: (bookingId: number, newBatteryId: number) => void;
  swapVehicleForBooking: (bookingId: number, newVehicleId: number, reason: string, checklist: Record<string, boolean>, fineAdjustment: number) => void;
  settleBookingDue: (bookingId: number, amount: number, newEndDate?: string, extraRent?: number) => void;
  extendBooking: (bookingId: number, extraRent: number, amountCollected: number, newEndDate: string) => void;
  raiseRefundRequest: (bookingId: number, amount: number, customerName: string) => void;
  updateBatteryStatus: (id: number, status: BatteryStatus, notes?: string, chargePercentage?: number) => void;
  updateVehicleStatus: (vehicleId: number, status: VehicleStatus, notes: string, checklist: Record<string, boolean>) => void;
  refreshData?: () => void;
}

// Helper to add duration to a date
const addDuration = (dateStr: string, value: number, unit: 'weeks' | 'months') => {
    const d = new Date(dateStr);
    if (unit === 'weeks') {
        d.setDate(d.getDate() + (value * 7));
    } else {
        d.setMonth(d.getMonth() + value);
    }
    return d.toISOString().split('T')[0];
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

const getOverdueStats = (booking: Booking) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(booking.endDate);
    end.setHours(0,0,0,0);
    
    // Only calculate for Active bookings that are in the past
    if (today <= end || booking.status !== BookingStatus.Active) return { days: 0, fine: 0 };
    
    const diffTime = today.getTime() - end.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days, fine: days * 300 }; // Rs. 300 per day fine
};

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' }> = ({ variant = 'primary', className, ...props }) => {
    const base = "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm";
    const variants = {
        primary: "bg-brand-500 text-slate-900 hover:bg-brand-400 shadow-brand-500/20 border border-transparent",
        secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
        danger: "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100",
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 border-transparent",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 border-transparent shadow-none"
    };
    return <button className={`${base} ${variants[variant] || variants.primary} ${className || ''}`} {...props} />;
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all" {...props} />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all" {...props} />
);

const Badge: React.FC<{ color: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'brand'; children: React.ReactNode; className?: string }> = ({ color, children, className }) => {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        brand: 'bg-brand-50 text-brand-800 border-brand-100',
    };
    return <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${colors[color]} ${className || ''}`}>{children}</span>;
};

const KPICard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: 'brand' | 'blue' | 'amber' | 'rose' | 'emerald'; onClick?: () => void; warning?: boolean }> = ({ title, value, icon, color, onClick, warning }) => {
    const bgColors = {
        brand: 'bg-brand-50 text-brand-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
        emerald: 'bg-emerald-50 text-emerald-600'
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white p-5 rounded-2xl shadow-premium border border-slate-200/60 flex flex-col justify-between h-full relative overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-premium-hover active:scale-95' : ''}`}
        >
            {warning && <div className="absolute top-0 right-0 p-1.5"><div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse ring-2 ring-white"></div></div>}
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${bgColors[color]}`}>
                    {icon}
                </div>
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">{title}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 w-full max-w-2xl my-auto flex flex-col relative animate-in fade-in zoom-in duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);

// --- New KPI Detail Lists ---

const ActiveRentalsList: React.FC<{ bookings: Booking[] }> = ({ bookings }) => (
    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-brand-50 text-brand-900 text-[10px] uppercase font-bold sticky top-0">
                <tr><th className="px-4 py-3">Bike</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Start / End</th><th className="px-4 py-3 text-right">Rent Due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                    <tr key={b.id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">#{b.vehicleId}</td>
                        <td className="px-4 py-3">{b.customerName}<br/><span className="text-[10px] text-slate-400">{b.customerPhone}</span></td>
                        <td className="px-4 py-3 text-xs">{formatDate(b.startDate)} <span className="text-slate-400">/</span> {formatDate(b.endDate)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">₹{Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount||0)) - b.amountCollected)}</td>
                    </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No active rentals found.</td></tr>}
            </tbody>
        </table>
    </div>
);

const InventoryList: React.FC<{ items: any[], type: 'bike' | 'battery' }> = ({ items, type }) => (
    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                <tr><th className="px-4 py-3">{type === 'bike' ? 'Bike ID' : 'Serial Number'}</th><th className="px-4 py-3">{type === 'bike' ? 'Model' : 'Charge Level'}</th><th className="px-4 py-3 text-right">Health</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-600">{type === 'bike' ? `#${item.id}` : item.serialNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{type === 'bike' ? item.modelName : <span className={`px-2 py-1 rounded ${item.chargePercentage > 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.chargePercentage}%</span>}</td>
                        <td className="px-4 py-3 text-right">
                             {type === 'bike' ? <Badge color={item.healthStatus === 'Good' ? 'emerald' : 'amber'}>{item.healthStatus || 'Good'}</Badge> : <Badge color="emerald">Available</Badge>}
                        </td>
                    </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400 italic">No items available right now.</td></tr>}
            </tbody>
        </table>
    </div>
);

const ActiveCustomersList: React.FC<{ bookings: Booking[] }> = ({ bookings }) => (
    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-emerald-50 text-emerald-900 text-[10px] uppercase font-bold sticky top-0">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3 text-right">Current Bike</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                    <tr key={b.id} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">{b.customerName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.customerPhone}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">#{b.vehicleId}</td>
                    </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400 italic">No active customers found.</td></tr>}
            </tbody>
        </table>
    </div>
);

const OverdueListModal: React.FC<{ bookings: Booking[]; onClose: () => void }> = ({ bookings, onClose }) => {
    // Filter active bookings that are overdue
    const overdueBookings = bookings.filter(b => {
        const { days } = getOverdueStats(b);
        return days > 0;
    }).sort((a,b) => getOverdueStats(b).days - getOverdueStats(a).days); // Most late first

    return (
        <div className="space-y-4">
            {overdueBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No overdue payments found.</div>
            ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-rose-50 text-rose-800 text-[10px] uppercase font-bold sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3 text-center">Days Late</th>
                                <th className="px-4 py-3 text-right">Late Fine (₹300/day)</th>
                                <th className="px-4 py-3 text-right">Rent Due</th>
                                <th className="px-4 py-3 text-right">Total Liability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {overdueBookings.map(b => {
                                const stats = getOverdueStats(b);
                                const rentDue = Math.max(0, (b.totalRent + b.securityDeposit + (b.fineAmount || 0)) - b.amountCollected);
                                const totalLiability = rentDue + stats.fine;
                                
                                return (
                                    <tr key={b.id} className="bg-white hover:bg-rose-50/20">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900">{b.customerName}</div>
                                            <div className="text-xs text-slate-500">{b.customerPhone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono">{formatDate(b.endDate)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge color="rose">{stats.days} Days</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-bold">₹{stats.fine}</td>
                                        <td className="px-4 py-3 text-right font-mono">₹{rentDue}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-black text-slate-900">₹{totalLiability}</div>
                                            <div className="text-[10px] text-slate-400">Security: ₹{b.securityDeposit}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500 flex gap-2 items-start border border-slate-100">
                <div className="mt-0.5"><BoltIcon className="w-4 h-4 text-amber-500"/></div>
                <p>Late fines are calculated at <b>₹300 per day</b> past the rental end date. This amount should be deducted from the Security Deposit or collected additionally during settlement.</p>
            </div>
            <Button onClick={onClose} className="w-full">Close</Button>
        </div>
    );
};

// ... [Existing Forms: QuickCustomerForm, BatterySwapModal, VehicleSwapModal, SettleDueModal, ReturnRideModal, ExtendRentalForm, BookingForm] ... 
// (These remain unchanged, re-declaring them briefly for context if needed, but in XML strictly outputting the file content so I will include them fully to be safe as per instructions)

const QuickCustomerForm: React.FC<{ onSubmit: (c: any) => void; onCancel: () => void }> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name, phone, aadharNumber: aadhar, address: '', panNumber: '',
            bankDetails: { accountName: name, accountNumber, bankName, ifscCode: ifsc }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-600 uppercase tracking-widest border-b border-brand-100 pb-1">Personal Information</h4>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Rider Name" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone Number</label><Input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="10-digit Mobile" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Aadhar (Optional)</label><Input value={aadhar} onChange={e => setAadhar(e.target.value)} placeholder="Last 4 digits or Full" /></div>
            </div>
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-600 uppercase tracking-widest border-b border-brand-100 pb-1">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Bank Name</label><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. HDFC" /></div>
                     <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">IFSC Code</label><Input value={ifsc} onChange={e => setIfsc(e.target.value)} placeholder="IFSC" className="uppercase" /></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Account Number</label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number" /></div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onCancel} className="flex-1" type="button">Cancel</Button>
                <Button type="submit" className="flex-1">Create Rider</Button>
            </div>
        </form>
    );
}

const BatterySwapModal: React.FC<{ selectedCityId: number; bookings: Booking[]; batteries: Battery[]; onSwap: (bookingId: number, batteryId: number) => void; onClose: () => void; }> = ({ selectedCityId, bookings, batteries, onSwap, onClose }) => {
    const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('');
    const [selectedBatteryId, setSelectedBatteryId] = useState<number | ''>('');
    const activeBookings = bookings.filter(b => b.cityId === selectedCityId && b.status === BookingStatus.Active);
    const availableBatteries = batteries.filter(b => b.cityId === selectedCityId && b.status === BatteryStatus.Available);
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Active Rider</label><Select value={selectedBookingId} onChange={e => setSelectedBookingId(Number(e.target.value))}><option value="">Select Rider</option>{activeBookings.map(b => <option key={b.id} value={b.id}>{b.customerName} - Bike #{b.vehicleId}</option>)}</Select></div>
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">New Fresh Battery</label><Select value={selectedBatteryId} onChange={e => setSelectedBatteryId(Number(e.target.value))}><option value="">Select New Battery</option>{availableBatteries.map(b => <option key={b.id} value={b.id}>{b.serialNumber} ({b.chargePercentage}%)</option>)}</Select></div>
            </div>
            <div className="flex gap-4"><Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button disabled={!selectedBookingId || !selectedBatteryId} onClick={() => { onSwap(Number(selectedBookingId), Number(selectedBatteryId)); onClose(); }} className="flex-[2]">Process Swap</Button></div>
        </div>
    );
};

const VehicleSwapModal: React.FC<{ selectedCityId: number; bookings: Booking[]; vehicles: Vehicle[]; onSwap: (bookingId: number, vehicleId: number, reason: string, fine: number) => void; onClose: () => void; }> = ({ selectedCityId, bookings, vehicles, onSwap, onClose }) => {
    const [selectedBookingId, setSelectedBookingId] = useState<number | ''>('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [fine, setFine] = useState<string>('0');
    const activeBookings = bookings.filter(b => b.cityId === selectedCityId && b.status === BookingStatus.Active);
    const availableVehicles = vehicles.filter(v => v.cityId === selectedCityId && v.status === VehicleStatus.Available);
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Active Rider (Bike to Return)</label><Select value={selectedBookingId} onChange={e => setSelectedBookingId(Number(e.target.value))}><option value="">Select Rider</option>{activeBookings.map(b => <option key={b.id} value={b.id}>{b.customerName} - Current Bike #{b.vehicleId}</option>)}</Select></div>
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">New Bike to Assign</label><Select value={selectedVehicleId} onChange={e => setSelectedVehicleId(Number(e.target.value))}><option value="">Select New Bike</option>{availableVehicles.map(v => <option key={v.id} value={v.id}>{v.modelName} (#{v.id})</option>)}</Select></div>
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Reason for Swap</label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Maintenance, Puncture, Upgrade" /></div>
                <div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Damage Fine (If any)</label><Input type="number" value={fine} onChange={e => setFine(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="flex gap-4"><Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button disabled={!selectedBookingId || !selectedVehicleId || !reason} onClick={() => { onSwap(Number(selectedBookingId), Number(selectedVehicleId), reason, Number(fine)); onClose(); }} className="flex-[2]">Confirm Swap</Button></div>
        </div>
    );
};

const SettleDueModal: React.FC<{ booking: Booking; onClose: () => void; onConfirm: (amount: number, newEndDate?: string, extraRent?: number) => void; }> = ({ booking, onClose, onConfirm }) => {
    const total = (booking.totalRent || 0) + (booking.securityDeposit || 0) + (booking.fineAmount || 0);
    const pending = Math.max(0, total - (booking.amountCollected || 0));
    const [amountCollected, setAmountCollected] = useState(pending);
    return (
        <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                <h3 className="font-bold text-emerald-800 text-lg mb-2">Collect Payment</h3>
                <p className="text-sm text-emerald-700">Due: <b>₹{pending}</b></p>
            </div>
            <div><label className="text-sm font-bold text-slate-700 block mb-2">Amount Collecting (₹)</label><Input type="number" value={amountCollected} onChange={e => setAmountCollected(Number(e.target.value))} /></div>
            <div className="flex gap-4"><Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button onClick={() => onConfirm(amountCollected)} className="flex-[2]">Submit</Button></div>
        </div>
    );
};

const ReturnRideModal: React.FC<{ booking: Booking; onClose: () => void; onConfirm: (data: any) => void }> = ({ booking, onClose, onConfirm }) => {
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState('');
    const calculatedFine = useMemo(() => POST_RIDE_CHECKLIST_ITEMS.reduce((sum, item) => sum + (checklist[item.label] ? item.fine : 0), 0), [checklist]);
    const pending = Math.max(0, (booking.totalRent + booking.securityDeposit + (booking.fineAmount || 0)) - booking.amountCollected) + calculatedFine;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{POST_RIDE_CHECKLIST_ITEMS.map(item => (<button key={item.label} onClick={() => setChecklist(p => ({ ...p, [item.label]: !p[item.label] }))} className={`p-2 rounded-lg border text-left ${checklist[item.label] ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}><span className="text-[10px] font-bold block">{item.label}</span>{item.fine > 0 && <span className="text-[9px] text-slate-400">₹{item.fine}</span>}</button>))}</div>
            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center"><span className="text-xs uppercase font-bold text-slate-400">Total Settlement Due</span><span className="text-xl font-black">₹{pending}</span></div>
            <div className="flex gap-3"><Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button onClick={() => onConfirm({ items: checklist, fine: calculatedFine, notes, settlementAdjustment: pending, targetVehicleStatus: Object.values(checklist).some(Boolean) ? VehicleStatus.Maintenance : VehicleStatus.Available })} className="flex-[2]">End Ride</Button></div>
        </div>
    );
};

const ExtendRentalForm: React.FC<{ booking: Booking; rates: Rate[]; onClose: () => void; onSubmit: (er: number, c: number, e: string) => void; }> = ({ booking, rates, onClose, onSubmit }) => {
    const [unit, setUnit] = useState<'weeks' | 'months'>('weeks');
    const [duration, setDuration] = useState(1);
    const rateObj = rates.find(r => r.cityId === booking.cityId && r.dailyRent === booking.dailyRent);
    const newEndDate = useMemo(() => addDuration(booking.endDate, duration, unit), [booking.endDate, duration, unit]);
    const extraRent = useMemo(() => {
        if (!rateObj) return 0;
        if (unit === 'months') {
            const monthlyRate = rateObj.monthlyRent || (rateObj.dailyRent * 30);
            return monthlyRate * duration;
        } else {
            return (rateObj.dailyRent * 7) * duration;
        }
    }, [unit, duration, rateObj]);
    return (
        <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-lg"><button onClick={() => setUnit('weeks')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${unit === 'weeks' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}>Weeks</button><button onClick={() => setUnit('months')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${unit === 'months' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}>Months</button></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Extend By</label><div className="flex items-center gap-3"><button onClick={() => setDuration(Math.max(1, duration - 1))} className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold">-</button><span className="flex-1 text-center font-bold text-lg">{duration} {unit === 'weeks' ? 'Week(s)' : 'Month(s)'}</span><button onClick={() => setDuration(duration + 1)} className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold">+</button></div></div>
            <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 text-center space-y-2"><div><span className="text-xs text-brand-600 font-bold uppercase">New Expiry Date</span><p className="text-lg font-bold text-slate-900">{formatDate(newEndDate)}</p></div><div className="pt-2 border-t border-brand-200"><span className="text-xs text-brand-600 font-bold uppercase">Extra Rent to Collect</span><p className="text-2xl font-black text-brand-800">₹{extraRent}</p></div></div>
            <Button onClick={() => onSubmit(extraRent, extraRent, newEndDate)} className="w-full">Confirm Extension</Button>
        </div>
    );
};

const BookingForm: React.FC<{ cityId: number; rates: Rate[]; vehicles: Vehicle[]; batteries: Battery[]; customers: Customer[]; onClose: () => void; onAddNewCustomer: () => void; onSubmit: (data: Omit<Booking, 'id'>) => Promise<void>; }> = ({ cityId, rates, vehicles, batteries, customers, onClose, onAddNewCustomer, onSubmit }) => {
    const [customerId, setCustomerId] = useState<number | ''>('');
    const [rateId, setRateId] = useState<number | ''>('');
    const [vehicleId, setVehicleId] = useState<number | ''>('');
    const [batteryId, setBatteryId] = useState<number | ''>('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState<'weeks' | 'months'>('weeks');
    const [duration, setDuration] = useState(1);
    const [collected, setCollected] = useState<number | ''>('');
    const selectedRate = rates.find(r => r.id === rateId);
    const selectedCustomer = customers.find(c => c.id === customerId);
    const endDate = useMemo(() => addDuration(startDate, duration, unit), [startDate, duration, unit]);
    const calc = useMemo(() => {
        if (!selectedRate) return { rent: 0, deposit: 0, total: 0 };
        let rent = 0;
        if (unit === 'months') { const monthlyRate = selectedRate.monthlyRent || (selectedRate.dailyRent * 30); rent = monthlyRate * duration; } else { rent = (selectedRate.dailyRent * 7) * duration; }
        return { rent, deposit: selectedRate.securityDeposit, total: rent + selectedRate.securityDeposit };
    }, [unit, duration, selectedRate]);
    return (
        <form onSubmit={async e => { e.preventDefault(); if (selectedCustomer && selectedRate && vehicleId) await onSubmit({ customerName: selectedCustomer.name, customerPhone: selectedCustomer.phone, vehicleId: Number(vehicleId), batteryId: batteryId ? Number(batteryId) : null, cityId, startDate, endDate, dailyRent: selectedRate.dailyRent, totalRent: calc.rent, securityDeposit: calc.deposit, amountCollected: Number(collected) || 0, modeOfPayment: PaymentMode.UPI, status: BookingStatus.Active }); }} className="space-y-4">
            <div className="flex gap-2"><Select value={customerId} onChange={e => setCustomerId(Number(e.target.value))} required className="flex-1"><option value="">Select Rider</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><Button type="button" variant="secondary" onClick={onAddNewCustomer} className="px-3" title="Add New Rider"><UserGroupIcon className="w-5 h-5 text-brand-600"/></Button></div>
            <div className="grid grid-cols-2 gap-2"><Select value={vehicleId} onChange={e => setVehicleId(Number(e.target.value))} required><option value="">Bike</option>{vehicles.filter(v => v.cityId === cityId && v.status === VehicleStatus.Available).map(v => <option key={v.id} value={v.id}>{v.modelName} (#{v.id})</option>)}</Select><Select value={batteryId} onChange={e => setBatteryId(Number(e.target.value))}><option value="">Battery (Opt)</option>{batteries.filter(b => b.cityId === cityId && b.status === BatteryStatus.Available).map(b => <option key={b.id} value={b.id}>{b.serialNumber}</option>)}</Select></div>
            <Select value={rateId} onChange={e => setRateId(Number(e.target.value))} required><option value="">Select Rate Plan</option>{rates.filter(r => r.cityId === cityId).map(r => <option key={r.id} value={r.id}>{r.clientName || 'General'} (Daily: ₹{r.dailyRent} {r.monthlyRent ? `/ Monthly: ₹${r.monthlyRent}` : ''})</option>)}</Select>
            <div className="p-4 bg-slate-50 rounded-xl space-y-4 border border-slate-100"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Start Date</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Duration</label><div className="flex gap-2"><div className="flex bg-white border border-slate-200 rounded-lg p-1"><button type="button" onClick={() => setUnit('weeks')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unit === 'weeks' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Weeks</button><button type="button" onClick={() => setUnit('months')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unit === 'months' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Months</button></div><input type="number" min="1" value={duration} onChange={e => setDuration(Number(e.target.value))} className="flex-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-center font-bold" /></div></div><div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-xs font-bold text-slate-500 uppercase">Ends On</span><span className="text-sm font-bold text-slate-900">{formatDate(endDate)}</span></div></div>
            {selectedRate && (<div className="p-4 bg-brand-50 rounded-xl space-y-2 border border-brand-100"><div className="flex justify-between text-xs text-brand-800"><span>Rent ({duration} {unit})</span><span>₹{calc.rent}</span></div><div className="flex justify-between text-xs text-brand-800"><span>Security Deposit</span><span>₹{calc.deposit}</span></div><div className="flex justify-between font-black text-slate-900 border-t border-brand-200 pt-2 text-lg"><span>Total Payable</span><span>₹{calc.total}</span></div></div>)}
            <Input type="number" placeholder="Amount Collecting Now (₹)" value={collected} onChange={e => setCollected(Number(e.target.value))} />
            <Button type="submit" className="w-full">Create Booking</Button>
        </form>
    );
};

export const OperationsPanel: React.FC<OperationsPanelProps> = (props) => {
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState<number | null>(null);
    const [showPauseModal, setShowPauseModal] = useState<number | null>(null);
    const [showResumeModal, setShowResumeModal] = useState<number | null>(null);
    const [showSettleModal, setShowSettleModal] = useState<number | null>(null);
    const [showExtendModal, setShowExtendModal] = useState<number | null>(null);
    const [showBatteryModal, setShowBatteryModal] = useState(false);
    const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
    const [showVehicleSwapModal, setShowVehicleSwapModal] = useState(false);
    const [showOverdueModal, setShowOverdueModal] = useState(false);
    
    // New Modal States for Dashboard Click
    const [showActiveRentals, setShowActiveRentals] = useState(false);
    const [showAvailableBikes, setShowAvailableBikes] = useState(false);
    const [showAvailableBatteries, setShowAvailableBatteries] = useState(false);
    const [showActiveCustomers, setShowActiveCustomers] = useState(false);
    
    // Date Range Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredCityBookings = useMemo(() => {
        let filtered = props.bookings.filter(b => b.cityId === props.selectedCityId);
        if (dateRange.start) { filtered = filtered.filter(b => b.startDate >= dateRange.start); }
        if (dateRange.end) { filtered = filtered.filter(b => b.startDate <= dateRange.end); }
        return filtered.sort((a,b) => b.id - a.id);
    }, [props.bookings, props.selectedCityId, dateRange]);

    const activeCityBookings = useMemo(() => filteredCityBookings.filter(b => b.status === BookingStatus.Active || b.status === BookingStatus.Paused), [filteredCityBookings]);
    
    // Filtered lists for KPI modals
    const availableBikesList = props.vehicles.filter(v => v.cityId === props.selectedCityId && v.status === VehicleStatus.Available);
    const availableBatteriesList = props.batteries.filter(b => b.cityId === props.selectedCityId && b.status === BatteryStatus.Available);

    // Counts for KPIs
    const activeRentalsCount = activeCityBookings.filter(b => b.status === BookingStatus.Active).length;
    const totalCustomersCount = new Set(filteredCityBookings.map(b => b.customerPhone)).size;
    
    const pendingDuesTotal = useMemo(() => {
        return filteredCityBookings.reduce((sum, b) => {
            const total = (b.totalRent || 0) + (b.securityDeposit || 0) + (b.fineAmount || 0);
            const collected = b.amountCollected || 0;
            return sum + Math.max(0, total - collected);
        }, 0);
    }, [filteredCityBookings]);

    const overdueCount = activeCityBookings.filter(b => getOverdueStats(b).days > 0).length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Operations Dashboard</h2>
                <div className="flex items-center gap-2"><span className="text-xs font-bold uppercase text-slate-400">Filter By Date:</span><Input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-auto py-1" /><span className="text-slate-400">-</span><Input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-auto py-1" />{(dateRange.start || dateRange.end) && (<button onClick={() => setDateRange({ start: '', end: '' })} className="text-xs font-bold text-rose-500 hover:underline">Clear</button>)}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard 
                    title="Active Rentals" 
                    value={activeRentalsCount} 
                    icon={<BikeIcon className="w-6 h-6"/>} 
                    color="brand" 
                    onClick={() => setShowActiveRentals(true)}
                />
                <KPICard 
                    title="Available Bikes" 
                    value={availableBikesList.length} 
                    icon={<BikeIcon className="w-6 h-6"/>} 
                    color="blue" 
                    onClick={() => setShowAvailableBikes(true)}
                />
                <KPICard 
                    title="Available Batteries" 
                    value={availableBatteriesList.length} 
                    icon={<BoltIcon className="w-6 h-6"/>} 
                    color="amber" 
                    onClick={() => setShowAvailableBatteries(true)}
                />
                <KPICard 
                    title="Pending Dues" 
                    value={`₹${pendingDuesTotal}`} 
                    icon={<MoneyIcon className="w-6 h-6"/>} 
                    color="rose" 
                    onClick={() => setShowOverdueModal(true)}
                    warning={overdueCount > 0}
                />
                <KPICard 
                    title="Active Customers" 
                    value={totalCustomersCount} 
                    icon={<UserGroupIcon className="w-6 h-6"/>} 
                    color="emerald" 
                    onClick={() => setShowActiveCustomers(true)}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="primary" onClick={() => setShowBookingModal(true)} className="w-full py-4 text-sm flex flex-col items-center gap-2 h-auto shadow-md"><BikeIcon className="w-6 h-6 opacity-70"/><span>New Rental</span></Button>
                <Button variant="primary" onClick={() => setShowQuickCustomerModal(true)} className="w-full py-4 text-sm flex flex-col items-center gap-2 h-auto shadow-md"><UserGroupIcon className="w-6 h-6 opacity-70"/><span>Register Rider</span></Button>
                <Button variant="secondary" onClick={() => setShowBatteryModal(true)} className="w-full py-4 text-sm flex flex-col items-center gap-2 h-auto"><BoltIcon className="w-6 h-6 text-slate-400"/><span>Battery Swap</span></Button>
                <Button variant="secondary" onClick={() => setShowVehicleSwapModal(true)} className="w-full py-4 text-sm flex flex-col items-center gap-2 h-auto"><ArrowPathIcon className="w-6 h-6 text-slate-400"/><span>Vehicle Swap</span></Button>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Rental Log {dateRange.start ? '(Filtered)' : '(All Time)'}</h2></div>
                <div className="bg-white rounded-2xl shadow-premium border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Bike</th><th className="px-6 py-4">Rider</th><th className="px-6 py-4">Start / End</th><th className="px-6 py-4">Due</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCityBookings.map(booking => {
                                    const pending = Math.max(0, (booking.totalRent + booking.securityDeposit + (booking.fineAmount || 0)) - booking.amountCollected);
                                    const isActive = booking.status === BookingStatus.Active || booking.status === BookingStatus.Paused;
                                    const overdue = getOverdueStats(booking);
                                    
                                    return (
                                        <tr key={booking.id} className={overdue.days > 0 ? 'bg-rose-50' : (!isActive ? 'opacity-60 bg-slate-50/50' : '')}>
                                            <td className="px-6 py-4"><Badge color={booking.status === 'Paused' ? 'amber' : booking.status === 'Active' ? 'brand' : 'slate'}>{booking.status}</Badge></td>
                                            <td className="px-6 py-4 font-bold">#{booking.vehicleId}</td>
                                            <td className="px-6 py-4">{booking.customerName}</td>
                                            <td className="px-6 py-4 text-xs">
                                                {formatDate(booking.startDate)} <span className="text-slate-400">/</span> {formatDate(booking.endDate)}
                                                {overdue.days > 0 && <span className="block mt-1 text-[9px] font-bold text-rose-600 bg-rose-100 px-1 rounded w-fit">LATE: {overdue.days} DAYS</span>}
                                            </td>
                                            <td className="px-6 py-4 font-black text-rose-600">₹{pending}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {booking.status === 'Paused' ? <Button onClick={() => setShowResumeModal(booking.id)}>Resume</Button> : (
                                                    isActive ? (
                                                        <>
                                                            <button onClick={() => setShowSettleModal(booking.id)} className="text-emerald-600 font-bold text-xs uppercase">Pay</button>
                                                            <button onClick={() => setShowExtendModal(booking.id)} className="text-brand-600 font-bold text-xs uppercase">Ext</button>
                                                            <button onClick={() => setShowPauseModal(booking.id)} className="text-amber-600 font-bold text-xs uppercase">Pause</button>
                                                            <Button variant="secondary" onClick={() => setShowReturnModal(booking.id)} className="text-xs">End</Button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs italic text-slate-400">Closed</span>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredCityBookings.length === 0 && (<tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No bookings found for this period.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showBookingModal && <Modal title="New Rental" onClose={() => setShowBookingModal(false)}><BookingForm cityId={props.selectedCityId} rates={props.rates} vehicles={props.vehicles} batteries={props.batteries} customers={props.customers} onClose={() => setShowBookingModal(false)} onAddNewCustomer={() => setShowQuickCustomerModal(true)} onSubmit={async d => { const ok = await props.addBooking(d); if (ok) setShowBookingModal(false); }} /></Modal>}
            {showQuickCustomerModal && <Modal title="Quick Rider Registration" onClose={() => setShowQuickCustomerModal(false)}><QuickCustomerForm onSubmit={(c) => { props.addCustomer({ ...c, cityId: props.selectedCityId }); setShowQuickCustomerModal(false); }} onCancel={() => setShowQuickCustomerModal(false)} /></Modal>}
            {showBatteryModal && <Modal title="Battery Swap Service" onClose={() => setShowBatteryModal(false)}><BatterySwapModal selectedCityId={props.selectedCityId} bookings={props.bookings} batteries={props.batteries} onClose={() => setShowBatteryModal(false)} onSwap={props.changeBatteryForBooking} /></Modal>}
            {showVehicleSwapModal && <Modal title="Vehicle Swap Service" onClose={() => setShowVehicleSwapModal(false)}><VehicleSwapModal selectedCityId={props.selectedCityId} bookings={props.bookings} vehicles={props.vehicles} onClose={() => setShowVehicleSwapModal(false)} onSwap={(bid, vid, reason, fine) => props.swapVehicleForBooking(bid, vid, reason, {}, fine)} /></Modal>}
            {showSettleModal && <Modal title="Collect Payment" onClose={() => setShowSettleModal(null)}>{(() => { const b = props.bookings.find(x => x.id === showSettleModal); return b ? <SettleDueModal booking={b} onClose={() => setShowSettleModal(null)} onConfirm={(a, e, er) => props.settleBookingDue(b.id, a, e, er)} /> : null; })()}</Modal>}
            {showExtendModal && <Modal title="Extend Ride" onClose={() => setShowExtendModal(null)}>{(() => { const b = props.bookings.find(x => x.id === showExtendModal); return b ? <ExtendRentalForm booking={b} rates={props.rates} onClose={() => setShowExtendModal(null)} onSubmit={(er, a, e) => props.extendBooking(b.id, er, a, e)} /> : null; })()}</Modal>}
            {showReturnModal && <Modal title="End Rental" onClose={() => setShowReturnModal(null)}>{(() => { const b = props.bookings.find(x => x.id === showReturnModal); return b ? <ReturnRideModal booking={b} onClose={() => setShowReturnModal(null)} onConfirm={d => props.updateBookingStatus(b.id, BookingStatus.Returned, d)} /> : null; })()}</Modal>}
            {showPauseModal && <Modal title="Pause Ride" onClose={() => setShowPauseModal(null)}><div className="space-y-4"><Input placeholder="Reason..." id="pause-reason" /><Button onClick={() => { const r = (document.getElementById('pause-reason') as HTMLInputElement).value; if (showPauseModal) props.pauseBooking(showPauseModal, r); setShowPauseModal(null); }} className="w-full">Confirm Pause</Button></div></Modal>}
            {showResumeModal && <Modal title="Resume Ride" onClose={() => setShowResumeModal(null)}><div className="space-y-4"><Select id="res-v">{props.vehicles.filter(v => v.cityId === props.selectedCityId && v.status === VehicleStatus.Available).map(v => <option key={v.id} value={v.id}>{v.modelName}</option>)}</Select><Select id="res-b">{props.batteries.filter(b => b.cityId === props.selectedCityId && b.status === BatteryStatus.Available).map(b => <option key={b.id} value={b.id}>{b.serialNumber}</option>)}</Select><Button onClick={() => { const v = Number((document.getElementById('res-v') as HTMLSelectElement).value); const b = Number((document.getElementById('res-b') as HTMLSelectElement).value); if (showResumeModal) props.resumeBooking(showResumeModal, v, b); setShowResumeModal(null); }} className="w-full">Resume Rental</Button></div></Modal>}
            
            {showOverdueModal && <Modal title="Overdue Rentals Alert" onClose={() => setShowOverdueModal(false)}><OverdueListModal bookings={activeCityBookings} onClose={() => setShowOverdueModal(false)} /></Modal>}
            
            {showActiveRentals && <Modal title="All Active Rentals" onClose={() => setShowActiveRentals(false)}><ActiveRentalsList bookings={activeCityBookings} /></Modal>}
            
            {showAvailableBikes && <Modal title="Available Bikes Inventory" onClose={() => setShowAvailableBikes(false)}><InventoryList items={availableBikesList} type="bike" /></Modal>}
            
            {showAvailableBatteries && <Modal title="Available Batteries" onClose={() => setShowAvailableBatteries(false)}><InventoryList items={availableBatteriesList} type="battery" /></Modal>}
            
            {showActiveCustomers && <Modal title="Active Customers Directory" onClose={() => setShowActiveCustomers(false)}><ActiveCustomersList bookings={activeCityBookings} /></Modal>}
        </div>
    );
};
