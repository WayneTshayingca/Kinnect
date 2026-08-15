# Mobile vs Web Audit

Audit of `apps/mobile` against `apps/web`'s feature set. Assessment only — no code changes.

## Tab routes: functional status

| Route | Status | Notes |
|---|---|---|
| **index** (Home) | Functional | Greeting header, avatar stack, daily snapshot, week calendar strip, today's tasks, shopping preview, today's routines — fully wired to `@kinnect/core`. Mirrors the web dashboard's bento layout closely. |
| **tasks** | Functional | Full CRUD-lite: list, filter (pending/done/all), assignee filter, create (modal), complete/uncomplete, optimistic updates. |
| **calendar** | Functional | Month grid + agenda, create/delete events, SA holiday overlay, optimistic updates. |
| **family** | Partial | Displays members + family name (editable) + sign out. No add member, no remove member, no role editing, no password change — all of which exist on web's `/dashboard/profile`. |
| **shopping** (5th tab, not in original 4) | Functional | Full list, add/edit/delete, "shopping mode," completed section, clear completed. Exists on mobile as its own tab but has no equivalent standalone web page (web has `ShoppingListWidget` on dashboard + `/dashboard/shopping-list`). |

Mobile actually ships **5** tabs (`index, tasks, shopping, calendar, family`), not 4 — `shopping` was split out as its own tab rather than a dashboard widget.

## `@kinnect/core` wiring

Wired and in active use: `auth` (partial — see below), `families` (partial), `tasks` (full), `calendar` (full), `shopping-list` (full), `responsibilities` (partial — read/complete only).

Not wired despite being exported from core:

- `addFamilyMember`, `removeFamilyMember`, `updateFamilyMember` — family screen is read-only for membership
- `changePassword`, `resetPasswordForEmail` — no account-security screens
- `signInWithGoogle` — mobile login/signup use email/password only (no OAuth call found in mobile auth screens)
- `getMyFamilies`, `switchActiveFamily` — no multi-family switching UI
- `createResponsibilityFlow`, `updateResponsibilityFlow`, `deactivateFlow`, `deleteFlow`, `getResponsibilityFlows`, `getResponsibilityTemplates`, `getWeekResponsibilities`, `reassignOccurrence` — mobile only reads today's occurrences and completes them; there's no routine-management screen at all

## `@kinnect/hooks` wiring — FIXED

~~Declared as a dependency in `apps/mobile/package.json` but never imported anywhere in the app.~~ Resolved:

- Added `apps/mobile/hooks/useRealtimeSync.ts` — mirrors `apps/web/hooks/useRealtimeSync.ts`, wrapping the shared `useRealtimeSubscription` and adding an `AppState` listener that refetches on `active` (the mobile analogue of web's `visibilitychange`; there's no BroadcastChannel equivalent needed since RN has no multi-tab concept).
- Wired into all four data screens with per-table reload callbacks:
  - `index.tsx` — `tasks`, `calendar_events`, `list_items`, `users`, `responsibility_occurrences` → `loadData`
  - `tasks.tsx` — `tasks`, `users` → `load(true)`
  - `calendar.tsx` — `calendar_events` → `load(true)`
  - `shopping.tsx` — `list_items` → `load(true)`
- Wired `useShoppingPresence` (already platform-agnostic, no changes needed to the hook itself) into `shopping.tsx`, with a presence banner ("X is shopping right now") matching web's UI, shown when `shoppingMode` is active and other members are tracked on the same channel.
- `family.tsx` intentionally left without realtime — web's own `/dashboard/profile` doesn't use `useRealtimeSync` either, so this preserves parity rather than adding mobile-only scope.

Verified with `tsc --noEmit` — no new type errors introduced by these changes (pre-existing, unrelated errors in `tasks.tsx`, `signup.tsx`, `shopping.tsx`, `user-provider.tsx`, and `lib/supabase.ts` are untouched by this fix).

## Missing vs web dashboard feature set

1. ~~**Realtime sync**~~ — **fixed**, see above.
2. **Routines/Responsibilities management** — web has a full `/dashboard/routines` CRUD page (create flow, edit, deactivate, delete, recurrence rules, category tagging). Mobile only surfaces a read-only "today's routines" card with complete/uncomplete.
3. **Family member management** — web's `/dashboard/profile` supports add member (via `POST /api/members`, correctly service-role per CLAUDE.md), remove member, role editing, password change, profile editing (name/phone). Mobile's family tab is view + rename-family + sign-out only.
4. **Family Activity Tracker** (`FamilyActivityWidget`) — shows weekly per-member completed-task leaderboard on web dashboard. No equivalent on mobile home screen.
5. **Google OAuth** — confirmed absent on mobile. `apps/mobile/app/(auth)/login.tsx` and `signup.tsx` are email/password only; no `signInWithGoogle` call anywhere in `apps/mobile`. Web's `/auth/callback` + `google-callback` API route have no mobile counterpart (would need `expo-auth-session`/`expo-web-browser` for a native redirect flow).
6. **Password reset flow** — confirmed absent on mobile. Web has `/auth/forgot-password`, `/auth/reset-password`, `/auth/set-password` (3 pages, 575 lines combined). Mobile's login screen has no "forgot password" link and no corresponding routes exist under `(auth)/`. A user locked out of their mobile account has no self-serve recovery path.
7. **Multi-family support** — `getMyFamilies` / `switchActiveFamily` exist in core but aren't used on the mobile family screen; need to confirm usage on web beyond onboarding.
8. **Push notifications** — no `expo-notifications` dependency found; web has no push either, but this is a mobile-native gap worth flagging separately since task/event reminders would be a natural mobile-only feature.

## Summary

Mobile's CRUD screens (tasks, calendar, shopping) are genuinely solid and at near feature-parity with web's equivalents for their in-scope operations. Realtime sync (item 1) is now fixed. Remaining gaps: **(1)** routine/responsibility management is read-only, **(2)** family administration (add/remove/edit members, password change) doesn't exist on mobile — it's view-only, and **(3)** there's no account-recovery path (no Google OAuth, no forgot/reset password) on mobile, so a locked-out mobile user has zero self-serve options. None of this needs new backend work; it's all exposed by existing `@kinnect/core` functions and `@kinnect/hooks`, just not yet called from mobile screens.