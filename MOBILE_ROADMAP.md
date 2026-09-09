# Kinnect Mobile — Road to Publishing

Execution tracker for `apps/mobile` (Expo ~57, RN 0.86, Expo Router, NativeWind).
Web app across form factors is deliberately **out of scope** until mobile ships.

Companion docs: `IMPLEMENTATION.md` (feature specs + migrations), `audit.md` (mobile vs web gap
analysis), `ARCHITECTURE.md` (system design).

## Where we are

All five tabs plus auth and onboarding are built and wired to `@kinnect/core`:

| Route | State |
|---|---|
| `(tabs)/index` — Home | Complete. Greeting, avatar stack, daily snapshot, week strip, today's tasks/shopping/routines |
| `(tabs)/tasks` | Complete. List, filters, create, complete, optimistic updates |
| `(tabs)/calendar` | Complete. Month grid + agenda, create/delete, SA holidays |
| `(tabs)/shopping` | Complete. CRUD, shopping mode, presence banner |
| `(tabs)/family` | Partial — view + rename + sign out only |
| `(tabs)/menu` | Minimal — 2 links + sign out |
| `profile`, `routines` | Present; routines is read-only |
| `(auth)/login`, `(auth)/signup`, `(onboarding)/index` | Complete (email/password only) |

Realtime sync (`hooks/useRealtimeSync.ts`, AppState-aware) and shopping presence are wired.
No navigation links are broken — every existing `router.push` target resolves.

## Phase 1 — Finish the screens

### 1a. Extend the contrast/emoji design pass
Commit `b03d4fe` fixed low-contrast greys (`#a0a0c0` ≈2.9:1, `#a5a5b8` ≈3.3:1 — both fail WCAG
AA) by introducing `T.mutedInk` (`#6E6E93`) in `lib/theme.ts`, and dropped decorative emoji.
It only covered `(tabs)/index`, `tasks`, `calendar`, `shopping`, and `(onboarding)/index`.

Covered:
- [x] `app/(auth)/login.tsx` — translucent whites raised to AA
- [x] `app/(auth)/signup.tsx` — same, plus the last emoji removed
- [x] `app/(tabs)/menu.tsx` — `primary-300` text replaced with `ink-muted`
- [x] `app/profile.tsx` — emoji replaced with Ionicons, muted text fixed
- [x] `app/routines.tsx`

