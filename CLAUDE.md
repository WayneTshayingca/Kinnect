# Kinnect — Claude Instructions

## What this is
Kinnect is Africa's family coordination platform targeting the South African market.
It helps multi-generational households manage tasks, calendars, shopping, routines,
and (eventually) custody logistics in one shared space.

Revenue model: freemium via PayFast (ZAR billing).
Bundle identifier: `africa.kinnect.app`

## Monorepo layout
- `apps/web` — Next.js 14 App Router web app (Vercel)
- `apps/mobile` — Expo / React Native mobile app (EAS)
- `packages/core` — shared DB queries, auth, types, formatters (zero React)
- `packages/hooks` — shared React hooks (portable: web + RN)
- `supabase/migrations/` — numbered SQL migrations (000–016 deployed)

## Tech stack
- **Web:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Lucide
- **Mobile:** Expo ~55, React Native 0.83, NativeWind, Expo Router
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Monorepo:** Turborepo
- **Payments:** PayFast (SA only — NOT Stripe)
- **Error monitoring:** Sentry (web)
- **Deployment:** Vercel (web) + EAS (mobile)

## Dev commands
```bash
# Web
npm run dev           # starts apps/web via Turborepo
npm run build
npm run type-check

# Mobile (run from apps/mobile — NOT from root)
cd apps/mobile
npx expo start        # then press a/i/w or scan QR
npx expo start --android
npx expo start --ios

# DB types (after schema changes)
npx supabase gen types typescript --project-id <id> > packages/core/src/types/database.ts
```

## Architecture rules
- **All DB queries go in `packages/core/src/supabase/`** — never inline Supabase calls in UI components
- **All shared types live in `packages/core/src/types/database.ts`**
- **`@kinnect/core` and `@kinnect/hooks` are React-free** — no DOM APIs, no `window`, no Tailwind classes
- Web-only concerns (BroadcastChannel, visibilitychange, Tailwind ROLE_COLORS) stay in `apps/web`
- Mobile-only concerns (AppState, SecureStore) stay in `apps/mobile`
- Service role key only in `/api/*` routes — never client-side

## RLS pattern
All tables are RLS-protected. Every policy uses `get_my_family_id()` which returns `users.active_family_id` for the current session. You never need to manually scope queries — the DB handles it.

Key gotcha: `active_family_id` (not `family_id`) drives RLS. `family_id` on users is a legacy column (first family only).

## Auth patterns
- `getSession()` — fast, reads localStorage, no network. Use for initial renders.
- `getUser()` — validates JWT against Supabase server. Use only when validation is required.
- `useUser()` from `user-provider.tsx` provides the current user everywhere in the dashboard.
- Dependents/observers have no `auth_user_id`. Adding them requires `POST /api/members` (service role), not a direct client insert.

## Realtime patterns
- **Data sync (web):** `useRealtimeSync` — wraps `useRealtimeSubscription` + adds BroadcastChannel for cross-tab + visibilitychange for backgrounded tabs
- **Data sync (mobile):** `useRealtimeSubscription` directly + `AppState` for background refetch
- **Presence:** `useShoppingPresence` from `@kinnect/hooks` — requires `getSession()` + `setAuth(token)` BEFORE creating the channel or it will time out

## Optimistic UI
All mutations that have predictable outcomes use optimistic updates:
1. Update local state immediately
2. Fire API in background
3. Revert on failure

## Feature status
| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Google OAuth | Complete |
| 2 | Routines & Responsibilities | Complete |
| 3 | Activity Tracker (family feed) | Planned |
| 4 | PayFast Premium billing | Planned |
| — | Mobile app | In progress |

## Mobile app specifics
- Expo Router for navigation (file-based, same mental model as Next.js App Router)
- NativeWind for styles (Tailwind syntax → StyleSheet)
- `apps/mobile/lib/supabase.ts` — Supabase client using AsyncStorage + SecureStore
- `apps/mobile/components/providers/user-provider.tsx` — mirrors web's UserProvider
- Tab routes: `(tabs)/index`, `(tabs)/tasks`, `(tabs)/calendar`, `(tabs)/family`
- Auth routes: `(auth)/login`, `(auth)/signup`
- Onboarding: `(onboarding)/index`
- Start with: `cd apps/mobile && npx expo start`

## DB migration convention
Files are numbered `NNN_description.sql`. Run in order in Supabase Dashboard → SQL Editor.
Never skip a number. Currently deployed: 000–016.

## SA-specific context
- Currency: ZAR (South African Rand)
- Payment gateway: PayFast (not Stripe — PayFast is the dominant SA processor)
- Holidays: SA public holidays are built into the calendar (`packages/core/src/utils/saHolidays.ts`)
- Privacy: POPIA-compliant privacy policy at `/privacy` (required for Google OAuth publishing)
- Domain: `kinnect.co.za` / `africa.kinnect.app`

## What NOT to do
- Don't add Stripe, Paddle, or non-SA payment processors
- Don't put Supabase queries directly in components — use `@kinnect/core`
- Don't add DOM APIs to `packages/core` or `packages/hooks`
- Don't use `family_id` as the RLS key — use `active_family_id`
- Don't insert dependents/observers client-side — always use `POST /api/members`
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the client