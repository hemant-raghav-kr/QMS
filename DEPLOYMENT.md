# Quartzite Management System (QMS) — Production Deployment Guide

This document provides complete instructions for deploying the **Quartzite Management System (QMS)** into a production environment.

---

## 1. System Architecture

Quartzite Management System is a modular, high-reliability enterprise operations platform built with:
- **Web Application**: Next.js 15 (App Router, Server Components, TypeScript, Tailwind CSS)
- **Database & Auth**: Supabase PostgreSQL 15+ with Row Level Security (RLS) and realtime subscriptions
- **Point Ledger**: Append-only, immutable transaction ledger with idempotency keys and atomic reversals
- **Real-Time Video/Audio/Screen**: LiveKit SFU (Selective Forwarding Unit) WebRTC infrastructure
- **Notifications & Alerts**: Web Push (VAPID) service worker + in-app notification center
- **Compliance & Backups**: Weekly automated PDF audit report generator + Resend transactional email dispatch
- **PWA**: Progressive Web App with standalone manifest, responsive layouts, and offline caching

---

## 2. Configuration Status Matrix

| Component | Status | Description |
| :--- | :--- | :--- |
| **Next.js Application Code** | ✅ **Already Configured** | Fully built, typed, and audited |
| **Database Migrations** | ✅ **Already Configured** | 4 migrations in `supabase/migrations/` ready for `supabase db push` |
| **Attendance & Points Engine** | ✅ **Already Configured** | Automated rollups, idempotency keys, atomic reversals in SQL & TS |
| **Cron Endpoint Protection** | ✅ **Already Configured** | Protected by `CRON_SECRET` Bearer token or Admin session |
| **PDF Compliance Generator** | ✅ **Already Configured** | jsPDF A4 report generator with itemized audit records |
| **PWA Manifest & Service Worker** | ✅ **Already Configured** | Manifest, service worker, icons, and viewport meta |
| **Responsive & Dark Theme** | ✅ **Already Configured** | Zero-FOUC theme engine supporting 320px–1920px viewports |
| **LiveKit SFU Cloud** | ⚠️ **Requires Production Configuration** | Supply LiveKit Cloud credentials in `.env.local` |
| **Resend Email Service** | ⚠️ **Requires Production Configuration** | Supply API key & verified sender domain in `.env.local` |
| **VAPID Keys** | ⚠️ **Requires Production Configuration** | Generate VAPID key pair and set in `.env.local` |
| **Supabase Cloud Instance** | ⚠️ **Requires Production Configuration** | Create project and apply migrations |

---

## 3. Production Environment Variables Checklist

Configure the following variables in your hosting provider (e.g. Vercel Project Settings > Environment Variables):

```ini
# --- SUPABASE DATABASE & AUTHENTICATION (New Supabase API Keys) ---
# From Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[YOUR_PUBLISHABLE_KEY]
SUPABASE_SECRET_KEY=[YOUR_SECRET_KEY]
# Optional / Legacy fallbacks:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_LEGACY_ANON_KEY]
# SUPABASE_SERVICE_ROLE_KEY=[YOUR_LEGACY_SERVICE_ROLE_KEY]

# --- APPLICATION CANONICAL URL ---
# Must match your public production domain (no trailing slash)
NEXT_PUBLIC_APP_URL=https://quartzitemanagementsystem.vercel.app

# --- LIVEKIT SFU WEBRTC MEDIA ---
# From LiveKit Cloud Console (https://cloud.livekit.io)
LIVEKIT_URL=wss://[YOUR_PROJECT].livekit.cloud
LIVEKIT_API_KEY=[YOUR_LIVEKIT_API_KEY]
LIVEKIT_API_SECRET=[YOUR_LIVEKIT_API_SECRET]
NEXT_PUBLIC_LIVEKIT_URL=wss://[YOUR_PROJECT].livekit.cloud

# --- WEB PUSH / VAPID NOTIFICATIONS ---
# Generate using: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=[YOUR_VAPID_PUBLIC_KEY]
VAPID_PRIVATE_KEY=[YOUR_VAPID_PRIVATE_KEY]
VAPID_SUBJECT=mailto:admin@yourdomain.com

# --- RESEND TRANSACTIONAL EMAIL ---
# From Resend Dashboard (https://resend.com/api-keys)
RESEND_API_KEY=re_[YOUR_RESEND_API_KEY]
RESEND_FROM_EMAIL="Quartzite Management System <reports@yourdomain.com>"
WEEKLY_REPORT_EMAIL=admin@yourdomain.com

# --- SCHEDULED CRON JOB AUTHENTICATION ---
# Generate a cryptographically secure random token (e.g., openssl rand -hex 32)
CRON_SECRET=[YOUR_32_CHAR_RANDOM_SECRET]
```

---

## 4. Step-by-Step Production Deployment

### Step 4.1: Database Provisioning (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Install the Supabase CLI locally:
   ```bash
   npx.cmd supabase login
   npx.cmd supabase link --project-ref [YOUR_PROJECT_REF]
   ```
