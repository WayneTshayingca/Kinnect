# Kinnect Architecture Overview

## Monorepo Structure

```
kinnect/
│
├── apps/
│   └── web/                              # Next.js 14 Web Application
│       ├── app/
│       │   ├── page.tsx                  # Sign-in page (root — also handles hash redirects)
│       │   ├── layout.tsx                # Root layout + SupabaseProvider + favicon metadata
│       │   ├── globals.css               # Global styles
│       │   │
│       │   ├── auth/
│       │   │   ├── login/page.tsx        # Redirects to /
│       │   │   ├── signup/page.tsx       # Registration + confirm password + email sent screen
│       │   │   ├── callback/page.tsx     # Handles Supabase redirect (invite, signup, PKCE)
│       │   │   ├── forgot-password/page.tsx  # Request password reset email
│       │   │   ├── reset-password/page.tsx   # Set new password via recovery token
│       │   │   └── set-password/page.tsx     # Invited user sets password + confirms name
│       │   │
│       │   ├── onboarding/page.tsx       # Create family after signup
│       │   │
│       │   ├── api/
│       │   │   ├── invite/route.ts       # POST — send email invites (service role)
│       │   │   └── members/route.ts      # POST — add family member (service role, auth-gated)
│       │   │
│       │   └── dashboard/
│       │       ├── layout.tsx            # Nav, auth guard, AnimatedLogo loading overlay
│       │       ├── page.tsx              # Dashboard home (widgets + stats)
│       │       ├── tasks/page.tsx        # Task list with filters
│       │       ├── calendar/page.tsx     # Month grid + agenda views
│       │       ├── shopping-list/page.tsx # Shopping list + shopping mode + presence banner
│       │       ├── family/page.tsx       # Redirects to /dashboard/profile
│       │       └── profile/page.tsx      # User profile + family member management
│       │
│       ├── components/
│       │   ├── providers/
│       │   │   ├── supabase-provider.tsx # Initializes Supabase client singleton on app start
│       │   │   └── user-provider.tsx     # UserContext: fast session load via getSession() + background validation
│       │   ├── dashboard/
│       │   │   ├── DashboardStats.tsx    # Stat cards: Done Today, Daily Tasks, This Week
│       │   │   ├── TodaysTasksWidget.tsx # Today's tasks preview + quick-add form
│       │   │   ├── ShoppingListWidget.tsx # Shopping list preview + "Shop" button
│       │   │   ├── UpcomingEventsWidget.tsx # This week's events + detail modal
│       │   │   └── FamilyActivityWidget.tsx # Members ranked by weekly completions
│       │   ├── AnimatedLogo.tsx          # Animated SVG logo (framer-motion, repeat mode)
│       │   ├── Logo.tsx                  # Static logo (full, icon, stacked variants)
│       │   ├── CreateTaskModal.tsx       # Modal: create task with assignees + due date
│       │   ├── CreateEventModal.tsx      # Modal: create/edit calendar event
│       │   └── AddMemberModal.tsx        # Modal: add/edit family member + invite
│       │
│       ├── hooks/
│       │   ├── useRealtimeSync.ts        # Supabase Realtime + BroadcastChannel for data sync
│       │   └── useShoppingPresence.ts    # Supabase Realtime presence for shopping mode
│       │
│       ├── lib/
│       │   ├── logger.ts                 # Pino (server) / console (client) + Sentry capture
│       │   ├── formatters.ts             # timeAgo, getTodayStr, date helpers
│       │   └── constants.ts              # ROLE_COLORS, ROLE_LABELS
│       │
│       ├── public/
│       │   └── favicon.svg               # Kinnect favicon
│       │
│       ├── .env.local                    # Environment variables
│       ├── next.config.js                # Next.js config
│       ├── tailwind.config.js            # Tailwind CSS (custom brand colors)
│       └── package.json
│
├── packages/
│   └── core/                             # Shared Business Logic
│       └── src/
│           ├── supabase/
│           │   ├── client.ts             # Supabase singleton + Realtime JWT sync via onAuthStateChange
│           │   ├── auth.ts               # signUp, signIn, signOut, getCurrentUser, getSession
│           │   ├── families.ts           # createFamily, getFamily, getFamilyMembers,
│           │   │                         # addFamilyMember, updateFamily,
│           │   │                         # updateFamilyMember, removeFamilyMember,
│           │   │                         # getMyFamilies, switchActiveFamily
│           │   ├── tasks.ts              # getTasks, createTask, completeTask,
│           │   │                         # uncompleteTask, assignTask, deleteTask
│           │   ├── calendar.ts           # getCalendarEvents, createCalendarEvent,
│           │   │                         # updateCalendarEvent, deleteCalendarEvent
│           │   └── shopping-list.ts      # getShoppingList, getShoppingListPreview,
│           │                             # getFullShoppingList, addShoppingListItem,
│           │                             # toggleShoppingListItem, updateShoppingListItem,
│           │                             # deleteShoppingListItem, clearCompletedItems
│           ├── types/
│           │   └── database.ts           # Auto-generated DB types + helper aliases
│           └── index.ts                  # Public API (re-exports everything)
│
├── supabase/
│   └── migrations/
│       ├── 000_initial_schema.sql        # families, users, tasks tables + RLS
│       ├── 001_add_calendar_events.sql   # calendar_events table + RLS policies
│       ├── 002_add_location_to_calendar_events.sql  # adds location column
│       ├── 003_add_shopping_lists.sql    # lists + list_items tables + RLS policies
│       ├── 004_update_user_roles.sql     # Updates role values to admin/member/dependent/observer
│       ├── 005_fix_shopping_list_trigger_rls.sql  # SECURITY DEFINER on default list trigger
│       ├── 006_enable_users_rls.sql      # Enables RLS on users/families, rebuilds all
│       │                                 # policies to use get_my_family_id() helper,
│       │                                 # adds create_family_with_user() RPC
│       ├── 007_unique_auth_user_id.sql   # Unique constraint on users.auth_user_id
│       ├── 008_fix_cascade_deletes.sql   # Changes created_by/added_by FKs to SET NULL
│       │                                 # so deleting a member preserves their data
│       ├── 009_enable_realtime.sql       # Adds tables to supabase_realtime publication
│       └── 010_multi_family_support.sql  # Adds family_members junction table,
│                                         # active_family_id on users, updates RLS,
│                                         # adds get_my_families() + switch_active_family() RPCs,
│                                         # updates create_family_with_user() RPC
│
├── ARCHITECTURE.md                       # This file
├── README.md
├── QUICKSTART.md
├── package.json                          # Workspace root
├── turbo.json                            # Turborepo task config
└── tsconfig.json                         # Root TypeScript config
```

