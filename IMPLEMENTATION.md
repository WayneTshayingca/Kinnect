# Kinnect — Implementation Roadmap

## Overview

This document defines the phased implementation plan for Kinnect's next major feature set. Each phase ships independently and builds on the prior one.

| Phase | Feature | Migrations | Status |
|-------|---------|-----------|--------|
| 1 | Google OAuth sign-in (web) | — | Complete ✓ |
| 2 | Today's Responsibilities / Routines | 011–016 | Complete ✓ |
| — | Notifications feed | 017 | Complete ✓ (no producers yet) |
| M | Mobile app completion | — | In progress — see `MOBILE_ROADMAP.md` |
| 4 | PayFast Premium billing | 018–019 | Next |
| 3 | Activity Tracker (family feed) | TBD | Planned (deferred behind Phase 4) |

> **Migration numbering:** 000–017 are deployed. Phase 4 takes **018–019**. Phase 3's
> `activity_log` migration gets its number when it is actually built — the numbers this
> document originally reserved for it (015/016/017) were consumed by the routines and
> notifications work.

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

## Phase 2: Today's Responsibilities ✓ Complete

> **Shipped.** Actual migrations differ from the original spec below: the feature landed as
> `011_add_responsibility_templates`, `012_add_responsibility_flows`,
> `013_add_responsibility_occurrences`, `014_enable_realtime_responsibilities`,
> `015_add_update_flow_rpc`, and `016_add_end_time_to_flows` (flows carry both a start and an
> end time, e.g. school drop-off + pick-up). Web ships the dashboard widget, the create-routine
> modal, and a full `/dashboard/routines` management page. Mobile currently surfaces today's
> occurrences read-only — full CRUD is tracked in `MOBILE_ROADMAP.md`.

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

## Phase 3: Activity Tracker — Planned (deferred behind Phase 4)

### Goal
Replace the static family-members widget with a live family activity feed.

### DB Migration

| File | Description |
|------|-------------|
| `supabase/migrations/0NN_add_activity_log.sql` | Create `activity_log` table + indexes + RLS. **Number assigned when built** — 015/016/017 are taken, and 018–019 are reserved for Phase 4 |

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
| `packages/core/src/supabase/responsibilities.ts` | Call `logActivity` in `completeOccurrence`, `reassignOccurrence` |
| `packages/core/src/supabase/calendar.ts` | Call `logActivity` in `createCalendarEvent` |

> Note: the original spec referenced a `custody.ts` (WGTK custody tracking) that was never
> built — custody is not in the codebase. Activity sources are tasks, responsibilities,
> calendar, and member events. `activity_log` also overlaps with the shipped `notifications`
> table (017); decide at build time whether to merge the two or keep feed vs. inbox separate.

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
| `supabase/migrations/018_add_subscriptions.sql` | Create `subscriptions` table + RLS (insert/update via service role only) |
| `supabase/migrations/019_seed_free_subscriptions.sql` | Backfill all existing families with `free` tier |

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
| Tasks + calendar + shopping | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ |
| Routines / responsibilities | Up to 3 flows | Unlimited | Unlimited |
| Realtime sync | Polling (3 min) | WebSocket | WebSocket |
| Routine templates | System only | System + custom | System + custom |
| Family size | Up to 5 | Up to 10 | Unlimited |

### UI

| File | Change |
|------|--------|
| `apps/web/components/providers/subscription-provider.tsx` | NEW — `SubscriptionContext` + `useSubscription` hook |
| `apps/web/components/PremiumGate.tsx` | NEW — gate children behind tier requirement |
| `apps/web/app/dashboard/layout.tsx` | Wrap with `SubscriptionProvider`, add Settings nav link |
| `apps/web/app/dashboard/settings/page.tsx` | NEW — current plan + upgrade CTAs + cancel |
| `apps/web/hooks/useRealtimeSync.ts` | Accept `tier` param — polling for free, WebSocket for paid |
| `apps/mobile/app/paywall.tsx` | NEW — tier comparison + upgrade CTA. Opens the web PayFast checkout URL in `expo-web-browser` (PayFast has no native SDK), then refetches tier on return |
| `apps/mobile/components/providers/subscription-provider.tsx` | NEW — mobile mirror of the web provider |

### Verification
1. Settings page shows current plan (free)
2. "Upgrade to Plus" → PayFast sandbox checkout
3. Complete sandbox payment → ITN fires → `isPlus` becomes true
4. Free tier: network tab shows polling interval (~3 min) instead of persistent WS
5. Mobile paywall opens the same checkout in an in-app browser and reflects the new tier on return

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
011_add_responsibility_templates.sql        ← Phase 2  (deployed)
012_add_responsibility_flows.sql            ← Phase 2  (deployed)
013_add_responsibility_occurrences.sql      ← Phase 2  (deployed)
014_enable_realtime_responsibilities.sql    ← Phase 2  (deployed)
015_add_update_flow_rpc.sql                 ← Phase 2  (deployed)
016_add_end_time_to_flows.sql               ← Phase 2  (deployed)
017_notifications.sql                       ← Notifications (deployed)
018_add_subscriptions.sql                   ← Phase 4  (next)
019_seed_free_subscriptions.sql             ← Phase 4  (next)
```

Never reuse or skip a number. Phase 3's `activity_log` migration takes the next free number
at the time it is built.
