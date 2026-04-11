# Kinnect — Implementation Roadmap

## Overview

This document defines the phased implementation plan for Kinnect's next major feature set. Each phase ships independently and builds on the prior one.

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Google OAuth sign-in | Complete ✓ |
| 2 | Today's Responsibilities | Planned |
| 3 | Activity Tracker (family feed) | Planned |
| 4 | PayFast Premium billing | Planned |

---

## Phase 1: Google Auth ✓ Complete

### Goal
Reduce signup friction with Google OAuth as an alternative to email/password.

### Files changed

| File | Change |
|------|--------|
| `packages/core/src/supabase/auth.ts` | Added `signInWithGoogle()` |
| `apps/web/app/page.tsx` | "Continue with Google" button |
| `apps/web/app/auth/signup/page.tsx` | "Continue with Google" button |
| `apps/web/app/auth/set-password/page.tsx` | "Continue with Google" button (invited users) |
| `apps/web/app/auth/callback/page.tsx` | Handles Google OAuth via implicit hash flow: setSession → merge check → route |
| `apps/web/app/api/auth/google-callback/route.ts` | NEW — merges invited users who sign in with Google |

### Implementation notes
- Google provider enabled in Supabase Dashboard → Authentication → Providers
- No new migrations — Google OAuth creates a row in `auth.users`; callback creates `users` profile if new
- Supabase returns tokens via hash fragment (implicit flow); callback reads `app_metadata.providers` to detect Google
- Invited users who click "Continue with Google" instead of using their invite link are automatically merged: `users.auth_user_id` is updated to the Google auth user ID, orphaned invite auth user is deleted
- `NEXT_PUBLIC_APP_URL` required in env — used as the OAuth `redirectTo` base

### Verification
1. Sign out → click "Continue with Google" → Google consent screen
2. New user: lands on `/onboarding` after profile created
3. Existing user: lands on `/dashboard`
4. Invited user (ignores email, uses Google): merged to family, lands on `/dashboard`

---

## Phase 2: Today's Responsibilities

### Goal
Extend Kinnect into a household coordination engine. Introduce recurring responsibility flows with daily dashboard visibility and quick reassignment. Architecture-first: the engine supports any household routine, not just child-related ones.

First system templates: school run, shopping duty, household errand, staff visit.

### DB Migrations

| File | Description |
|------|-------------|
| `supabase/migrations/011_add_responsibility_templates.sql` | Create `responsibility_templates` table + seed 4 system templates |
| `supabase/migrations/012_add_responsibility_flows.sql` | Create `responsibility_flows` table + RLS |
| `supabase/migrations/013_add_responsibility_occurrences.sql` | Create `responsibility_occurrences` table + unique constraint + RLS + `generate_responsibility_occurrences()` function + AFTER INSERT trigger |
| `supabase/migrations/014_enable_realtime_responsibilities.sql` | Add `responsibility_flows` + `responsibility_occurrences` to realtime publication |

### Schema

#### `responsibility_templates`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | e.g. "School Run" |
| `slug` | text | e.g. `school_run` |
| `icon` | text | Emoji or icon identifier |
| `category` | text | `transport` \| `household` \| `care` \| `errand` |
| `default_start_time` | time | Optional suggested start time |
| `is_system` | boolean | true = visible to all families |
| `created_at` | timestamptz | |

**System seeds:** `school_run`, `shopping_duty`, `household_errand`, `staff_visit`

#### `responsibility_flows`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `family_id` | uuid → families | |
| `title` | text | Display name |
| `category` | text | |
| `template_id` | uuid → responsibility_templates | Nullable |
| `recurrence_rule` | text | `daily` \| `weekdays` \| `weekends` \| `weekly:1,3,5` (ISO day numbers 1=Mon) |
| `default_assignee_id` | uuid → users | |
| `backup_assignee_ids` | uuid[] | |
| `start_time` | time | |
| `active` | boolean | Default true |
| `created_by` | uuid → users | |
| `created_at` | timestamptz | |

