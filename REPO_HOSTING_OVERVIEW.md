# Repository Hosting Overview

## What this repo is
YANA CRM WebApp is a React + TypeScript single-page application (SPA) for EV bike/scooter rental operations.

## What it hosts in the UI
The app hosts one web UI with three in-app panels (tabbed views):

1. **Operations**: rental lifecycle workflows (booking, return, pause/resume, swap vehicle/battery, payment settlement).
2. **Maintenance**: maintenance job cards, vehicle health and spare-part inventory workflows.
3. **Admin**: master-data and configuration workflows (rates, vehicles, batteries, users, cities, customers, legacy import).

## Backend and data hosting
The frontend connects directly to a hosted **Supabase** project and reads/writes these key tables:

- `cities`, `vehicles`, `rates`, `bookings`, `batteries`, `customers`, `users`, `refund_requests`, `vehicle_logs`
- `maintenance_jobs`, `spare_parts_master`, `spare_inventory`

A realtime channel subscribes to PostgreSQL change events and triggers data refresh in the UI.

## Runtime hosting/deployment shape
- Local dev server: Vite on `0.0.0.0:3000`.
- Build/preview scripts are standard Vite (`npm run build`, `npm run preview`).
- The README references an AI Studio hosted app entrypoint.

## Technology stack
- React 19 + TypeScript
- Vite 6
- Supabase JavaScript client
- Tailwind CSS utility classes in JSX

## Notes
- Authentication is currently stubbed to a default admin user in app state.
- Supabase URL and anon key are currently hardcoded in `supabaseClient.ts`.
