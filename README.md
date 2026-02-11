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
│       │   ├── dashboard/  # Protected dashboard, tasks, calendar, family
│       │   └── api/        # Server-side API routes (invites)
│       └── components/     # React components (modals, providers)
│
├── packages/
│   └── core/               # Shared business logic (60-70% code reuse)
│       └── src/
│           ├── supabase/   # Database queries & auth
│           └── types/      # TypeScript types
│
└── supabase/
    └── migrations/         # Database migrations
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
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

2. **Run the database migrations:**
   Go to your Supabase Dashboard > SQL Editor and run these files in order:
   - `supabase/migrations/001_add_calendar_events.sql`
   - `supabase/migrations/002_add_location_to_calendar_events.sql`

3. **Configure environment variables:**
   `apps/web/.env.local` should contain:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   SUPABASE_SERVICE_ROLE_KEY=<your service role key>  # Required for email invites
   ```
   The service role key is found in Supabase Dashboard > Settings > API.

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
| **users** | Family members with roles (parent, grandparent, child, domestic_worker) |
| **tasks** | Tasks assigned to family members with points |
| **calendar_events** | Shared family calendar events with location |

## Features

### Implemented
- [x] Authentication (signup, login, logout, protected routes)
- [x] Onboarding (create family after signup)
- [x] Dashboard with stats (family members, pending tasks, points)
- [x] Task management (create, assign, complete, delete, filter by status)
- [x] Points/rewards system (earn points by completing tasks)
- [x] Calendar with month grid and agenda views (create, edit, delete events)
- [x] Calendar event locations
- [x] Family management (view, add, edit, remove members)
- [x] Inline family name editing
- [x] Email invites for family members without accounts
- [x] Role-based member display (colored badges)

### Phase 2 (Future)
- [ ] React Native mobile app (`apps/mobile`)
- [ ] Push notifications
- [ ] Offline-first functionality
- [ ] Multi-language support
- [ ] Real-time updates
- [ ] Points leaderboard
- [ ] User profile/settings page

## Deployment

### Web App (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Vercel will auto-detect Next.js and deploy

## License

Proprietary - All rights reserved
