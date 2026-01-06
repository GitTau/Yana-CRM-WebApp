
import { City, Rate, Vehicle, Booking, User, BookingStatus, VehicleStatus, PaymentMode, UserRole, Battery, BatteryStatus, Customer, HealthStatus } from './types';

// --- Configuration ---
export const COMPANY_CONFIG = {
  name: 'YANA Rentals', // Your Merchant Name
  upiId: '9692610149@okbizaxis', // REPLACE THIS with your Google Pay Business UPI ID (e.g., yourname@okaxis)
};

export const CITIES: City[] = [
  { id: 1, name: 'San Francisco' },
  { id: 2, name: 'New York' },
  { id: 3, name: 'Austin' },
];

export const RATES: Rate[] = [
  { id: 1, cityId: 1, dailyRent: 250, monthlyRent: 5000, securityDeposit: 1000 },
  { id: 2, cityId: 2, dailyRent: 300, monthlyRent: 6000, securityDeposit: 1200 },
  { id: 3, cityId: 3, dailyRent: 220, monthlyRent: 4500, securityDeposit: 900 },
  { id: 4, cityId: 1, clientName: 'Corporate A', dailyRent: 200, monthlyRent: 4000, securityDeposit: 800 },
];

export const BATTERIES: Battery[] = [
  { id: 1, serialNumber: 'BATT-SF-001', cityId: 1, status: BatteryStatus.InUse, chargePercentage: 88, assignedVehicleId: 102 },
  { id: 2, serialNumber: 'BATT-SF-002', cityId: 1, status: BatteryStatus.Available, chargePercentage: 100, assignedVehicleId: null },
  { id: 3, serialNumber: 'BATT-NYC-001', cityId: 2, status: BatteryStatus.Charging, chargePercentage: 45, assignedVehicleId: null },
  { id: 4, serialNumber: 'BATT-NYC-002', cityId: 2, status: BatteryStatus.Available, chargePercentage: 92, assignedVehicleId: 103 },
  { id: 5, serialNumber: 'BATT-AU-001', cityId: 3, status: BatteryStatus.Available, chargePercentage: 76, assignedVehicleId: 105 },
  { id: 6, serialNumber: 'BATT-SF-003', cityId: 1, status: BatteryStatus.Maintenance, chargePercentage: 0, assignedVehicleId: null },
];

// Added missing healthStatus property to match Vehicle interface
export const VEHICLES: Vehicle[] = [
  { id: 101, modelName: 'E-Bike One', cityId: 1, status: VehicleStatus.Available, batteryId: null, healthStatus: HealthStatus.Good },
  { id: 102, modelName: 'E-Bike One', cityId: 1, status: VehicleStatus.Rented, batteryId: 1, healthStatus: HealthStatus.Good },
  { id: 103, modelName: 'E-Scooter Plus', cityId: 2, status: VehicleStatus.Available, batteryId: 4, healthStatus: HealthStatus.Good },
  { id: 104, modelName: 'E-Scooter Plus', cityId: 2, status: VehicleStatus.Maintenance, batteryId: null, healthStatus: HealthStatus.Attention },
  { id: 105, modelName: 'E-Bike Pro', cityId: 3, status: VehicleStatus.Available, batteryId: 5, healthStatus: HealthStatus.Good },
  { id: 106, modelName: 'E-Bike Pro', cityId: 1, status: VehicleStatus.Available, batteryId: null, healthStatus: HealthStatus.Good },
];

export const BOOKINGS: Booking[] = [
  {
    id: 1,
    customerName: 'John Doe',
    customerPhone: '123-456-7890',
    vehicleId: 102,
    batteryId: 1,
    cityId: 1,
    startDate: '2024-07-28',
    endDate: '2024-07-30',
    dailyRent: 25,
    totalRent: 50,
    securityDeposit: 100,
    amountCollected: 150,
    modeOfPayment: PaymentMode.Card,
    status: BookingStatus.Active,
  },
];

export const USERS: User[] = [
  { id: 1, name: 'Admin User', role: UserRole.Admin, cityId: 1 },
  { id: 2, name: 'Operator SF', role: UserRole.Operator, cityId: 1 },
  { id: 3, name: 'Operator NYC', role: UserRole.Operator, cityId: 2 },
];

export const CUSTOMERS: Customer[] = [
    {
        id: 1,
        name: 'John Doe',
        phone: '123-456-7890',
        address: '123 Market St, San Francisco',
        aadharNumber: '123456789012',
        panNumber: 'ABCDE1234F',
        bankDetails: {
            accountName: 'John Doe',
            accountNumber: '9876543210',
            bankName: 'City Bank',
            ifscCode: 'CITI0001234'
        }
    }
];

export const POST_RIDE_CHECKLIST_ITEMS = [
    { label: 'Control Panel', fine: 0 },
    { label: 'Fan', fine: 850 },
    { label: 'Brake Shoe', fine: 0 },
    { label: 'Wiring', fine: 100 },
    { label: 'Wheel/Motor', fine: 1000 },
    { label: 'Handle', fine: 750 },
    { label: 'Horn & Light', fine: 0 },
    { label: 'Brake Lever', fine: 350 },
    { label: 'Wheel Jam/Broken', fine: 500 },
    { label: 'Wheel Puncture', fine: 0 },
    { label: 'Key Missing/Broken', fine: 1000 },
    { label: 'Switches', fine: 500 },
    { label: 'Number Plates', fine: 500 },
    { label: 'Scratches', fine: 500 },
    { label: 'Seat Cover', fine: 500 },
];