3. Apply all migrations in order:
   ```bash
   npx.cmd supabase db push
   ```
   This deploys:
   - `20260921000000_initial_schema.sql` (Profiles, Meetings, Transactions, RLS policies)
   - `20260921000001_phase2_meetings_schema.sql` (LiveKit WebRTC presence, sessions)
   - `20260921000002_phase3_points_attendance_schema.sql` (Points engine, idempotency, atomic reversals)
   - `20260921000003_phase4_schema.sql` (Push subscriptions, weekly reports, reminders)
4. (Optional) Run seed data:
   ```bash
   npx.cmd supabase db execute --file supabase/seed.sql
   ```
5. In Supabase Dashboard:
   - **Authentication > URL Configuration**: Set Site URL to `https://quartzitemanagementsystem.vercel.app` and add `https://quartzitemanagementsystem.vercel.app/**` to Redirect URLs.
   - **Authentication > Email Templates**: Customize password reset and confirmation emails if desired.

### Step 4.2: LiveKit WebRTC SFU Media Setup
1. Create an account at [cloud.livekit.io](https://cloud.livekit.io).
2. Create a new project (e.g. `quartzite-production`).
3. Under **Settings > Keys**, generate an API Key & Secret.
4. Copy `WebSocket URL`, `API Key`, and `API Secret` into your production environment variables.

### Step 4.3: Resend Email & Domain Verification
1. Sign up at [resend.com](https://resend.com).
2. Navigate to **Domains > Add Domain** and add `yourdomain.com`.
3. Add the required DNS records (`MX`, `TXT/SPF`, and `DKIM`) in your DNS provider (Cloudflare, Route53, Namecheap, etc.).
4. Once verified, create an API Key under **API Keys** and add it to `RESEND_API_KEY`.

### Step 4.4: Web Push VAPID Key Generation
Run the following command to generate production VAPID keys:
```bash
npx.cmd web-push generate-vapid-keys
```
Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` accordingly.

### Step 4.5: Scheduled Jobs / Cron Configuration
Quartzite relies on two scheduled jobs:
1. **Weekly Compliance Point Report (`/api/cron/weekly-report`)**: Runs every Monday at 00:00 UTC to generate and email the PDF audit report.
2. **Meeting Reminders (`/api/cron/reminders`)**: Runs every 10 minutes to dispatch T-30, T-10, and T=0 alerts.

#### 1. Vercel Hobby Native Cron (Weekly Report)
Vercel Hobby tier permits scheduled jobs that run once per day or less. The weekly report job is handled natively via `vercel.json` in the root directory:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 0 * * 1"
    }
  ]
}
```
*Note: Vercel automatically passes the `Authorization: Bearer <CRON_SECRET>` header to scheduled cron invocations if `CRON_SECRET` is defined in the project environment variables.*

#### 2. External Scheduler for Meeting Reminders (Every 10 Minutes)
Because Vercel Hobby does not allow high-frequency sub-daily crons (e.g., `*/10 * * * *`), the meeting reminders endpoint requires an external scheduler (such as [cron-job.org](https://cron-job.org), Upstash QStash, or a GitHub Actions scheduled workflow) to invoke it every 10 minutes.

The external scheduler must make an HTTP `GET` request to your deployed reminders endpoint with the `Authorization` header:
```bash
curl -X GET "https://quartzitemanagementsystem.vercel.app/api/cron/reminders" \
  -H "Authorization: Bearer <CRON_SECRET>"
```
* The `/api/cron/reminders` endpoint remains fully functional and protected by `CRON_SECRET` authentication.

### Step 4.6: Deploy to Vercel
1. Import the Git repository into Vercel.
2. Framework Preset: **Next.js**.
3. Build Command: `npm run build`.
4. Output Directory: `.next`.
5. Enter all Environment Variables from Section 3.
6. Click **Deploy**.

---

## 5. Post-Deployment Verification Checklist

Once deployed, verify the live deployment:
- [ ] Visit `https://quartzitemanagementsystem.vercel.app/api/health` — must return `{ status: "ok" }`.
- [ ] Attempt unauthenticated `GET /api/cron/reminders` — must return HTTP `401 Unauthorized`.
- [ ] Attempt unauthenticated `GET /api/reports/download` — must return HTTP `401 Unauthorized`.
- [ ] Sign up a new user at `/signup` — check that the profile is created in Supabase.
- [ ] Create and start a test meeting at `/meetings` — verify LiveKit room connects audio and video.
- [ ] Finalize a meeting — verify attendance status is computed and point transactions appear in `/points/transactions`.
- [ ] Override an attendance record — verify atomic reversal transaction is created and net point balance updates correctly.
- [ ] Enable Web Push notifications at `/notifications` — verify browser prompt and subscription storage.
- [ ] Trigger weekly report manual generation from `/admin/reports` — verify PDF download and receipt of email.
