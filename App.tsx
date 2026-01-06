
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Booking, Vehicle, Rate, User, City, BookingStatus, VehicleStatus, 
    Battery, BatteryStatus, RefundRequest, Customer, VehicleLog,
    MaintenanceJob, SparePartMaster, SpareInventory, HealthStatus, MaintenanceJobStatus, UserRole
} from './types';
import { OperationsPanel } from './components/OperationsPanel';
import { AdminPanel } from './components/AdminPanel';
import { MaintenancePanel } from './components/MaintenancePanel';
import { YanaLogo } from './components/Logo';
import { supabase } from './supabaseClient';

type View = 'operations' | 'maintenance' | 'admin';

interface CurrentUser {
    name: string;
    role: UserRole;
    cityId: number; // 0 for Admin (all access)
}

const App: React.FC = () => {
    // Auth State - Default to Admin User
    const [currentUser] = useState<CurrentUser>({
        name: 'Admin User',
        role: UserRole.Admin,
        cityId: 0
    });

    // Data State
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [rates, setRates] = useState<Rate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [batteries, setBatteries] = useState<Battery[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
    const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>([]);
    
    // Maintenance State
    const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
    const [partsMaster, setPartsMaster] = useState<SparePartMaster[]>([]);
    const [inventory, setInventory] = useState<SpareInventory[]>([]);

    const [view, setView] = useState<View>('operations');
    const [selectedCityId, setSelectedCityId] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // No login/logout handlers needed

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        setIsSyncing(true);
        try {
            const [
                citiesRes, vehiclesRes, ratesRes, bookingsRes, batteriesRes,
                customersRes, usersRes, refundRequestsRes, logsRes,
                jobsRes, partsRes, invRes
            ] = await Promise.all([
                supabase.from('cities').select('*').order('id', { ascending: true }),
                supabase.from('vehicles').select('*').order('id', { ascending: false }),
                supabase.from('rates').select('*'),
                supabase.from('bookings').select('*'),
                supabase.from('batteries').select('*'),
                supabase.from('customers').select('*').order('name', { ascending: true }),
                supabase.from('users').select('*'),
                supabase.from('refund_requests').select('*'),
                supabase.from('vehicle_logs').select('*'),
                supabase.from('maintenance_jobs').select('*'),
                supabase.from('spare_parts_master').select('*'),
                supabase.from('spare_inventory').select('*')
            ]);

            setCities(citiesRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setRates(ratesRes.data || []);
            setBookings(bookingsRes.data || []);
            setBatteries(batteriesRes.data || []);
            setCustomers(customersRes.data || []);
            setUsers(usersRes.data || []);
            setRefundRequests(refundRequestsRes.data || []);
            setVehicleLogs(logsRes.data || []);
            setJobs(jobsRes.data || []);
            if (partsRes.data) setPartsMaster(partsRes.data);
            setInventory(invRes.data || []);
            
            // If admin and selected city is invalid, reset.
            if (currentUser?.role === UserRole.Admin && citiesRes.data?.length > 0 && !citiesRes.data.find(c => c.id === selectedCityId)) {
                setSelectedCityId(citiesRes.data[0].id);
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [selectedCityId, currentUser]);

    useEffect(() => {
        // Always fetch since we are "logged in"
        fetchData();
        const channel = supabase.channel('db-all-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchData(true);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleAction = async (promise: Promise<any>) => {
        try {
            const { error } = await promise;
            if (error) throw error;
            await fetchData(true);
            return true;
        } catch (error: any) {
            alert(`Error: ${error.message}`);
            return false;
        }
    };

    const addBooking = async (newBookingData: Omit<Booking, 'id'>): Promise<boolean> => {
        try {
            const { data, error } = await supabase.from('bookings').insert([newBookingData]).select().single();
            if (error) throw error;
            await Promise.all([
                supabase.from('vehicles').update({ status: VehicleStatus.Rented, batteryId: data.batteryId }).eq('id', data.vehicleId),
                data.batteryId ? supabase.from('batteries').update({ status: BatteryStatus.InUse, assignedVehicleId: data.vehicleId }).eq('id', data.batteryId) : Promise.resolve()
            ]);
            await fetchData(true);
            return true;
        } catch (error: any) { alert(error.message); return false; }
    };

    const updateBooking = async (booking: Booking) => {
        try {
            const { error } = await supabase.from('bookings').update(booking).eq('id', booking.id);
            if (error) throw error;
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const deleteBooking = async (id: number) => {
         try {
            const { error } = await supabase.from('bookings').delete().eq('id', id);
            if (error) throw error;
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const updateBookingStatus = async (bookingId: number, status: BookingStatus, checklistData?: any) => {
        try {
            const { data: currentBooking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
            if (!currentBooking) return;
            const updateData: any = { status };
            if (checklistData) {
                updateData.fineAmount = (currentBooking.fineAmount || 0) + (checklistData.fine || 0);
                updateData.amountCollected = (currentBooking.amountCollected || 0) + (checklistData.settlementAdjustment || 0);
            }
            await supabase.from('bookings').update(updateData).eq('id', bookingId);
            if (status === BookingStatus.Returned) {
                const updates = [];
                if (currentBooking.batteryId) updates.push(supabase.from('batteries').update({ status: BatteryStatus.Available, assignedVehicleId: null }).eq('id', currentBooking.batteryId));
                if (currentBooking.vehicleId) updates.push(supabase.from('vehicles').update({ status: checklistData?.targetVehicleStatus || VehicleStatus.Available, batteryId: null }).eq('id', currentBooking.vehicleId));
                await Promise.all(updates);
            }
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const changeBatteryForBooking = async (bookingId: number, newBatteryId: number) => {
        try {
            const b = bookings.find(x => x.id === bookingId);
            if (!b) return;
            const updates = [];
            if (b.batteryId) updates.push(supabase.from('batteries').update({ status: BatteryStatus.Available, assignedVehicleId: null }).eq('id', b.batteryId));
            updates.push(supabase.from('bookings').update({ batteryId: newBatteryId }).eq('id', bookingId));
            updates.push(supabase.from('batteries').update({ status: BatteryStatus.InUse, assignedVehicleId: b.vehicleId }).eq('id', newBatteryId));
            await Promise.all(updates);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const pauseBooking = async (bookingId: number, reason: string) => {
        try {
            const b = bookings.find(x => x.id === bookingId);
            if (!b) return;
            await supabase.from('bookings').update({ status: BookingStatus.Paused, pauseReason: reason, pausedAt: new Date().toISOString() }).eq('id', bookingId);
            if (b.vehicleId) await supabase.from('vehicles').update({ status: VehicleStatus.Available, batteryId: null }).eq('id', b.vehicleId);
            if (b.batteryId) await supabase.from('batteries').update({ status: BatteryStatus.Available, assignedVehicleId: null }).eq('id', b.batteryId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const resumeBooking = async (bookingId: number, vehicleId: number, batteryId: number | null) => {
        try {
            await supabase.from('bookings').update({ status: BookingStatus.Active, vehicleId, batteryId }).eq('id', bookingId);
            await supabase.from('vehicles').update({ status: VehicleStatus.Rented, batteryId }).eq('id', vehicleId);
            if (batteryId) await supabase.from('batteries').update({ status: BatteryStatus.InUse, assignedVehicleId: vehicleId }).eq('id', batteryId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const swapVehicleForBooking = async (bookingId: number, newVehicleId: number, reason: string, checklist: any, fineAdjustment: number) => {
        try {
            const b = bookings.find(x => x.id === bookingId);
            if (!b) return;
            if (b.vehicleId) await supabase.from('vehicles').update({ status: VehicleStatus.Available, batteryId: null }).eq('id', b.vehicleId);
            await supabase.from('bookings').update({ vehicleId: newVehicleId, fineAmount: (b.fineAmount || 0) + fineAdjustment }).eq('id', bookingId);
            await supabase.from('vehicles').update({ status: VehicleStatus.Rented, batteryId: b.batteryId }).eq('id', newVehicleId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const extendBooking = async (bookingId: number, extraRent: number, collection: number, newEndDate: string) => {
        try {
            const b = bookings.find(x => x.id === bookingId);
            if (!b) return;
            await supabase.from('bookings').update({ totalRent: (b.totalRent || 0) + extraRent, amountCollected: (b.amountCollected || 0) + collection, endDate: newEndDate }).eq('id', bookingId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const settleBookingDue = async (bookingId: number, amount: number, newEndDate?: string, extraRent?: number) => {
        try {
            const b = bookings.find(x => x.id === bookingId);
            if (!b) return;
            const up: any = { amountCollected: (b.amountCollected || 0) + amount };
            if (newEndDate) up.endDate = newEndDate;
            if (extraRent) up.totalRent = (b.totalRent || 0) + extraRent;
            await supabase.from('bookings').update(up).eq('id', bookingId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const addVehicle = (v: any) => handleAction(supabase.from('vehicles').insert([v]));
    const updateVehicle = (v: any) => handleAction(supabase.from('vehicles').update(v).eq('id', v.id));
    const deleteVehicle = (id: number) => handleAction(supabase.from('vehicles').delete().eq('id', id));
    
    const updateVehicleStatus = (id: number, status: VehicleStatus, notes?: string, checklist?: Record<string, boolean>) => 
        handleAction(supabase.from('vehicles').update({ status }).eq('id', id));

    const addBattery = (b: any) => handleAction(supabase.from('batteries').insert([b]));
    const updateBattery = (b: any) => handleAction(supabase.from('batteries').update(b).eq('id', b.id));
    const deleteBattery = (id: number) => handleAction(supabase.from('batteries').delete().eq('id', id));
    const updateBatteryStatus = (id: number, status: BatteryStatus) => handleAction(supabase.from('batteries').update({ status }).eq('id', id));

    const addRate = (r: any) => handleAction(supabase.from('rates').insert([r]));
    const updateRate = (r: any) => handleAction(supabase.from('rates').update(r).eq('id', r.id));
    const deleteRate = (id: number) => handleAction(supabase.from('rates').delete().eq('id', id));

    const addCity = (name: string, addr?: string) => handleAction(supabase.from('cities').insert([{ name, zapPointAddress: addr }]));
    const updateCity = (id: number, name: string, addr?: string) => handleAction(supabase.from('cities').update({ name, zapPointAddress: addr }).eq('id', id));

    const addUser = (u: any) => handleAction(supabase.from('users').insert([u]));
    const deleteUser = (id: number) => handleAction(supabase.from('users').delete().eq('id', id));

    const addCustomer = (c: any) => handleAction(supabase.from('customers').insert([c]));
    const updateCustomer = (c: any) => handleAction(supabase.from('customers').update(c).eq('id', c.id));
    const deleteCustomer = (id: number) => handleAction(supabase.from('customers').delete().eq('id', id));

    const createMaintenanceJob = async (job: Omit<MaintenanceJob, 'id'>) => {
        try {
            await supabase.from('maintenance_jobs').insert([job]);
            await supabase.from('vehicles').update({ status: VehicleStatus.Maintenance }).eq('id', job.vehicleId);
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };

    const updateJobStatus = async (jobId: number, status: MaintenanceJobStatus) => {
        try {
            const job = jobs.find(j => j.id === jobId);
            if (!job) return;
            await supabase.from('maintenance_jobs').update({ status, completedAt: status === MaintenanceJobStatus.Completed ? new Date().toISOString() : null }).eq('id', jobId);
            if (status === MaintenanceJobStatus.Completed) {
                await supabase.from('vehicles').update({ status: VehicleStatus.Available, healthStatus: HealthStatus.Good }).eq('id', job.vehicleId);
            }
            await fetchData(true);
        } catch (error: any) { alert(error.message); }
    };
    
    const handleLegacyImport = async (data: any[]) => {
        setIsLoading(true);
        try {
            // 0. Seeding Phase: Ensure Vehicles and Batteries exist
            // This prevents Foreign Key constraints from failing if the logs reference non-existent inventory
            
            const uniqueVehicleIds = [...new Set(data.map(r => r.vehicleId).filter(id => id))];
            const uniqueBatteryIds = [...new Set(data.map(r => r.batteryId).filter(id => id))];

            // A. Seed Vehicles
            for (const vid of uniqueVehicleIds) {
                // Check if vehicle exists locally or in fetched state (optimisation)
                // We'll trust the DB query for truth
                const { data: existing } = await supabase.from('vehicles').select('id').eq('id', vid).single();
                if (!existing) {
                    const row = data.find(r => r.vehicleId === vid);
                    // Insert placeholder vehicle
                    await supabase.from('vehicles').insert([{
                        id: vid,
                        modelName: 'Imported Vehicle',
                        cityId: row?.cityId || selectedCityId,
                        status: VehicleStatus.Available, // Status will be fixed by active bookings loop later
                        healthStatus: HealthStatus.Good
                    }]);
                }
            }

            // B. Seed Batteries
            for (const bid of uniqueBatteryIds) {
                const { data: existing } = await supabase.from('batteries').select('id').eq('id', bid).single();
                if (!existing) {
                    const row = data.find(r => r.batteryId === bid);
                    await supabase.from('batteries').insert([{
                        id: bid,
                        serialNumber: `BATT-${bid}`,
                        cityId: row?.cityId || selectedCityId,
                        status: BatteryStatus.Available,
                        chargePercentage: 100
                    }]);
                }
            }

            let processedCount = 0;
            for (const row of data) {
                 if (!row.customerName) continue;

                 // 1. Ensure Customer Exists
                 let customerId;
                 const { data: existingC } = await supabase.from('customers').select('id').eq('name', row.customerName).single();
                 
                 if (existingC) {
                     customerId = existingC.id;
                 } else {
                     const { data: newC, error: cErr } = await supabase.from('customers').insert([{
                         name: row.customerName,
                         phone: row.customerPhone || '0000000000',
                         address: '',
                         aadharNumber: '',
                         bankDetails: {} 
                     }]).select().single();
                     if (cErr) throw cErr;
                     customerId = newC.id;
                 }

                 // Determine Status
                 let finalStatus = BookingStatus.Active;
                 const s = (row.status || '').toLowerCase();
                 if (s.includes('active') || s.includes('rented')) finalStatus = BookingStatus.Active;
                 else if (s.includes('paused')) finalStatus = BookingStatus.Paused;
                 else if (s.includes('pending')) finalStatus = BookingStatus.PendingPayment;
                 else finalStatus = BookingStatus.Returned;

                 // 2. Create Booking
                 const { error: bErr } = await supabase.from('bookings').insert([{
                     customerName: row.customerName,
                     customerPhone: row.customerPhone || '0000000000',
                     vehicleId: row.vehicleId || null,
                     batteryId: row.batteryId || null,
                     cityId: row.cityId || selectedCityId,
                     startDate: row.startDate,
                     endDate: row.endDate,
                     status: finalStatus,
                     dailyRent: 0, 
                     totalRent: row.totalRent || 0,
                     amountCollected: row.amountCollected || 0,
                     securityDeposit: row.securityDeposit || 0,
                     fineAmount: row.fineAmount || 0,
                     modeOfPayment: 'Cash'
                 }]);
                 
                 if (bErr) throw bErr;

                 // 3. Update Inventory Status if Active
                 if (finalStatus === BookingStatus.Active && row.vehicleId) {
                     await supabase.from('vehicles').update({ status: 'Rented', batteryId: row.batteryId || null }).eq('id', row.vehicleId);
                     if (row.batteryId) {
                         await supabase.from('batteries').update({ status: 'InUse', assignedVehicleId: row.vehicleId }).eq('id', row.batteryId);
                     }
                 }
                 processedCount++;
            }
            await fetchData(true);
            alert(`Import successful! ${processedCount} records processed. Missing inventory was automatically created.`);
        } catch (e: any) {
            console.error(e);
            alert('Import failed: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
            <YanaLogo className="w-24 h-24" loading={true} />
            <p className="animate-pulse font-bold text-slate-400 uppercase tracking-widest text-xs">Initialising Fleet...</p>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900">
            <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm">
                <div className="max-w-screen-2xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <YanaLogo className="w-9 h-9" />
                            <h1 className="font-black text-xl tracking-tight text-slate-900">YANA<span className="text-brand-600">Ops</span></h1>
                        </div>
                        {isSyncing && <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-brand-50 rounded-full border border-brand-100 animate-pulse"><div className="w-1.5 h-1.5 bg-brand-500 rounded-full" /><span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Syncing</span></div>}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Tab Switcher */}
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button onClick={() => setView('operations')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-tighter rounded-md transition-all ${view === 'operations' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Operations</button>
                            <button onClick={() => setView('maintenance')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-tighter rounded-md transition-all ${view === 'maintenance' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Maintenance</button>
                            <button onClick={() => setView('admin')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-tighter rounded-md transition-all ${view === 'admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Admin</button>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Administrator</p>
                            </div>
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">A</div>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-screen-2xl mx-auto">
                {/* City Switcher - Always Visible since Admin is default */}
                <div className="bg-slate-50 px-6 py-2 border-b sticky top-16 z-30 flex gap-2 overflow-x-auto no-scrollbar items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 mr-2 whitespace-nowrap">City Hubs:</span>
                    {cities.map(c => <button key={c.id} onClick={() => setSelectedCityId(c.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${c.id === selectedCityId ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:border-slate-300'}`}>{c.name}</button>)}
                    <button onClick={() => fetchData(true)} className="ml-auto p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"><svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                </div>

                {view === 'operations' && (
                    <OperationsPanel 
                        selectedCityId={selectedCityId} bookings={bookings} vehicles={vehicles} rates={rates} cities={cities} batteries={batteries} users={users} customers={customers} vehicleLogs={vehicleLogs} 
                        addBooking={addBooking} addCustomer={addCustomer} updateBookingStatus={updateBookingStatus} pauseBooking={pauseBooking} resumeBooking={resumeBooking} 
                        changeBatteryForBooking={changeBatteryForBooking} swapVehicleForBooking={swapVehicleForBooking} settleBookingDue={settleBookingDue} extendBooking={extendBooking} 
                        raiseRefundRequest={()=>{}} updateBatteryStatus={updateBatteryStatus} updateVehicleStatus={updateVehicleStatus} refreshData={() => fetchData(true)} 
                    />
                )}
                {view === 'maintenance' && (
                    <MaintenancePanel 
                        selectedCityId={selectedCityId} vehicles={vehicles} cities={cities} jobs={jobs} partsMaster={partsMaster} inventory={inventory} 
                        updateVehicleHealth={()=>{}} updateVehicleStatus={updateVehicleStatus} createJob={createMaintenanceJob} updateJobStatus={updateJobStatus} 
                    />
                )}
                {view === 'admin' && (
                    <AdminPanel 
                        rates={rates} vehicles={vehicles} users={users} cities={cities} customers={customers} bookings={bookings} batteries={batteries} refundRequests={refundRequests} 
                        addCustomer={addCustomer} updateCustomer={updateCustomer} deleteCustomer={deleteCustomer} bulkImportCustomers={()=>{}} 
                        addVehicle={addVehicle} updateVehicle={updateVehicle} deleteVehicle={deleteVehicle} bulkImportVehicles={()=>{}} 
                        addBattery={addBattery} updateBattery={updateBattery} deleteBattery={deleteBattery} bulkImportBatteries={()=>{}} 
                        addRate={addRate} updateRate={updateRate} deleteRate={deleteRate} bulkImportRates={()=>{}} 
                        addUser={addUser} deleteUser={deleteUser} addCity={addCity} updateCity={updateCity} 
                        processRefundRequest={()=>{}} settleBookingDue={(id: any) => settleBookingDue(id, 0)} 
                        importLegacyData={handleLegacyImport}
                        updateBooking={updateBooking} deleteBooking={deleteBooking}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
