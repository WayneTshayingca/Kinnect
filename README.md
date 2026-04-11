# Kinnect - Family Coordination Platform

Africa's family coordination platform for multi-generational households.

## Project Structure

```
kinnect/
├── apps/
│   └── web/                # Next.js 14 web application
│       ├── app/            # App router pages
│       │   ├── auth/       # Sign-in, signup, callback, forgot/reset/set password
│       │   ├── onboarding/ # Family creation after signup
│       │   ├── dashboard/  # Protected dashboard, tasks, calendar, shopping, custody, settings
│       │   └── api/        # Server-side API routes (invite, add-member, payfast)
│       ├── components/     # React components (widgets, modals, providers)
│       ├── hooks/          # useRealtimeSync, useShoppingPresence
│       └── lib/            # logger, formatters, constants
│
├── packages/
│   └── core/               # Shared business logic (60-70% code reuse)
│       └── src/
│           ├── supabase/   # Database queries & auth (incl. custody, activity, subscriptions)
│           └── types/      # TypeScript types
│
├── supabase/
│   └── migrations/         # Database migrations (000–010 deployed; 011–017 planned)
│
├── IMPLEMENTATION.md       # Full phased feature roadmap with specs + API contracts
├── ARCHITECTURE.md         # System design, flows, component reference
└── QUICKSTART.md           # Step-by-step setup guide
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Monorepo:** Turborepo
- **Error monitoring:** Sentry
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or higher
- npm
- Supabase account

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy the example file and fill in your Supabase credentials:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   You need three required values from Supabase Dashboard > Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key (for email invites + adding members)

3. **Run the database migrations:**

   Go to your Supabase Dashboard > SQL Editor and run these files in order:
   - `supabase/migrations/000_initial_schema.sql`
   - `supabase/migrations/001_add_calendar_events.sql`
   - `supabase/migrations/002_add_location_to_calendar_events.sql`
   - `supabase/migrations/003_add_shopping_lists.sql`
   - `supabase/migrations/004_update_user_roles.sql`
   - `supabase/migrations/005_fix_shopping_list_trigger_rls.sql`
   - `supabase/migrations/006_enable_users_rls.sql`
   - `supabase/migrations/007_unique_auth_user_id.sql`
   - `supabase/migrations/008_fix_cascade_deletes.sql`
   - `supabase/migrations/009_enable_realtime.sql`
   - `supabase/migrations/010_multi_family_support.sql`

   **Upcoming migrations (run when implementing each phase):**
   - `supabase/migrations/011_add_responsibility_templates.sql` — Phase 2
   - `supabase/migrations/012_add_responsibility_flows.sql` — Phase 2
   - `supabase/migrations/013_add_responsibility_occurrences.sql` — Phase 2
   - `supabase/migrations/014_enable_realtime_responsibilities.sql` — Phase 2
   - `supabase/migrations/015_add_activity_log.sql` — Phase 3
   - `supabase/migrations/016_add_subscriptions.sql` — Phase 4
   - `supabase/migrations/017_seed_free_subscriptions.sql` — Phase 4

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to http://localhost:3000

## Development

```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps for production
npm run lint         # Lint all packages
npm run type-check   # Type check all packages
```

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `apps/web/.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/web/.env.local` | Server-only key for invites + member creation (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | `apps/web/.env.local` | Full app URL — needed for Google OAuth redirect + PayFast return URLs (e.g. `https://your-domain.co.za`) |
| `PAYFAST_MERCHANT_ID` | `apps/web/.env.local` | PayFast merchant ID (Phase 4) |
| `PAYFAST_MERCHANT_KEY` | `apps/web/.env.local` | PayFast merchant key (Phase 4) |
| `PAYFAST_PASSPHRASE` | `apps/web/.env.local` | PayFast signature passphrase (Phase 4) |
| `PAYFAST_SANDBOX` | `apps/web/.env.local` | Set `true` for sandbox, `false` for production (Phase 4) |
| `NEXT_PUBLIC_DEBUG_DOMAINS` | `apps/web/.env.local` | Optional — comma-separated debug log domains (e.g. `auth,shopping`). Unset = all. Production = none |

## Database Schema