#### `responsibility_occurrences`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `flow_id` | uuid → responsibility_flows | |
| `family_id` | uuid → families | Denormalized for RLS |
| `scheduled_for` | date | The occurrence date |
| `scheduled_time` | time | |
| `assigned_to` | uuid → users | |
| `status` | text | `pending` \| `completed` \| `missed` \| `reassigned` |
| `override_reason` | text | Nullable |
| `completed_at` | timestamptz | Nullable |
| `completed_by` | uuid → users | Nullable |
| `created_at` | timestamptz | |

Unique constraint on `(flow_id, scheduled_for)`. Occurrences are pre-generated 90 days ahead by a Postgres trigger on `responsibility_flows` INSERT — no client-side generation needed.

### Core package

| File | Change |
|------|--------|
| `packages/core/src/supabase/responsibilities.ts` | NEW — `getResponsibilityTemplates`, `createResponsibilityFlow`, `getTodaysResponsibilities`, `getWeekResponsibilities`, `reassignOccurrence`, `completeOccurrence`, `deactivateFlow` |
| `packages/core/src/index.ts` | Export `responsibilities.ts` |
| `packages/core/src/types/database.ts` | Add `ResponsibilityTemplate`, `ResponsibilityFlow`, `ResponsibilityOccurrence` types |

### UI

| File | Change |
|------|--------|
| `apps/web/components/dashboard/TodaysResponsibilitiesWidget.tsx` | NEW — card with today's occurrences: icon + title + assignee + time + category badge + Reassign button per row. Empty state + "New Routine" CTA |
| `apps/web/components/CreateRoutineModal.tsx` | NEW — 3-step: pick template → set recurrence + time → assign person |
| `apps/web/app/dashboard/page.tsx` | Add `<TodaysResponsibilitiesWidget>` to the 2-column grid. Add `responsibility_occurrences` to `useRealtimeSync` |

### UX Rules
- Create a recurring school pickup routine in under 60 seconds
- Reassign today's responsibility in under 10 seconds
- Card must visually match `TodaysTasksWidget` (white rounded card, pink CTA)
- Do NOT place under Tasks. Do NOT make child-specific. Do NOT couple to calendar events.

### Verification
1. Dashboard shows Today's Responsibilities card
2. "New Routine" → modal → select "School Run" → set time + recurrence → assign → card shows the occurrence
3. "Reassign" on an occurrence → pick different person → updates instantly
4. Realtime: second browser tab reflects reassignment without refresh

---

## Phase 3: Activity Tracker

### Goal
Replace the static family-members widget with a live family activity feed.

### DB Migration

| File | Description |
|------|-------------|
| `supabase/migrations/015_add_activity_log.sql` | Create `activity_log` table + indexes + RLS |

### Schema

#### `activity_log`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `family_id` | uuid → families | |
| `user_id` | uuid → users | Who did it |
| `action_type` | text | `task_completed` \| `task_created` \| `event_created` \| `handoff_confirmed` \| `custody_claimed` \| `member_added` \| `shopping_item_added` |
| `entity_type` | text | `task` \| `event` \| `custody` \| `member` |
| `entity_id` | uuid | |
| `metadata` | jsonb | e.g. `{task_title: "Fetch groceries", points: 10}` |
| `created_at` | timestamptz | Indexed with family_id |

### Core package

| File | Change |
|------|--------|
| `packages/core/src/supabase/activity.ts` | NEW — `logActivity`, `getActivityFeed` |
| `packages/core/src/supabase/tasks.ts` | Call `logActivity` in `completeTask` |
| `packages/core/src/supabase/custody.ts` | Call `logActivity` in `claimCustody`, `confirmHandoff` |
| `packages/core/src/supabase/calendar.ts` | Call `logActivity` in `createCalendarEvent` |

### UI

| File | Change |
|------|--------|
| `apps/web/components/dashboard/ActivityFeedWidget.tsx` | NEW — replaces `FamilyActivityWidget` |
| `apps/web/app/dashboard/page.tsx` | Swap `FamilyActivityWidget` → `ActivityFeedWidget` |

### Verification
1. Complete a task → activity feed shows "Name completed 'Task' · just now"
2. Confirm handoff → "Name confirmed pickup of Child · now"
3. Feed is grouped by Today / Yesterday / older

