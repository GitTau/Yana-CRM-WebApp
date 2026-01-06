
# Bike Rental Management System - Architecture

## 1. System Overview
**Type:** Single Page Application (SPA)
**Frontend:** React 19, TypeScript, Tailwind CSS
**Backend:** Supabase (PostgreSQL)
**State Management:** Local React State (lifted to `App.tsx`) with prop drilling.

The application is split into three main views:
1.  **Operations Panel:** Daily tasks (Booking, Returns, Battery Swaps, Payments).
2.  **Maintenance CRM:** Fleet health, job cards, parts inventory, and downtime analytics.
3.  **Admin Panel:** Configuration (Inventory, Rates, Users, Reports).

---

## 2. Database Schema & Data Models

### [Existing Schema Tables 2.1 - 2.9 Remain Unchanged]

### 2.10 Table: `maintenance_jobs`
*Job cards for vehicle repairs.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | bigint (PK) | |
| `vehicleId` | bigint (FK) | |
| `cityId` | bigint (FK) | |
| `status` | text | 'Open', 'In Progress', 'Waiting for Parts', 'Completed' |
| `priority` | text | 'Low', 'Medium', 'High', 'Critical' |
| `issueDescription` | text | |
| `resolutionNotes` | text | |
| `assignedTechnician` | text | |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |
| `actualCost` | integer | Calculated from parts used |

### 2.11 Table: `spare_parts_master`
*Master catalog of spares.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | bigint (PK) | |
| `name` | text | e.g., "Disc Brake Pad" |
| `sku` | text | Unique identifier |
| `category` | text | Electrical, Mechanical, etc. |
| `unitPrice` | integer | |
| `minStockLevel` | integer | Threshold for alerts |

### 2.12 Table: `spare_inventory`
*City-wise stock levels.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | bigint (PK) | |
| `partId` | bigint (FK) | |
| `cityId` | bigint (FK) | |
| `quantity` | integer | |

### 2.13 Table: `job_parts_used`
*Link between jobs and parts consumed.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | bigint (PK) | |
| `jobId` | bigint (FK) | |
| `partId` | bigint (FK) | |
| `quantity` | integer | |
| `unitPriceAtTime` | integer | Historical price |

---

## 3. SQL Migration (Full Script)
```sql
-- 1. Extend Vehicles Table (Additive Only)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS "healthStatus" text DEFAULT 'Good';

-- 2. Spare Parts Catalog
CREATE TABLE IF NOT EXISTS public.spare_parts_master (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text,
  "unitPrice" integer NOT NULL,
  "minStockLevel" integer DEFAULT 5,
  "isActive" boolean DEFAULT true
);

-- 3. Inventory Management (Per City)
CREATE TABLE IF NOT EXISTS public.spare_inventory (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "partId" bigint REFERENCES public.spare_parts_master(id) ON DELETE CASCADE,
  "cityId" bigint REFERENCES public.cities(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  "lastRestockedAt" timestamp with time zone DEFAULT now(),
  UNIQUE("partId", "cityId")
);

-- 4. Maintenance Job Cards
CREATE TABLE IF NOT EXISTS public.maintenance_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "vehicleId" bigint REFERENCES public.vehicles(id) ON DELETE CASCADE,
  "cityId" bigint REFERENCES public.cities(id) ON DELETE CASCADE,
  status text DEFAULT 'Open', -- Open, In Progress, Waiting for Parts, Completed, Cancelled
  priority text DEFAULT 'Medium', -- Low, Medium, High, Critical
  "issueDescription" text NOT NULL,
  "resolutionNotes" text,
  "assignedTechnician" text,
  "startedAt" timestamp with time zone DEFAULT now(),
  "completedAt" timestamp with time zone,
  "estimatedCost" integer DEFAULT 0,
  "actualCost" integer DEFAULT 0,
  "downtimeHours" integer DEFAULT 0
);

-- 5. Parts Consumption Tracking
CREATE TABLE IF NOT EXISTS public.job_parts_used (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "jobId" bigint REFERENCES public.maintenance_jobs(id) ON DELETE CASCADE,
  "partId" bigint REFERENCES public.spare_parts_master(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  "unitPriceAtTime" integer NOT NULL
);

-- 6. Initial Spares Data (Optional/Seed)
INSERT INTO public.spare_parts_master (name, sku, category, "unitPrice", "minStockLevel")
VALUES 
('Brake Pad Set', 'BRK-PAD-EV01', 'Braking', 450, 10),
('Throttle Assembly', 'ELC-THR-EV01', 'Electrical', 1200, 5),
('Tubeless Tyre (Rear)', 'WHL-TYR-EV01', 'Wheel', 1800, 4),
('LED Headlight', 'ELC-LGT-EV01', 'Electrical', 950, 3),
('Drive Chain', 'MEC-CHN-EV01', 'Mechanical', 650, 8)
ON CONFLICT (sku) DO NOTHING;
```
