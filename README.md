# Quartzite Management System (QMS)

Production-ready web application foundation for **Quartzite Management System (QMS)**, built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

---

## 1. Technology Stack

* **Frontend Framework**: Next.js 15 (App Router, Server Components & Client Components)
* **Language**: TypeScript (Strict Mode)
* **Styling**: Tailwind CSS (Clean, serious enterprise slate/stone management theme)
* **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security, Realtime)
* **Deployment**: Vercel-ready with zero local-only dependencies
* **PWA**: Chrome & Mobile Progressive Web App (Service Worker, Web App Manifest, Standalone mode, Web Push foundation)

---

## 2. Product Identity & Architecture

QMS provides a unified internal operational cockpit for:
- **Team Meetings**: Internal WebRTC video conferences (SFU planned) & external fallback links
- **Attendance Records**: Automated and manual check-ins
- **Points Ledger**: Activity-driven point transactions and rules
- **Announcements**: Company-wide broadcasts
- **Notifications**: Personal notifications and system alerts
- **Administrative Control**: User role management and security audit logs

### Core Relationship Loop
```
MEETING
   ↓
ATTENDANCE
   ↓
POINT RULE
   ↓
POINT TRANSACTION
   ↓
USER POINT HISTORY
```

---

## 3. Roles & Permissions (RBAC)

Three distinct authorization tiers are enforced both in the Next.js frontend/middleware and at the database layer via Supabase Row-Level Security (RLS):

1. **`SUPER_ADMIN`**:
   - Initial Super Admin account: `hemantraghavkr@gmail.com`
   - Complete system control
   - Manage user profiles & promote/demote accounts to `ADMIN` or `SUPER_ADMIN`
   - Create, edit, and deactivate point evaluation rules
   - Inspect immutable audit logs
2. **`ADMIN`**:
   - Schedule and manage meetings
   - Manage meeting participants
   - Mark and review organization-wide attendance
   - Issue point awards and penalties
   - Publish company announcements
   - Inspect audit logs
3. **`MEMBER`**:
   - View calendar of invited meetings
   - Join live internal sessions or external meeting links
   - Track personal attendance history
   - Review personal points balance and transaction ledger
   - View announcements and notifications

---

## 4. Getting Started

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd QMS
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the keys from your Supabase Project Settings:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply Database Migrations
Execute the SQL migration located in `supabase/migrations/20260921000000_initial_schema.sql` in your Supabase SQL Editor.
Optionally run `supabase/seed.sql` to populate default point rules and welcome announcements.

The migration automatically creates:
- Tables: `profiles`, `meetings`, `meeting_participants`, `attendance`, `point_rules`, `point_transactions`, `announcements`, `notifications`, `audit_logs`
- Triggers: Auto-creates a profile upon auth signup and guarantees `hemantraghavkr@gmail.com` receives `SUPER_ADMIN`
- Strict RLS Policies for every table

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 5. Production Build & Verification

To verify that the application compiles without TypeScript or build issues:
```bash
npm run build
```

---

## 6. Progressive Web App (PWA)

- **Manifest**: Located at `/manifest.json` configured for standalone installation.
- **Service Worker**: `/sw.js` handles offline shell caching and provides the foundation for real Web Push notifications.
- **Install**: In Google Chrome or Microsoft Edge, click the **Install App** icon in the address bar to install QMS as a desktop application. On mobile devices, tap **Add to Home Screen**.

---

## 7. Future WebRTC SFU Architecture

Internal video conferencing is planned around a **Selective Forwarding Unit (SFU)** using LiveKit or Mediasoup. Full design specification and contracts are available in:
- `src/features/meetings/architecture/sfu-architecture.md`
- `src/features/meetings/architecture/webrtc-contracts.ts`
