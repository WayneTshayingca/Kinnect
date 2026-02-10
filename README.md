# Kinnect - Family Coordination Platform

Africa's family coordination platform for multi-generational households.

## Project Structure

```
kinnect/
├── apps/
│   └── web/              # Next.js 14 web application
│       ├── app/          # App router pages
│       ├── components/   # React components
│       └── lib/          # Web utilities
│
├── packages/
│   └── core/             # Shared business logic (60-70% code reuse)
│       ├── supabase/     # Database queries & auth
│       ├── hooks/        # React hooks
│       ├── utils/        # Utilities
│       └── types/        # TypeScript types
│
└── supabase/             # Database migrations
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Monorepo:** Turborepo
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or higher
- npm or yarn
- Supabase account

### Installation

1. **Install dependencies:**
   ```bash
   cd ~/Documents/apps/kinnect
   npm install
   ```

2. **Run the database migration:**
   - Go to your Supabase dashboard: https://mvmjvfwyvvvjqwctmhsz.supabase.co
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_add_calendar_events.sql`
   - Run the migration

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to http://localhost:3000
   - You should see the Kinnect landing page!

## Development

### Running the app

```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps for production
npm run lint         # Lint all packages
npm run type-check   # Type check all packages
```

### Environment Variables

The environment variables are already configured in `apps/web/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Database Schema

Current tables:
- **families** - Family groups
- **users** - Family members with roles (parent, grandparent, child, domestic_worker)
- **tasks** - Tasks assigned to family members
- **calendar_events** - Shared family calendar events (NEW - run migration)

## Features

### Phase 1 (Current - 6 weeks)
- [x] Authentication (signup/login)
- [x] Family creation
- [x] User profiles with roles
- [x] Task management system
- [x] Points/rewards system
- [x] Calendar events
- [ ] Dashboard with real data
- [ ] Task completion flow
- [ ] Calendar UI
- [ ] Family member management UI

### Phase 2 (Future - 4 weeks)
- [ ] React Native mobile apps
- [ ] Push notifications
- [ ] Offline-first functionality
- [ ] Multi-language support

## Project Timeline

**Week 1-2:** Core setup + Authentication ✅
**Week 3-4:** Family management + Task system (IN PROGRESS)
**Week 5-6:** Calendar + Dashboard + Polish

## Deployment

### Web App (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel will auto-detect Next.js and deploy
4. Add environment variables in Vercel dashboard

## Contributing

This is a solo project by Wayne, building Kinnect for South African families.

## License

Proprietary - All rights reserved