`ink-muted` (#6E6E93) now exists in the mobile Tailwind palette, mirroring
`T.mutedInk`, so NativeWind screens and StyleSheet screens share one token.
`primary-300` is documented as decorative-only — never use it for text.

### 1b. Close functional gaps
All backed by functions already exported from `@kinnect/core` — no backend work required.

- [x] **Family management** — add / edit / remove members, admin-gated, on `profile.tsx`
      (there is no family tab; family lives inside profile). Adding goes through
      `POST /api/members` via the new `lib/api.ts` helper, never a client insert.
- [x] **Account security** — `app/account-security.tsx` wrapping `changePassword`
- [x] **Forgot password** — `(auth)/forgot-password.tsx` + link from login
- [x] **Routines CRUD** — `routines.tsx` is now Today / All routines, with a `RoutineSheet`
      for create and edit, plus pause and delete
- [x] **Multi-family switching** — already shipped; `DashboardHeader` wires
      `FamilySwitcherSheet` to `getMyFamilies` / `switchActiveFamily`. The audit was stale.

### 1c. Stretch — not blocking
- [x] Google OAuth — already shipped on mobile; `login.tsx` runs the full
      `signInWithOAuth` + `openAuthSessionAsync` flow. The audit was stale here too.
- [ ] Push notifications via `expo-notifications` (`users.push_token` column already exists)

## Phase 2 — Navigation ✓
- [x] Menu links to Security (`/account-security`) and the paywall
- [x] Login links to `/(auth)/forgot-password`
- [x] Routine create/edit reachable from the routines header and empty state
All route targets resolve; the paywall is registered as a modal in the root stack.

## Phase 3 — PayFast + paywall — code complete, unverified
Spec: `IMPLEMENTATION.md` Phase 4. PayFast has no native SDK, so checkout is always a web
handoff — mobile opens the signed URL in `expo-web-browser`.

- [x] Migrations `018_add_subscriptions.sql` (RLS grants SELECT only; writes are service-role
      so a client cannot grant itself a tier) and `019_seed_free_subscriptions.sql`. A trigger
      gives every new family a free row, so app code can assume one exists.
- [x] `packages/core/src/supabase/subscriptions.ts` — `getSubscription`, `getFamilyTier`,
      `TIER_PLANS`, `isPaidTier`. Cancelled and past-due both resolve to `free`.
- [x] `apps/web/lib/payfast.ts` — signature, ITN validation, tier prices
- [x] `/api/payfast/checkout`, `/notify`, `/cancel`
- [x] `apps/mobile/app/paywall.tsx` + `subscription-provider.tsx`, menu entry

The ITN webhook is the only thing that grants a paid tier. It checks the signature, the source
IP, PayFast's own validation reply, and the paid amount before writing.

Still open:
- [ ] Run migrations 018–019 and regenerate DB types (the `subscriptions` table was hand-added
      to `database.ts` so the build passes before the migration is applied)
- [ ] Walk the full sandbox flow end to end
- [ ] Web `/dashboard/settings` — plan management + cancel button
- [ ] **Enforce the limits.** `maxMembers` / `maxRoutines` and the free-tier polling-vs-websocket
      split are defined but nothing reads them yet, so today the paywall sells a plan that
      grants nothing. This is the gap to close before charging anyone.

## Phase 4 — Publishing readiness
- [x] `eas.json` — development / preview / production profiles
- [x] `app.json` — description, colours, `ITSAppUsesNonExemptEncryption`, empty Android
      permissions array, `expo-web-browser` plugin registered
- [x] Privacy policy (POPIA) now opens from the signup screen

Blocking, needs you:
- [ ] **Rotate the leaked credentials.** The Supabase `service_role` key and a Sentry auth
      token were committed in `apps/mobile/.env.example`, and another Sentry token in
      `apps/web/.env.sentry-build-plugin`. Both files are cleaned up, but the values are still
      in git history — rotate them in the Supabase and Sentry dashboards.
- [ ] **App icon and splash screen.** `apps/mobile/assets/` does not exist, so the app would
      ship with Expo's placeholder. Needs a 1024×1024 icon, an Android adaptive icon, and a
      splash image, then the matching `app.json` entries.
- [ ] **EAS env vars.** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are not
      in `eas.json` — set them as EAS environment variables per profile, or builds will start
      with no Supabase client. Never put the service-role key there.
- [ ] Set the real production origin in `eas.json` if it is not `https://kinnect.co.za`
- [ ] Store metadata + screenshots (App Store, Play Store)

Nice to have:
- [ ] Mobile error monitoring (Sentry is currently web-only)
- [ ] Minimal CI — type-check on push (no `.github/workflows` today)

## Branching strategy
Deferred. Solo developer, working directly on `staging`; a single branch carries no conflict
risk and branch ceremony would only slow things down. Revisit when Phases 1–3 land, a second
contributor joins, or production traffic makes a protected `main` worthwhile. At that point the
natural shape is: `main` = production (Vercel + EAS production channel), `staging` = integration,
short-lived feature branches off `staging`.

Housekeeping: a stray worktree exists at `.claude/worktrees/` from an earlier design-pass
session — check and clean up when convenient.

## Verification
- Screens: `cd apps/mobile && npx expo start --tunnel --clear`, then walk the changed screen and
  its navigation entry on a device.
- Types: `npm run type-check` from the repo root after touching `packages/core`.
- PayFast: full sandbox run (`PAYFAST_SANDBOX=true`) — checkout → ITN → subscription row → UI tier.