---

## Application Flows

### 1. Sign Up & Onboarding

```
Sign-in page (/)
  └─ User clicks "Sign Up" → /auth/signup

Signup page (/auth/signup)
  └─ User enters name, email, password, confirm password
  └─ Live password-match validation
  └─ Calls signUp() from @kinnect/core
      │  → supabase.auth.signUp() creates auth account
      │  → Creates user record in users table (role: 'admin')
      │  → On failure: signOut() cleans up the orphaned auth user
      │
      ▼
"Check your email" screen (same page, emailSent=true)
  └─ User clicks the email verification link
      │
      ▼
/auth/callback (type=signup in hash)
  └─ Redirects to /onboarding

Onboarding page (/onboarding)
  └─ User enters family name
  └─ Calls createFamily() from @kinnect/core
      │  → Calls create_family_with_user() RPC (SECURITY DEFINER)
      │  → Atomically: creates family + links user as admin
      │  → Inserts into family_members junction table
      │  → Sets active_family_id on user
      │
      ▼
Dashboard (/dashboard)
```

### 2. Sign In

```
Sign-in page (/) on mount:
  ├─ getCurrentUser() → if session exists, router.replace('/dashboard')
  ├─ router.prefetch('/dashboard') pre-loads the bundle
  └─ Checks URL hash for fragments:
      ├─ type=invite → /auth/callback
      └─ type=recovery → /auth/reset-password

User submits form:
  └─ signIn(email, password)
      │  → supabase.auth.signInWithPassword()
      │  → On error: show inline error
      │
      ▼
  AnimatedLogo transition overlay (repeat=true while navigating)
      │  → router.push('/dashboard') fires immediately
      │
      ▼
Dashboard (/dashboard)
  └─ UserProvider resolves (see Session Persistence below)
  └─ Dashboard content appears
```

### 3. Forgot Password / Reset Password

