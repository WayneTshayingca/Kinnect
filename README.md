# Kinnect - Family Coordination Platform

Africa's family coordination platform for multi-generational households.

## Project Structure

```
kinnect/
├── apps/
│   └── web/                # Next.js 14 web application
│       ├── app/            # App router pages
│       │   ├── auth/       # Login & signup
│       │   ├── onboarding/ # Family creation after signup
│       │   ├── dashboard/  # Protected dashboard, tasks, calendar, shopping, profile
│       │   └── api/        # Server-side API routes (invites)
│       └── components/     # React components (widgets, modals, providers)
│
├── packages/
│   └── core/               # Shared business logic (60-70% code reuse)
│       └── src/
│           ├── supabase/   # Database queries & auth
│           └── types/      # TypeScript types
│
└── supabase/
    └── migrations/         # Database migrations (001-004)
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Icons:** Lucide React
- **Monorepo:** Turborepo
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

   You need three values from your Supabase Dashboard > Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key (for email invites)

3. **Run the database migrations:**

   Go to your Supabase Dashboard > SQL Editor and run these files in order:
   - `supabase/migrations/000_initial_schema.sql`
   - `supabase/migrations/001_add_calendar_events.sql`
   - `supabase/migrations/002_add_location_to_calendar_events.sql`
   - `supabase/migrations/003_add_shopping_lists.sql`
   - `supabase/migrations/004_update_user_roles.sql`

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
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/web/.env.local` | Server-only key for email invites |

## Database Schema

| Table | Purpose |
|-------|---------|
| **families** | Family/household groups |
| **users** | Family members with roles (admin, member, dependent, observer) |
| **tasks** | Tasks assigned to family members |
| **calendar_events** | Shared family calendar events with location |
| **lists** | Shopping/grocery lists per family |
| **list_items** | Individual items within a list |

## Features

### v1.0.0
- [x] Authentication (signup, login, logout, protected routes)
- [x] Onboarding (create family after signup)
- [x] Dashboard with widget layout (stats, tasks, shopping, events, family activity)
- [x] Task management (create, assign, complete, uncomplete, filter by status)
- [x] Quick-add tasks from dashboard
- [x] Calendar with month grid and agenda views (create, edit, delete events)
- [x] Calendar event locations
- [x] Shopping list (add, complete, uncomplete, edit, delete items)
- [x] Quick-add shopping items from dashboard
- [x] Family management (view, add, edit, remove members)
- [x] Profile page with password change
- [x] Inline family name editing
- [x] Email invites for family members without accounts
- [x] Role-based member display (admin, member, dependent, observer)
- [x] Optimistic UI updates for instant feedback
- [x] Performance optimized (parallel data fetching, memoized lookups, Link prefetching)

### Phase 2 (Future)
- [ ] React Native mobile app (`apps/mobile`)
- [ ] Push notifications
- [ ] Offline-first functionality
- [ ] Multi-language support
- [ ] Real-time updates

## Deployment

### Web App (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set the root directory to `apps/web`
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Vercel will auto-detect Next.js and deploy

### Supabase (Production)

1. Create a new Supabase project for production
2. Run all migrations (001-004) in the SQL Editor
3. Update environment variables with production Supabase credentials
4. Configure auth settings (site URL, redirect URLs) in Supabase Dashboard

## License

Proprietary - All rights reserved