| Table | Purpose |
|-------|---------|
| **families** | Family/household groups |
| **users** | Family members with roles (admin, member, dependent, observer). `auth_user_id` is null for dependents/observers without accounts |
| **family_members** | Junction table — one user can belong to multiple families |
| **tasks** | Tasks assigned to family members |
| **calendar_events** | Shared family calendar events with location |
| **lists** | Shopping/grocery lists per family |
| **list_items** | Individual items within a list |
| **responsibility_templates** | System templates for recurring routines (school run, shopping duty, etc.) — Phase 2 |
| **responsibility_flows** | Recurring household responsibilities with assignee + recurrence rule — Phase 2 |
| **responsibility_occurrences** | Pre-generated daily occurrences from flows (90 days ahead) — Phase 2 |
| **activity_log** | Family activity feed (task completions, responsibilities, member events, etc.) — Phase 3 |
| **subscriptions** | Billing tier per family (free / plus / family) via PayFast — Phase 4 |

## Features

### v1.0.0
- [x] Authentication (signup, login, logout, protected routes, auto-redirect if session exists)
- [x] Email verification flow (check-your-email screen after signup)
- [x] Forgot password + reset password via email recovery link
- [x] Family member invite via email (admin-only, server-side with service role)
- [x] Set-password page for invited members
- [x] Onboarding (create family after signup)
- [x] Dashboard with widget layout (stats, tasks, shopping, events, family activity)
- [x] Task management (create, assign, complete, uncomplete, filter by status)
- [x] Clickable task rows open edit modal
- [x] Quick-add tasks from dashboard
- [x] Calendar with month grid and agenda views (create, edit, delete events)
- [x] Calendar event locations
- [x] Shopping list (add, complete, uncomplete, edit, delete items)
- [x] Shopping mode (touch-optimised in-store view, URL-driven: `?mode=shopping`)
- [x] Shopping presence (Supabase Realtime — banner shows who else is shopping)
- [x] Quick-add shopping items from dashboard + "Shop" shortcut button
- [x] Family management (view, add, edit, remove members)
- [x] Role-based member display with descriptions (admin, member, dependent, observer)
- [x] Profile page with password change
- [x] Inline family name editing
- [x] Optimistic UI updates for instant feedback
- [x] Animated logo transition between sign-in and dashboard (no blank loading screen)
- [x] Performance optimized (parallel fetching, memoized lookups, fast session reads)
- [x] Sentry error monitoring (with correct PostgrestError capture)
- [x] Domain-filtered debug logging (`NEXT_PUBLIC_DEBUG_DOMAINS`)
- [x] Favicon

### Upcoming Features (see `IMPLEMENTATION.md` for full spec)

**Phase 1 — Google Auth** ✓ Complete
- [x] "Continue with Google" on sign-in, sign-up, and set-password screens
- [x] OAuth callback creates profile on first login, routes returning users to dashboard
- [x] Invited users who sign in with Google instead of their invite link are auto-merged

**Phase 2 — Today's Responsibilities**
- [ ] Dashboard card: today's active responsibilities (title, assignee, time, category)
- [ ] Recurring flows with daily/weekday/weekend/custom recurrence rules
- [ ] Quick reassign: change today's occurrence in under 10 seconds
- [ ] "New Routine" modal: create a recurring responsibility in under 60 seconds
- [ ] System templates: school run, shopping duty, household errand, staff visit

**Phase 3 — Activity Tracker**
- [ ] Family activity feed widget (replaces member completion count)
- [ ] Grouped by day: "Gogo confirmed pickup of Sipho · 13:04"
- [ ] Feeds from task completions, handoffs, member adds

**Phase 4 — PayFast Premium**
- [ ] Billing tiers: Free / Kinnect Plus R99/mo / Kinnect Family R149/mo
- [ ] PayFast checkout + ITN webhook
- [ ] Feature gating via `<PremiumGate>` component
- [ ] Free tier: polling sync (3 min); Paid: WebSocket realtime
- [ ] `/dashboard/settings` — plan management + upgrade CTAs

**Future**
- [ ] React Native mobile app (`apps/mobile`)
- [ ] Push notifications (native — `push_token` column already on `users`)
- [ ] Offline-first functionality
- [ ] Multi-language support
- [ ] Family switcher UI (DB layer already supports multi-family via `family_members`)

## Deployment

### Web App (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set the root directory to `apps/web`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL — required for Google OAuth)
5. Vercel will auto-detect Next.js and deploy

### Supabase (Production)

1. Create a new Supabase project for production
2. Run all applicable migrations (000–010, plus 011–017 as you implement each phase) in the SQL Editor
3. Update environment variables with production Supabase credentials
4. Configure auth settings in Supabase Dashboard:
   - Site URL: your Vercel deployment URL
   - Redirect URLs: `<your-url>/auth/callback`
5. Enable Realtime for tables: `tasks`, `list_items`, `calendar_events` (migration 009 does this)

## License

Proprietary - All rights reserved