```
Forgot password page (/auth/forgot-password)
  └─ User enters email
  └─ resetPasswordForEmail(email, redirectTo=/auth/reset-password)
      │  → supabase.auth.resetPasswordForEmail()
      │  → Supabase emails a recovery link
      │
      ▼
"Check your email" confirmation screen

User clicks the recovery email link:
  └─ Browser lands on /auth/reset-password#access_token=...&type=recovery

Reset password page (/auth/reset-password) on mount:
  ├─ Reads access_token + refresh_token from URL hash
  ├─ supabase.auth.setSession({ access_token, refresh_token })
  │   ├─ On error: "Invalid or expired reset link" + link to request new one
  │   └─ On success: form is enabled (ready=true)
  │
  └─ User sets new password (min 6 chars, confirm match)
      └─ supabase.auth.updateUser({ password })
          │
          ▼
      Dashboard (/dashboard)
```

### 4. Family Member Invite (Admin → Invitee)

**Admin side:**
```
AddMemberModal — user clicks "Add Member" + provides email
  │
  ▼
1. POST /api/members  (with Authorization: Bearer <user JWT>)
   ├─ Verifies JWT via supabase.auth.getUser()
   ├─ Checks caller has role='admin' in users table
   ├─ Uses service role client to INSERT into users (bypasses RLS)
   ├─ Uses service role client to INSERT into family_members
   └─ Returns { user: newUser }

2. POST /api/invite  (if email was provided)
   ├─ Uses service role client
   ├─ supabase.auth.admin.inviteUserByEmail(email, { data: { user_id, family_id } })
   │   → Supabase creates auth account + sends invite email
   └─ Links auth_user_id on the existing users row
```

**Invitee side:**
```
Invitee clicks email link → /auth/callback#access_token=...&type=invite

Callback page (/auth/callback):
  ├─ Reads hash fragment: access_token, refresh_token, type
  ├─ Decodes JWT payload: email, name, user_id, family_id from user_metadata
  └─ Calls redirectToSetPassword() → /auth/set-password?email=...&access_token=...

Set password page (/auth/set-password):
  ├─ supabase.auth.setSession({ access_token, refresh_token })
  │   ├─ On error: "Invalid invite link"
  │   └─ On success: form enabled (sessionReady=true)
  └─ User confirms name + sets password
      ├─ supabase.auth.updateUser({ password })
      └─ updateFamilyMember(userId, { name }) (non-critical, name already set)
          │
          ▼
      Dashboard (/dashboard)
```

> **PKCE fallback:** If the invite uses PKCE flow, the callback receives a `?code=` query
> param instead. It exchanges this via `GET /auth/callback/exchange?code=...` then follows
> the same `redirectToSetPassword()` path.

### 5. Session Persistence & Auth Guard

```
Any /dashboard/* page loads
  │
  ▼
UserProvider (in dashboard layout) on mount — FAST PATH:
  1. supabase.auth.getSession()  ← reads from localStorage, no network
     └─ If no session: setLoading(false) → DashboardShell redirects to /
     └─ If session found:
  2. supabase.from('users').select('*').eq('auth_user_id', session.user.id)
     └─ One DB query — resolves in ~100–300ms
     └─ setUser(userData), setLoading(false)  ← dashboard renders
  3. Background: supabase.auth.getUser()  ← validates JWT against Supabase auth server
     └─ If revoked/invalid: setUser(null) → DashboardShell redirects to /

DashboardShell while loading=true:
  └─ Shows AnimatedLogo overlay (seamless continuation from sign-in transition)

DashboardShell once loading=false:
  ├─ No user → router.push('/')
  ├─ No active_family_id → router.push('/onboarding')
  └─ Has user + family → renders nav + page content
```

**Realtime JWT sync** (`packages/core/src/supabase/client.ts`):
```
initSupabase() registers onAuthStateChange listener:
  └─ On every session change (login, refresh, logout):
      └─ supabase.realtime.setAuth(session?.access_token ?? null)
          → keeps the Realtime WebSocket JWT in sync
          → required for presence channels (Postgres changes work without this,
            but presence authentication fails without a user JWT)
```

### 6. Shopping Mode & Presence

