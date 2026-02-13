# Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Copy the example file and fill in your Supabase credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
```

`apps/web/.env.local` needs:
```
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

Get all three values from Supabase Dashboard > Settings > API. The service role key is only needed for the email invite feature — everything else works without it.

## Step 3: Run Database Migrations

Go to Supabase Dashboard > SQL Editor and run these in order:

1. `supabase/migrations/000_initial_schema.sql`
2. `supabase/migrations/001_add_calendar_events.sql`
3. `supabase/migrations/002_add_location_to_calendar_events.sql`
4. `supabase/migrations/003_add_shopping_lists.sql`
5. `supabase/migrations/004_update_user_roles.sql`
6. `supabase/migrations/005_fix_shopping_list_trigger_rls.sql`
7. `supabase/migrations/006_enable_users_rls.sql`

## Step 4: Start Development

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test the Full Flow

1. **Sign up** — Create an account at `/auth/signup`
2. **Create family** — Enter your family name at `/onboarding`
3. **Dashboard** — See your widget overview at `/dashboard`
4. **Add members** — Go to `/dashboard/profile`, click "Add Member"
5. **Create tasks** — Use the quick-add on the dashboard, or go to `/dashboard/tasks`
6. **Complete tasks** — Click the checkbox to mark done (instant optimistic feedback)
7. **Shopping list** — Add items from the dashboard widget, or go to `/dashboard/shopping-list`
8. **Calendar** — Go to `/dashboard/calendar`, add events, switch between month/agenda views
9. **Edit events** — Click an event on the dashboard to see details, or use the calendar to edit
10. **Profile** — Go to `/dashboard/profile` to change your password
11. **Invite members** — On the family page, click "Invite" next to members without accounts

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
| Dashboard widgets | `apps/web/components/dashboard/` |
| Modals | `apps/web/components/` |
| Providers | `apps/web/components/providers/` |
| Database queries | `packages/core/src/supabase/` |
| Types | `packages/core/src/types/database.ts` |
| Migrations | `supabase/migrations/` |
| API routes | `apps/web/app/api/` |

For full architecture details, see `ARCHITECTURE.md`.