---

## Phase 4: PayFast Premium

### Goal
Monetize with tiered billing (Free / Kinnect Plus R99/mo / Kinnect Family R149/mo) using PayFast (SA market, supports EFT + local cards).

### DB Migrations

| File | Description |
|------|-------------|
| `supabase/migrations/016_add_subscriptions.sql` | Create `subscriptions` table + RLS (insert/update via service role only) |
| `supabase/migrations/017_seed_free_subscriptions.sql` | Backfill all existing families with `free` tier |

### Schema

#### `subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `family_id` | uuid → families | UNIQUE |
| `tier` | text | `free` \| `plus` \| `family` |
| `status` | text | `active` \| `cancelled` \| `past_due` \| `trialing` |
| `payfast_subscription_token` | text | For PayFast recurring billing API |
| `next_billing_date` | date | |
| `trial_ends_at` | timestamptz | |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `POST /api/payfast/checkout` | POST | Build PayFast params + MD5 signature, return redirect URL |
| `POST /api/payfast/notify` | POST | ITN webhook — validate + upsert subscription |
| `POST /api/payfast/cancel` | POST | Cancel subscription via PayFast token API |

### Core package

| File | Change |
|------|--------|
| `packages/core/src/supabase/subscriptions.ts` | NEW — `getSubscription`, `getFamilyTier` |

### Feature tiers

| Feature | Free | Plus (R99/mo) | Family (R149/mo) |
|---------|------|---------------|------------------|
| WGTK custody tracking | ✓ | ✓ | ✓ |
| Activity feed | ✓ | ✓ | ✓ |
| Tasks + calendar | ✓ | ✓ | ✓ |
| Realtime sync | Polling (3 min) | WebSocket | WebSocket |
| Event templates | System only | System + custom | System + custom |
| Family size | Up to 5 | Up to 10 | Unlimited |

### UI

| File | Change |
|------|--------|
| `apps/web/components/providers/subscription-provider.tsx` | NEW — `SubscriptionContext` + `useSubscription` hook |
| `apps/web/components/PremiumGate.tsx` | NEW — gate children behind tier requirement |
| `apps/web/app/dashboard/layout.tsx` | Wrap with `SubscriptionProvider`, add Settings nav link |
| `apps/web/app/dashboard/settings/page.tsx` | NEW — current plan + upgrade CTAs + cancel |
| `apps/web/hooks/useRealtimeSync.ts` | Accept `tier` param — polling for free, WebSocket for paid |

### Verification
1. Settings page shows current plan (free)
2. "Upgrade to Plus" → PayFast sandbox checkout
3. Complete sandbox payment → ITN fires → `isPlus` becomes true
4. Free tier: network tab shows polling interval (~3 min) instead of persistent WS
5. `custody` realtime always active regardless of tier

---

## Environment Variables

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App URL (needed for OAuth redirect + PayFast return URLs)
NEXT_PUBLIC_APP_URL=https://your-domain.co.za

# PayFast (Phase 4)
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_SANDBOX=true   # Set to false in production

# Optional debug logging
NEXT_PUBLIC_DEBUG_DOMAINS=auth,shopping
```

---

## Migration Run Order

Run migrations in order in Supabase Dashboard → SQL Editor:

```
000_initial_schema.sql
001_add_calendar_events.sql
002_add_location_to_calendar_events.sql
003_add_shopping_lists.sql
004_update_user_roles.sql
005_fix_shopping_list_trigger_rls.sql
006_enable_users_rls.sql
007_unique_auth_user_id.sql
008_fix_cascade_deletes.sql
009_enable_realtime.sql
010_multi_family_support.sql
011_add_event_type_to_calendar_events.sql   ← Phase 2
012_add_custody_tables.sql                  ← Phase 2
013_seed_system_templates.sql               ← Phase 2
014_enable_realtime_custody.sql             ← Phase 2
015_add_activity_log.sql                    ← Phase 3
016_add_subscriptions.sql                   ← Phase 4
017_seed_free_subscriptions.sql             ← Phase 4
```