```
Shopping list page (/dashboard/shopping-list)
  └─ URL param ?mode=shopping initialises shopping mode

Shopping mode active:
  ├─ "Done Shopping" button in header (toggles mode off)
  ├─ Add-item form hidden
  ├─ Items have larger touch targets, no edit/delete actions
  └─ useShoppingPresence hook tracks user in Supabase Realtime presence

useShoppingPresence (apps/web/hooks/useShoppingPresence.ts):
  ├─ Channel: shopping:{familyId}  (one per family)
  ├─ On mount:
  │   ├─ supabase.auth.getSession() → setAuth(token) BEFORE subscribing
  │   │   (presence channels require user JWT — anon key alone causes TIMED_OUT)
  │   ├─ channel.on('presence', { event: 'sync' }, ...) → updates otherShoppers[]
  │   └─ channel.subscribe() → if shopping mode, channel.track({ userId, name })
  ├─ On isShoppingMode toggle (separate effect):
  │   ├─ true  → channel.track({ userId, name })
  │   └─ false → channel.untrack()
  └─ On unmount: supabase.removeChannel()

Presence banner (shown when otherShoppers.length > 0):
  └─ "Wayne and Sarah are shopping right now"
```

### 7. Dashboard

```
Dashboard page loads (/dashboard)
  └─ Gets user from useUser() hook (no duplicate fetch)
  └─ Uses user.family_id (scoped to active family via RLS)
      │
      ▼
Parallel fetch (Promise.all):
  ├─ getFamily(familyId)              → family name
  ├─ getFamilyMembers(familyId)       → member list
  ├─ getTasks(familyId)               → all tasks
  ├─ getCalendarEvents(familyId, ...) → this week's events
  └─ getShoppingListPreview(familyId) → top 4 shopping items
      │
      ▼
Renders widget layout:
  ├─ Top Banner: family name, welcome message, stat cards
  ├─ Grid: TodaysTasksWidget + ShoppingListWidget
  ├─ Full width: UpcomingEventsWidget
  └─ Full width: FamilyActivityWidget
```

### 8. Task Management

```
Tasks page loads (/dashboard/tasks)
  └─ Fetches getTasks(familyId)
      │
      ▼
Renders task list with filter tabs: All | Pending | Completed
  │
  ├─ "Create Task" button / task title click
  │   └─ Opens CreateTaskModal (edit mode pre-fills fields)
  │       ├─ Title (required), Description, Due Date, Points
  │       ├─ Assign To: checkboxes for each family member
  │       └─ Submit → createTask() / updateTask() from @kinnect/core
  │
  └─ Task card actions (optimistic UI):
      ├─ Checkbox → completeTask(taskId, userId)
      │   ├─ Instantly marks as completed in UI
      │   ├─ Fires API in background
      │   └─ Reverts on failure
      └─ Undo → uncompleteTask(taskId)
          └─ Same optimistic pattern
```

### 9. Calendar

```
Calendar page loads (/dashboard/calendar)
  └─ Fetches getCalendarEvents(familyId, monthStart, monthEnd)
      │
      ▼
View toggle tabs: Month | Agenda

MONTH VIEW:
  ├─ 7-column CSS grid with day cells
  ├─ Today: blue circle highlight
  ├─ Events: blue pills in cells (max 2 shown, "+N more" overflow)
  ├─ Click a day → detail panel below grid
  │   ├─ Edit (pencil) → opens CreateEventModal with event data
  │   └─ Delete (trash) → confirm + deleteCalendarEvent()
  ├─ Navigation: ◀ Month Year ▶ + "Today" button
  └─ "+" on day cell → opens CreateEventModal with that date pre-filled

AGENDA VIEW:
  ├─ Events grouped by date (sticky date headers)
  ├─ Edit + Delete buttons on each card
  └─ Empty state: "No events this month"
```

### 10. Shopping List

```
Shopping list page loads (/dashboard/shopping-list)
  └─ Parallel fetch:
      ├─ getFamilyMembers(familyId)
      └─ getFullShoppingList(familyId)

NORMAL MODE:
  ├─ Add form: text input + "Add" button
  ├─ Hover actions: edit (pencil), delete (trash)
  ├─ Checkbox toggle (optimistic): moves item to completed list
  └─ "Start Shopping" button → activates shopping mode (?mode=shopping)

SHOPPING MODE (see flow 6 above):
  ├─ Larger touch targets for in-store use
  ├─ No add/edit/delete actions visible
  ├─ Presence banner shows other family members who are also shopping
  └─ "Done Shopping" button → exits mode

COMPLETED ITEMS (collapsible):
  ├─ Checkbox to un-complete
  └─ "Clear All" → clearCompletedItems()
```

### 11. Family Management

