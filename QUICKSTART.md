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

Get all three values from Supabase Dashboard > Settings > API.

The service role key is required for adding family members and sending email invites — both use server-side API routes that bypass RLS.

Optional:
```
NEXT_PUBLIC_DEBUG_DOMAINS=auth,shopping   # only emit debug logs for these domains
```

## Step 3: Run Database Migrations

Go to Supabase Dashboard > SQL Editor and run these in order:

1. `supabase/migrations/000_initial_schema.sql`
2. `supabase/migrations/001_add_calendar_events.sql`
3. `supabase/migrations/002_add_location_to_calendar_events.sql`
4. `supabase/migrations/003_add_shopping_lists.sql`
5. `supabase/migrations/004_update_user_roles.sql`
6. `supabase/migrations/005_fix_shopping_list_trigger_rls.sql`
7. `supabase/migrations/006_enable_users_rls.sql`
8. `supabase/migrations/007_unique_auth_user_id.sql`
9. `supabase/migrations/008_fix_cascade_deletes.sql`
10. `supabase/migrations/009_enable_realtime.sql`
11. `supabase/migrations/010_multi_family_support.sql`

## Step 4: Start Development

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test the Full Flow

1. **Sign up** — Create an account at `/auth/signup` (confirm password required)
2. **Verify email** — Check your inbox and click the verification link
3. **Create family** — Enter your family name at `/onboarding`
4. **Dashboard** — See your widget overview at `/dashboard`
5. **Add members** — Go to `/dashboard/profile`, click "Add Member" (select a role, optionally add email to send an invite)
6. **Create tasks** — Use the quick-add on the dashboard, or go to `/dashboard/tasks`
7. **Complete tasks** — Click the checkbox to mark done (instant optimistic feedback)
8. **Shopping list** — Add items from the dashboard widget, or go to `/dashboard/shopping-list`
9. **Shopping mode** — Click "Shop" on the dashboard widget or "Start Shopping" on the shopping list page; the presence banner shows who else is shopping
10. **Calendar** — Go to `/dashboard/calendar`, add events, switch between month/agenda views
11. **Profile** — Go to `/dashboard/profile` to change your password or manage family members
12. **Invite members** — On the profile page, click "Invite" next to members without accounts

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
| Sign-in + auth pages | `apps/web/app/` + `apps/web/app/auth/` |
| Dashboard pages | `apps/web/app/dashboard/` |
| Dashboard widgets | `apps/web/components/dashboard/` |
| Modals | `apps/web/components/` |
| Providers | `apps/web/components/providers/` |
| Hooks | `apps/web/hooks/` |
| Logger | `apps/web/lib/logger.ts` |
| API routes | `apps/web/app/api/` |
| Database queries | `packages/core/src/supabase/` |
| Types | `packages/core/src/types/database.ts` |
| Migrations | `supabase/migrations/` |

For full architecture details, see `ARCHITECTURE.md`.
