# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Run Database Migrations

Go to Supabase Dashboard > SQL Editor and run these in order:

1. `supabase/migrations/001_add_calendar_events.sql`
2. `supabase/migrations/002_add_location_to_calendar_events.sql`

## Step 3: Configure Environment

`apps/web/.env.local` needs:
```
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

Get the service role key from Supabase Dashboard > Settings > API. It's only needed for the email invite feature — everything else works without it.

## Step 4: Start Development

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test the Full Flow

1. **Sign up** — Create an account at `/auth/signup`
2. **Create family** — Enter your family name at `/onboarding`
3. **Dashboard** — See your stats at `/dashboard`
4. **Add members** — Go to `/dashboard/family`, click "Add Member"
5. **Create tasks** — Go to `/dashboard/tasks`, click "Create Task", assign to members
6. **Complete tasks** — Click the checkbox to mark done and earn points
7. **Calendar** — Go to `/dashboard/calendar`, add events, switch between month/agenda views
8. **Edit events** — Click the pencil icon on any event to edit title, time, location
9. **Invite members** — On the family page, click "Invite" next to members without accounts

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # Check TypeScript
npm run lint         # Lint code
```

## Key Files

| What | Where |
|------|-------|
| Pages | `apps/web/app/dashboard/` |
| Components | `apps/web/components/` |
| Database queries | `packages/core/src/supabase/` |
| Types | `packages/core/src/types/database.ts` |
| Migrations | `supabase/migrations/` |
| API routes | `apps/web/app/api/` |

For full architecture details, see `ARCHITECTURE.md`.