```
Profile page loads (/dashboard/profile)
  └─ Fetches getFamily() + getFamilyMembers() in parallel
      │
      ▼
MEMBER CARDS:
  ├─ Role badge + avatar (colored circle by role)
  ├─ "Invite" button → opens edit modal with email field
  │   └─ On save: POST /api/invite → email sent
  ├─ Edit (pencil) → AddMemberModal in edit mode
  │   └─ updateFamilyMember() for name/role/phone changes
  └─ Delete (trash) → confirm → removeFamilyMember()
      ├─ Auth users: removed from family_members only
      └─ Dependents/observers (no auth): user record deleted

ADD MEMBER flow:
  └─ AddMemberModal → POST /api/members (service role, RLS bypass)
      └─ Optional: POST /api/invite if email provided
```

---

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/invite` | POST | Service role | Sends email invite via `supabase.auth.admin.inviteUserByEmail()`, links auth user to existing member record |
| `/api/members` | POST | Bearer JWT + admin role check | Creates user record + family_members row using service role (bypasses RLS which blocks client-side insert of rows without auth_user_id) |

### `/api/members` auth flow
1. Extract `Authorization: Bearer <token>` from request headers
2. `callerClient.auth.getUser()` — validates JWT against Supabase (network call)
3. Query `users` table to confirm caller has `role='admin'`
4. Switch to `adminClient` (service role) only after both checks pass
5. Insert into `users` + `family_members`; on `family_members` failure, delete the `users` row to avoid orphans

---

## Component Reference

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Sign In | `/` | Email + password sign-in. Redirects to dashboard if session exists. Handles hash fragments for invites/recovery |
| Signup | `/auth/signup` | Name + email + password + confirm password. Shows "check email" screen after submit |
| Auth Callback | `/auth/callback` | Handles Supabase email redirects (invite, signup verification, PKCE code exchange) |
| Forgot Password | `/auth/forgot-password` | Sends password reset email |
| Reset Password | `/auth/reset-password` | Sets new password via recovery token from URL hash |
| Set Password | `/auth/set-password` | Invited user sets password and confirms name |
| Onboarding | `/onboarding` | Family name creation (post-signup) |
| Dashboard | `/dashboard` | Widget-based overview with stats |
| Tasks | `/dashboard/tasks` | Full task list with All/Pending/Completed filters |
| Calendar | `/dashboard/calendar` | Month grid + agenda views, event CRUD |
| Shopping List | `/dashboard/shopping-list` | Shopping list + shopping mode + presence |
| Profile | `/dashboard/profile` | User info, password change, family member management |

### Dashboard Widgets

| Widget | File | Description |
|--------|------|-------------|
| `DashboardStats` | `components/dashboard/DashboardStats.tsx` | Three stat cards: Done Today, Daily Tasks, This Week |
| `TodaysTasksWidget` | `components/dashboard/TodaysTasksWidget.tsx` | Up to 3 incomplete tasks. Task title is a clickable button that opens edit modal. Overdue badge. Quick-add form |
| `ShoppingListWidget` | `components/dashboard/ShoppingListWidget.tsx` | Up to 4 shopping items + quick-add. "Shop" button links to `?mode=shopping` |
| `UpcomingEventsWidget` | `components/dashboard/UpcomingEventsWidget.tsx` | This week's events. Click to open inline detail modal |
| `FamilyActivityWidget` | `components/dashboard/FamilyActivityWidget.tsx` | Members ranked by weekly task completions |

### Modals

| Modal | File | Description |
|-------|------|-------------|
| `CreateTaskModal` | `components/CreateTaskModal.tsx` | Create/edit task: title, description, due date, assignees |
| `CreateEventModal` | `components/CreateEventModal.tsx` | Create/edit calendar event: all-day toggle, location, start/end times |
| `AddMemberModal` | `components/AddMemberModal.tsx` | Add/edit family member. Add uses `POST /api/members` (service role). Optional email triggers `POST /api/invite`. Role cards with descriptions. Inline specific error messages |

### Providers

| Provider | File | Hook | Description |
|----------|------|------|-------------|
| `SupabaseProvider` | `components/providers/supabase-provider.tsx` | — | Initializes Supabase singleton via `initSupabase()` on first render |
| `UserProvider` | `components/providers/user-provider.tsx` | `useUser()` | Fast initial load via `getSession()` (localStorage) + 1 DB query. Background `getUser()` validates the JWT. Provides `{ user, loading, refreshUser }` |

### Hooks

| Hook | File | Description |
|------|------|-------------|
| `useRealtimeSync` | `hooks/useRealtimeSync.ts` | Subscribes to Supabase Realtime Postgres changes for a table. Also syncs across tabs via `BroadcastChannel` |
| `useShoppingPresence` | `hooks/useShoppingPresence.ts` | Tracks which family members are in shopping mode using Supabase Realtime presence. Requires `getSession()` + `setAuth()` before channel creation |

### Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `AnimatedLogo` | `components/AnimatedLogo.tsx` | Framer Motion animated SVG logo. Props: `size`, `color`, `repeat` (loop vs once), `onComplete`. Used for sign-in transition and dashboard loading overlay |
| `Logo` | `components/Logo.tsx` | Static Kinnect logo: `full`, `icon`, `stacked` variants × `primary`, `white`, `dark` colors × `sm`, `md`, `lg`, `xl` sizes |

### Core Functions (`@kinnect/core`)

**Auth** (`supabase/auth.ts`)

| Function | Network | Description |
|----------|---------|-------------|
| `signUp(email, password, name)` | Yes | Creates auth account + user record (role: admin). Cleans up on failure |
| `signIn(email, password)` | Yes | Signs in via `supabase.auth.signInWithPassword()` |
| `signOut()` | Yes | Signs out current session |
| `getCurrentUser()` | Yes × 2 | `getUser()` (validates JWT) + DB query for user profile. Use only when validation is required |
| `getSession()` | No | Returns raw Supabase session from localStorage cache. Use for fast initial reads |

> **Note:** `UserProvider` uses `getSession()` + a direct DB query for the initial load,
> then calls `getUser()` in the background for token validation. This avoids 2 sequential
> network calls on every dashboard visit.

**Families** (`supabase/families.ts`)

| Function | Description |
|----------|-------------|
| `createFamily(name, primaryLanguage?)` | Creates family + links user as admin via RPC |
| `getMyFamilies()` | All families the current user belongs to |
| `switchActiveFamily(familyId)` | Updates `active_family_id` (changes RLS context) |
| `getFamily(familyId)` | Returns family record |
| `getFamilyMembers(familyId)` | Returns all members via family_members junction table |
| `addFamilyMember(familyId, name, role)` | **Web: use `POST /api/members` instead** — direct client insert is blocked by RLS when inserting rows without `auth_user_id` |
| `updateFamily(familyId, data)` | Updates family name |
| `updateFamilyMember(memberId, data)` | Updates name, role, phone; syncs role to family_members |
| `removeFamilyMember(memberId)` | Removes from family_members; deletes user record for auth-less members |

**Tasks** (`supabase/tasks.ts`)

| Function | Description |
|----------|-------------|
| `getTasks(familyId)` | All tasks for a family (newest first) |
| `createTask(input)` | Creates task with title, assignees, due date, points |
| `completeTask(taskId, userId)` | Marks task completed by user |
| `uncompleteTask(taskId)` | Reverts task to incomplete |
| `assignTask(taskId, userIds)` | Updates task assignees |
| `deleteTask(taskId)` | Deletes a task |

**Calendar** (`supabase/calendar.ts`)

| Function | Description |
|----------|-------------|
| `getCalendarEvents(familyId, start, end)` | Events in date range |
| `createCalendarEvent(data)` | Creates a new event |
| `updateCalendarEvent(eventId, data)` | Updates an existing event |
| `deleteCalendarEvent(eventId)` | Deletes an event |

**Shopping List** (`supabase/shopping-list.ts`)

| Function | Description |
|----------|-------------|
| `getShoppingListPreview(familyId, limit)` | Top N items + total count (dashboard widget) |
| `getFullShoppingList(familyId)` | Incomplete + completed items (full page) |
| `addShoppingListItem(familyId, userId, data)` | Adds item to the list |
| `toggleShoppingListItem(itemId, completed, userId)` | Toggles completed/incomplete |
| `updateShoppingListItem(itemId, data)` | Updates item title |
| `deleteShoppingListItem(itemId)` | Deletes an item |
| `clearCompletedItems(familyId)` | Deletes all completed items |

---

## Code Sharing Strategy

```
@kinnect/core (shared)          apps/web (web only)        apps/mobile (future)
┌────────────────────────┐     ┌───────────────────┐      ┌───────────────────┐
│ Supabase queries       │     │ Next.js pages      │      │ React Native      │
│ Auth functions         │◄────│ React components   │      │ screens           │
│ TypeScript types       │     │ Tailwind styles     │      │ Native navigation │
│ Business logic         │◄────────────────────────────────│ Mobile UI         │
└────────────────────────┘     └───────────────────┘      └───────────────────┘
       60-70% reuse
