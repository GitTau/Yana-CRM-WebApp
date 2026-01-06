
export enum BookingStatus {
  Active = 'Active',
  Returned = 'Returned',
  PendingPayment = 'Pending Payment',
  Paused = 'Paused',
}

export enum VehicleStatus {
  Available = 'Available',
  Rented = 'Rented',
  Maintenance = 'Maintenance',
}

export enum BatteryStatus {
  Available = 'Available',
  InUse = 'InUse',
  Charging = 'Charging',
  Maintenance = 'Maintenance',
}

export enum PaymentMode {
  Cash = 'Cash',
  UPI = 'UPI',
  Card = 'Card',
  Other = 'Other',
}

export enum UserRole {
  Admin = 'Admin',
  Operator = 'Operator',
}

export enum ChecklistType {
  PreRide = 'Pre-Ride',
  PostRide = 'Post-Ride',
}

export enum HealthStatus {
  Good = 'Good',
  Attention = 'Attention',
  Critical = 'Critical'
}

export enum MaintenanceJobStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  WaitingParts = 'Waiting for Parts',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface City {
  id: number;
  name: string;
  zapPointAddress?: string;
}

export interface Rate {
  id: number;
  cityId: number;
  clientName?: string;
  dailyRent: number;
  monthlyRent?: number;
  securityDeposit: number;
}

export interface Vehicle {
  id: number;
  modelName: string;
  cityId: number;
  status: VehicleStatus;
  batteryId: number | null;
  healthStatus: HealthStatus; // ADDED
}

export interface SparePartMaster {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  minStockLevel: number;
}

export interface SpareInventory {
  id: number;
  partId: number;
  cityId: number;
  quantity: number;
  lastRestockedAt?: string;
}

export interface MaintenanceJob {
  id: number;
  vehicleId: number;
  cityId: number;
  status: MaintenanceJobStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  issueDescription: string;
  resolutionNotes?: string;
  assignedTechnician?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCost: number;
  actualCost: number;
  downtimeHours: number;
}

export interface JobPartUsed {
  id: number;
  jobId: number;
  partId: number;
  quantity: number;
  unitPriceAtTime: number;
}

export interface Battery {
  id: number;
  serialNumber: string;
  cityId: number;
  status: BatteryStatus;
  chargePercentage: number;
  assignedVehicleId: number | null;
  notes?: string;
}

export interface BankDetails {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
}

export interface Customer {
    id: number;
    name: string;
    phone: string;
    address: string;
    aadharNumber: string;
    panNumber: string;
    bankDetails: BankDetails;
    cityId?: number;
}

export interface Booking {
  id: number;
  customerName: string;
  customerPhone: string;
  vehicleId: number | null;
  batteryId: number | null;
  cityId: number;
  startDate: string;
  endDate: string;
  dailyRent: number;
  totalRent: number;
  securityDeposit: number;
  amountCollected: number;
  modeOfPayment: PaymentMode;
  paymentTransactionId?: string;
  status: BookingStatus;
  fineAmount?: number;
  postRideChecklist?: Record<string, boolean>;
  postRideNotes?: string;
  pauseReason?: string;
  pausedAt?: string;
}

export interface User {
  id: number;
  name: string;
  role: UserRole;
  cityId: number;
}

export interface Checklist {
  id: number;
  vehicleId: number;
  bookingId: number;
  type: ChecklistType;
  tyres: boolean;
  brakes: boolean;
  battery: boolean;
  notes?: string;
}

export interface RefundRequest {
  id: number;
  bookingId: number;
  customerName: string;
  amount: number;
  status: 'Pending' | 'Processed';
  date: string;
}

export interface VehicleLog {
  id: number;
  vehicleId: number;
  date: string;
  status: VehicleStatus;
  notes?: string;
  checklist?: Record<string, boolean>;
  bookingId?: number;
}
