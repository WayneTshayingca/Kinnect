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

Still to cover:
- [ ] `app/(auth)/login.tsx`
- [ ] `app/(auth)/signup.tsx`
- [ ] `app/(tabs)/menu.tsx`
- [ ] `app/profile.tsx`
- [ ] `app/routines.tsx`

### 1b. Close functional gaps
All backed by functions already exported from `@kinnect/core` — no backend work required.

- [ ] **Family management** — add / remove / role-edit members on `(tabs)/family.tsx`.
      Adding a member goes through `POST /api/members` (service role), never a client insert.
- [ ] **Account security** — new screen wiring `changePassword` / `resetPasswordForEmail`
- [ ] **Forgot password** — new `(auth)/forgot-password.tsx` + link from login
- [ ] **Routines CRUD** — upgrade `routines.tsx` from read-only to create/edit/deactivate/delete
      via `createResponsibilityFlow`, `updateResponsibilityFlow`, `deactivateFlow`, `deleteFlow`,
      `getResponsibilityFlows`, `getResponsibilityTemplates`
- [ ] **Multi-family switching** — surface `getMyFamilies` / `switchActiveFamily`
      (`components/FamilySwitcherSheet.tsx` already exists)

### 1c. Stretch — not blocking
- [ ] Google OAuth via `expo-auth-session` / `expo-web-browser`
- [ ] Push notifications via `expo-notifications` (`users.push_token` column already exists)

## Phase 2 — Navigation
Add entries for the Phase 1b screens (account security from menu, forgot-password from login,
routine create/edit from routines) and re-audit that every route target resolves.

## Phase 3 — PayFast + paywall
Spec lives in `IMPLEMENTATION.md` Phase 4. Migrations **018–019**.
Mobile piece: `app/paywall.tsx` opening the web checkout in `expo-web-browser`, plus a mobile
`subscription-provider`. PayFast has no native SDK, so checkout is always a web handoff.

## Phase 4 — Publishing readiness
- [ ] `eas.json` — development / preview / production build profiles (does not exist yet)
- [ ] App icons + splash, `app.json` permissions and `africa.kinnect.app` identifier review
- [ ] Privacy policy (POPIA) linked from signup — web `/privacy` already exists
- [ ] Store metadata + screenshots (App Store, Play Store)
- [ ] Decide on mobile error monitoring (Sentry is currently web-only)
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