```

All database queries, auth logic, and types live in `@kinnect/core`. Web-specific UI lives in `apps/web`. When a mobile app is added, it imports `@kinnect/core` and only needs its own UI layer.

> **Notifications:** Push notifications are deferred to when the mobile app is built.
> The `push_token` column on `users` is already in place. Presence (via Supabase Realtime)
> is used as the current real-time awareness mechanism for features like shopping mode.

---

## Database Schema

### families
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Family/household name |
| primary_language | text | Nullable, for future i18n |
| created_at | timestamp | |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| family_id | uuid | FK → families (legacy; first family only) |
| active_family_id | uuid | FK → families (drives RLS via get_my_family_id()) |
| auth_user_id | uuid | FK → auth.users (null if no account — dependents/observers) |
| name | text | Display name |
| role | text | admin, member, dependent, observer (reflects primary family role) |
| phone | text | Nullable |
| avatar_url | text | Nullable, for future use |
| points | integer | Reward points from completing tasks |
| language_preference | text | Nullable, for future i18n |
| push_token | text | Nullable, for future push notifications |
| created_at | timestamp | |

> **RLS note:** Inserting a `users` row without `auth_user_id` (dependents/observers) cannot
> be done client-side — RLS has no basis to allow it. Use `POST /api/members` which uses the
> service role key after verifying the caller is an admin.

### family_members
| Column | Type | Notes |
|--------|------|-------|
| family_id | uuid | PK + FK → families |
| user_id | uuid | PK + FK → users |
| role | text | admin, member, dependent, observer (per-family role) |
| joined_at | timestamptz | |

> **Multi-family:** A user can belong to multiple families via this junction table.
> `users.active_family_id` determines the active family context for all RLS policies.
> Switch families with `switchActiveFamily()` which calls the `switch_active_family()` RPC.

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| family_id | uuid | FK → families |
| title | text | Task name |
| description | text | Nullable |
| assigned_to | uuid[] | Array of user IDs |
| category | text | Nullable |
| points | integer | Points awarded on completion |
| completed | boolean | |
| completed_by | uuid | FK → users, SET NULL on member delete |
| completed_at | timestamp | |
| due_date | timestamp | Nullable |
| created_by | uuid | FK → users, SET NULL on member delete |
| created_at | timestamp | |

### calendar_events
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| family_id | uuid | FK → families |
| title | text | Event name |
| description | text | Nullable |
| location | text | Nullable |
| start_time | timestamptz | |
| end_time | timestamptz | |
| all_day | boolean | Default false |
| created_by | uuid | FK → users, SET NULL on member delete |
| created_at | timestamptz | |

### lists
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| family_id | uuid | FK → families |
| type | text | e.g. "grocery" |
| name | text | Display name |
| created_at | timestamptz | |

### list_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| list_id | uuid | FK → lists |
| title | text | Item name |
| quantity | text | Nullable |
| notes | text | Nullable |
| completed | boolean | Default false |
| completed_by | uuid | FK → users, SET NULL on member delete |
| completed_at | timestamptz | Nullable |
| added_by | uuid | FK → users, SET NULL on member delete |
| position | integer | Sort order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

All tables have Row Level Security (RLS) policies — users can only access data belonging to their active family. All policies use the `get_my_family_id()` helper function (`SECURITY DEFINER`) which returns `users.active_family_id` for the authenticated user.

### Database Functions (RPCs)

| Function | Description |
|----------|-------------|
| `get_my_family_id()` | Returns `active_family_id` for the current auth user. Used by all RLS policies |
| `create_family_with_user(family_name, auth_uid, user_name, primary_lang?)` | Atomically creates a family, links the user as admin, inserts into family_members, sets active_family_id |
| `get_my_families()` | Returns all families the current user belongs to (family_id, family_name, role, is_active) |
| `switch_active_family(target_family_id)` | Validates membership then updates the user's active_family_id |

---

## Key Patterns

### Data Fetching
Every dashboard page follows the same pattern:
1. `useUser()` hook provides the current user (fetched once by `UserProvider`)
2. Guard: no user → redirect to login; no `active_family_id` → redirect to onboarding
3. `useEffect` with `[user?.family_id]` dependency (primitive, not object reference)
4. Fetch page-specific data using `user.family_id` (scoped to active family by RLS)
5. Render with loading/empty states

### Multi-Family Support (DB ready, UI pending)
The database layer fully supports multi-family:
- `family_members` junction table allows one user → many families
- `active_family_id` on users drives which family's data is shown
- `get_my_families()` RPC returns all families for the current user
- `switch_active_family()` RPC changes the active context

**Still needed in the frontend:**
- Family switcher UI in the dashboard header
- `UserProvider` exposing family list and switch function
- Invite callback inserting into `family_members` for second-family invites
- Onboarding "join existing family" path

### Optimistic Updates
Mutations that have predictable outcomes use optimistic UI:
1. Update local state immediately (instant feedback)
2. Fire API call in background
3. On failure: revert local state or refetch from server

Used in: task complete/uncomplete, shopping item toggle/delete, dashboard item completion.

### Auth Guard & Loading
`DashboardShell` in `apps/web/app/dashboard/layout.tsx`:
- While `loading=true`: renders a full-screen `AnimatedLogo` overlay (same visual as the sign-in transition, so the user never sees a blank screen)
- Once loaded: redirects to `/` if no user, `/onboarding` if no active family, otherwise renders content
- Signs out automatically if background JWT validation fails (no user returned by `getUser()`)

### Supabase Realtime
Two patterns are used:

**Data sync** (`useRealtimeSync`):
- Subscribes to Postgres changes on a table
- On change: calls a `refetch` callback
- Also syncs across tabs via `BroadcastChannel` so other open tabs update without a separate WebSocket subscription

**Presence** (`useShoppingPresence`):
- Uses Supabase Realtime presence channels (not Postgres changes)
- Requires a user JWT — `getSession()` + `setAuth(token)` must be called before creating the channel, otherwise subscriptions time out
- Channel is stable per identity (created once, not recreated on mode toggle)
- A separate `useEffect` handles `track()` / `untrack()` when shopping mode changes

### Logging & Error Monitoring
`apps/web/lib/logger.ts`:
- Server: Pino with `pino-pretty` in development
- Client: `console.*`
- All `logger.error()` calls capture to Sentry
- Supabase throws `PostgrestError` (plain object, not `Error` instance) — the logger extracts `.message` from any object with that property so Sentry gets a useful error title, with the full raw error attached as `extra` context
- Debug logs filtered by domain: `NEXT_PUBLIC_DEBUG_DOMAINS=auth,shopping` — only emit those domains. Unset or `*` = show all

### Performance
- **Parallel fetching**: `Promise.all` for independent data on page load
- **Memoized lookups**: `useMemo` for member maps (O(1) vs O(n) array search)
- **Link prefetching**: `<Link>` components auto-prefetch; `router.prefetch('/dashboard')` on sign-in page mount
- **Shared user context**: `UserProvider` fetches once, all pages use `useUser()`
- **Optimistic updates**: Instant perceived performance for mutations
- **Fast auth**: `getSession()` (localStorage, no network) for initial render; `getUser()` validation in background
- **No blank loading screen**: `AnimatedLogo` overlay shown during auth check instead of `null`

### Modals
All modals follow a consistent pattern:
- Props: `isOpen`, `onClose`, `familyId`, `userId`, callback (e.g. `onEventCreated`)
- Optional entity prop for edit mode (e.g. `event?: CalendarEvent`)
- `useEffect` populates form when `isOpen` changes
- Loading state on submit button; inline error display above the form

### Styling
- Tailwind utility classes throughout
- Custom brand colors: `brand-primary`, `brand-accent`, `brand-success`, `brand-bg`
- Widget cards: `bg-white rounded-[1.5rem] shadow-sm`
- Form inputs: `border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-500`
- Buttons: `bg-brand-accent text-white rounded-xl hover:bg-accent-600`
- Role colors: Admin (blue), Member (purple), Dependent (green), Observer (amber)

---

## Environment Variables

| Variable | Prefix | Used By | Purpose |
|----------|--------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client + Server | Public API key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | None | Server only | Admin key — bypasses RLS. Used in `/api/invite` and `/api/members` |
| `NEXT_PUBLIC_DEBUG_DOMAINS` | Public | Client + Server | Comma-separated domains to enable debug logs (e.g. `auth,shopping`). Leave unset or set to `*` for all. Debug logs are suppressed in production regardless |

The service role key is **never** exposed to the client. It is only used in server-side API route handlers.

---

## Commands

```bash
npm run dev          # Start development server (all apps via Turborepo)
npm run build        # Production build
npm run lint         # ESLint across all packages
npm run type-check   # TypeScript strict mode check

# Regenerate DB types after schema changes
npx supabase gen types typescript --project-id <project-id> > packages/core/src/types/database.ts
```
