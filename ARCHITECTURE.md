# Kinnect Architecture Overview

## Monorepo Structure

```
kinnect/
│
├── apps/
│   └── web/                              # Next.js 14 Web Application
│       ├── app/
│       │   ├── page.tsx                  # Landing page
│       │   ├── layout.tsx                # Root layout + SupabaseProvider
│       │   ├── globals.css               # Global styles
│       │   │
│       │   ├── auth/
│       │   │   ├── login/page.tsx        # Login form
│       │   │   └── signup/page.tsx       # Signup form
│       │   │
│       │   ├── onboarding/page.tsx       # Create family after signup
│       │   │
│       │   ├── api/
│       │   │   └── invite/route.ts       # POST - send email invites (server-side)
│       │   │
│       │   └── dashboard/
│       │       ├── layout.tsx            # Nav bar, auth guard, UserProvider
│       │       ├── page.tsx              # Dashboard home (widgets + stats)
│       │       ├── tasks/page.tsx        # Task list with filters
│       │       ├── calendar/page.tsx     # Month grid + agenda views
│       │       ├── shopping-list/page.tsx # Full shopping list management
│       │       ├── family/page.tsx       # Family member management
│       │       └── profile/page.tsx      # User profile + password change
│       │
│       ├── components/
│       │   ├── providers/
│       │   │   ├── supabase-provider.tsx # Initializes Supabase client on app start
│       │   │   └── user-provider.tsx     # UserContext: fetches user once, shared via useUser()
│       │   ├── dashboard/
│       │   │   ├── DashboardStats.tsx    # Stat cards: Done Today, Daily Tasks, This Week
│       │   │   ├── TodaysTasksWidget.tsx # Today's tasks preview + quick-add form
│       │   │   ├── ShoppingListWidget.tsx # Shopping list preview + quick-add form
│       │   │   ├── UpcomingEventsWidget.tsx # This week's events + detail modal
│       │   │   └── FamilyActivityWidget.tsx # Members ranked by weekly completions
│       │   ├── CreateTaskModal.tsx       # Modal: create task with assignees + due date
│       │   ├── CreateEventModal.tsx      # Modal: create/edit calendar event
│       │   ├── AddMemberModal.tsx        # Modal: add/edit family member + invite
│       │   └── Logo.tsx                  # Kinnect logo (full, icon, stacked variants)
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
│           │   ├── client.ts             # Supabase client singleton
│           │   ├── auth.ts               # signUp, signIn, signOut, getCurrentUser, getSession
│           │   ├── families.ts           # createFamily, getFamily, getFamilyMembers,
│           │   │                         # addFamilyMember, updateFamily,
│           │   │                         # updateFamilyMember, removeFamilyMember
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
│       ├── 000_initial_schema.sql        # families, users, tasks tables + RLS + triggers
│       ├── 001_add_calendar_events.sql   # calendar_events table + RLS policies
│       ├── 002_add_location_to_calendar_events.sql  # adds location column
│       ├── 003_add_shopping_lists.sql    # lists + list_items tables + RLS policies
│       └── 004_update_user_roles.sql     # Updates role values to admin/member/dependent/observer
│
├── package.json                          # Workspace root
├── turbo.json                            # Turborepo task config
└── tsconfig.json                         # Root TypeScript config
```

---

## Application Flows

### 1. Signup & Onboarding

```
Landing page (/)
  └─ User clicks "Sign Up"
      │
      ▼
Signup page (/auth/signup)
  └─ User enters name, email, password
  └─ Calls signUp() from @kinnect/core
      │  → Supabase Auth creates auth account
      │  → Creates user record in users table
      │
      ▼
Onboarding page (/onboarding)
  └─ User enters family name
  └─ Calls createFamily() from @kinnect/core
      │  → Creates family record in families table
      │  → Links user to family (sets family_id)
      │  → Sets user role to "admin"
      │
      ▼
Dashboard (/dashboard)
```

### 2. Authentication & Route Protection

```
Any /dashboard/* page loads
  └─ Dashboard layout (layout.tsx) runs on mount
      │
      ▼
UserProvider fetches getCurrentUser() once
  │  → Checks Supabase auth session
  │  → Looks up user record by auth_user_id
  │  → Shares user via useUser() hook
  │
  ├─ No session → Redirect to /auth/login
  ├─ No family_id → Redirect to /onboarding
  └─ Has family → Render page content
```

### 3. Dashboard

```
Dashboard page loads (/dashboard)
  └─ Gets user from useUser() hook (no duplicate fetch)
  └─ Uses user.family_id
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

### 4. Task Management

```
Tasks page loads (/dashboard/tasks)
  └─ Fetches getTasks(familyId)
      │
      ▼
Renders task list with filter tabs: All | Pending | Completed
  │
  ├─ "Create Task" button
  │   └─ Opens CreateTaskModal
  │       ├─ Title (required), Description, Due Date, Points
  │       ├─ Assign To: checkboxes for each family member
  │       └─ Submit → createTask() from @kinnect/core
  │
  └─ Task card actions (optimistic UI):
      ├─ Checkbox → completeTask(taskId, userId)
      │   ├─ Instantly marks as completed in UI
      │   ├─ Fires API in background
      │   └─ Reverts on failure
      └─ Undo → uncompleteTask(taskId)
          └─ Same optimistic pattern
```

### 5. Calendar

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
  │   ├─ Shows all events for that day
  │   ├─ Each event: title, time, location (pin icon), description
  │   ├─ Edit (pencil) → opens CreateEventModal with event data
  │   └─ Delete (trash) → confirm + deleteCalendarEvent()
  ├─ Navigation: ◀ Month Year ▶ + "Today" button
  └─ "+" on day cell → opens CreateEventModal with that date pre-filled

AGENDA VIEW:
  ├─ Events grouped by date (sticky date headers)
  ├─ Event cards: title, time range, location, description
  ├─ Edit + Delete buttons on each card
  └─ Empty state: "No events this month"

CREATE/EDIT EVENT (CreateEventModal):
  ├─ Title (required), Description, Location
  ├─ All-day toggle (hides time fields when checked)
  ├─ Start Date + Time, End Date + Time
  ├─ Create mode: calls createCalendarEvent()
  └─ Edit mode (event prop): pre-fills fields, calls updateCalendarEvent()
```

### 6. Shopping List

```
Shopping list page loads (/dashboard/shopping-list)
  └─ Parallel fetch:
      ├─ getFamilyMembers(familyId)
      └─ getFullShoppingList(familyId)
          │  → Returns incompleteItems + completedItems (max 20)
          │
          ▼
INCOMPLETE ITEMS:
  ├─ Add form: text input + "Add" button
  │   └─ addShoppingListItem() → reloads list
  ├─ Each item: checkbox, title, added by, time ago
  ├─ Hover actions: edit (pencil), delete (trash)
  ├─ Checkbox toggle (optimistic):
  │   └─ Moves item to completed list instantly, API in background
  └─ Delete (optimistic):
      └─ Removes from list instantly, API in background

COMPLETED ITEMS (collapsible):
  ├─ Toggle "Completed (N)" to expand
  ├─ Checkbox to un-complete (moves back to incomplete)
  ├─ Edit + Delete actions
  └─ "Clear All" → clearCompletedItems()
```

### 7. Family Management

```
Family page loads (/dashboard/family)
  └─ Fetches getFamily() + getFamilyMembers() in parallel
      │
      ▼
HEADER:
  ├─ Family name (click pencil to edit inline)
  │   └─ Save → updateFamily(familyId, { name })
  ├─ Member count subtitle
  └─ "Add Member" button

MEMBER CARDS (one per member):
  ├─ Avatar: first letter of name (colored circle by role)
  ├─ Name + "(You)" badge for current user
  ├─ Role badge: Admin (blue) | Member (purple) |
  │               Dependent (green) | Observer (amber)
  ├─ Phone number (if set)
  ├─ Points + Joined date
  │
  ├─ "Invite" button (shown when member has no auth account)
  │   └─ Opens edit modal with email field visible
  │
  ├─ Edit (pencil) → opens AddMemberModal in edit mode
  └─ Delete (trash) → confirm dialog → removeFamilyMember()
```

### 8. Profile

```
Profile page loads (/dashboard/profile)
  └─ Gets user from useUser() hook
      │
      ▼
Renders:
  ├─ User name + role + family info
  ├─ Password change form
  │   ├─ New Password + Confirm Password
  │   └─ Submit → Supabase auth.updateUser()
  └─ Sign out button
```

### 9. Email Invite Flow (Detailed)

```
User clicks "Invite" or provides email when adding/editing a member
  │
  ▼
Client calls POST /api/invite
  Body: { email, userId, familyId }
  │
  ▼
API route (apps/web/app/api/invite/route.ts):
  ├─ Creates Supabase admin client using SUPABASE_SERVICE_ROLE_KEY
  ├─ Calls supabase.auth.admin.inviteUserByEmail(email, {
  │     data: { user_id, family_id }
  │   })
  ├─ Supabase creates an auth account and sends invite email
  ├─ Links auth_user_id on the existing user record
  └─ Returns { success: true }
  │
  ▼
Invited person receives email
  └─ Clicks invite link
  └─ Sets their password
  └─ Can now log in → their account is linked to the family
```

---

## Component Reference

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing page with signup/login links |
| Login | `/auth/login` | Email + password login form |
| Signup | `/auth/signup` | Name + email + password registration |
| Onboarding | `/onboarding` | Family name creation (post-signup) |
| Dashboard | `/dashboard` | Widget-based overview with stats |
| Tasks | `/dashboard/tasks` | Full task list with All/Pending/Completed filters |
| Calendar | `/dashboard/calendar` | Month grid + agenda views, event CRUD |
| Shopping List | `/dashboard/shopping-list` | Full shopping list with add/edit/delete/complete |
| Family | `/dashboard/family` | Member management, inline family name editing |
| Profile | `/dashboard/profile` | User info + password change |

### Dashboard Widgets

| Widget | File | Props | Description |
|--------|------|-------|-------------|
| `DashboardStats` | `components/dashboard/DashboardStats.tsx` | `doneToday`, `dailyTasks`, `upcomingEvents` | Three stat cards in the top banner |
| `TodaysTasksWidget` | `components/dashboard/TodaysTasksWidget.tsx` | `tasks`, `members`, `userId`, `familyId`, `onTaskCompleted`, `onCreateTask` | Shows up to 3 incomplete tasks for today + quick-add form. Tasks link to `/dashboard/tasks` |
| `ShoppingListWidget` | `components/dashboard/ShoppingListWidget.tsx` | `items`, `totalCount`, `familyId`, `userId`, `members`, `onItemAdded`, `onItemToggled` | Shows up to 4 shopping items + quick-add form. Items link to `/dashboard/shopping-list` |
| `UpcomingEventsWidget` | `components/dashboard/UpcomingEventsWidget.tsx` | `events` | This week's events. Click an event to open inline detail modal with date, time, location, description |
| `FamilyActivityWidget` | `components/dashboard/FamilyActivityWidget.tsx` | `members`, `tasks`, `currentUserId`, `onAddMember` | Members ranked by weekly task completions. Members link to `/dashboard/profile` |

### Modals

| Modal | File | Props | Description |
|-------|------|-------|-------------|
| `CreateTaskModal` | `components/CreateTaskModal.tsx` | `isOpen`, `onClose`, `familyId`, `userId`, `members?`, `onTaskCreated` | Create task with title, description, due date, assignees. Accepts optional `members` prop to avoid duplicate fetch |
| `CreateEventModal` | `components/CreateEventModal.tsx` | `isOpen`, `onClose`, `familyId`, `userId`, `event?`, `defaultDate?`, `onEventCreated` | Create/edit calendar event. All-day toggle, location, start/end times |
| `AddMemberModal` | `components/AddMemberModal.tsx` | `isOpen`, `onClose`, `familyId`, `member?`, `onMemberAdded` | Add/edit family member. Optional email field triggers invite flow |

### Providers

| Provider | File | Hook | Description |
|----------|------|------|-------------|
| `SupabaseProvider` | `components/providers/supabase-provider.tsx` | — | Initializes Supabase client singleton on app start |
| `UserProvider` | `components/providers/user-provider.tsx` | `useUser()` | Fetches `getCurrentUser()` once on mount, provides `{ user, loading, refreshUser }` to all dashboard pages. Eliminates duplicate auth calls |

### Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `Logo` | `components/Logo.tsx` | Kinnect logo with three variants (`full`, `icon`, `stacked`), three color schemes (`primary`, `white`, `dark`), four sizes (`sm`, `md`, `lg`, `xl`) |

### Core Functions (`@kinnect/core`)

**Auth** (`supabase/auth.ts`)
| Function | Description |
|----------|-------------|
| `signUp(name, email, password)` | Creates auth account + user record |
| `signIn(email, password)` | Signs in via Supabase Auth |
| `signOut()` | Signs out current session |
| `getCurrentUser()` | Gets current user record from auth session |
| `getSession()` | Returns raw Supabase auth session |

**Families** (`supabase/families.ts`)
| Function | Description |
|----------|-------------|
| `createFamily(name, userId)` | Creates family + links user as admin |
| `getFamily(familyId)` | Returns family record |
| `getFamilyMembers(familyId)` | Returns all members of a family |
| `addFamilyMember(familyId, data)` | Adds a member to the family |
| `updateFamily(familyId, data)` | Updates family name |
| `updateFamilyMember(memberId, data)` | Updates member name, role, phone |
| `removeFamilyMember(memberId)` | Deletes a member |

**Tasks** (`supabase/tasks.ts`)
| Function | Description |
|----------|-------------|
| `getTasks(familyId)` | Returns all tasks for a family (newest first) |
| `createTask(input)` | Creates task with title, assignees, due date, points |
| `completeTask(taskId, userId)` | Marks task completed by user |
| `uncompleteTask(taskId)` | Reverts task to incomplete |
| `assignTask(taskId, userIds)` | Updates task assignees |
| `deleteTask(taskId)` | Deletes a task |

**Calendar** (`supabase/calendar.ts`)
| Function | Description |
|----------|-------------|
| `getCalendarEvents(familyId, start, end)` | Returns events in date range |
| `createCalendarEvent(data)` | Creates a new event |
| `updateCalendarEvent(eventId, data)` | Updates an existing event |
| `deleteCalendarEvent(eventId)` | Deletes an event |

**Shopping List** (`supabase/shopping-list.ts`)
| Function | Description |
|----------|-------------|
| `getShoppingList(familyId)` | Returns incomplete items |
| `getShoppingListPreview(familyId, limit)` | Returns top N items + total count (for dashboard widget) |
| `getFullShoppingList(familyId)` | Returns incomplete + completed items (for full page) |
| `addShoppingListItem(familyId, userId, data)` | Adds item to the list |
| `toggleShoppingListItem(itemId, completed, userId)` | Toggles item completed/incomplete |
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
| family_id | uuid | FK → families |
| auth_user_id | uuid | FK → auth.users (null if no account) |
| name | text | Display name |
| role | text | admin, member, dependent, observer |
| phone | text | Nullable |
| avatar_url | text | Nullable, for future use |
| points | integer | Reward points from completing tasks |
| language_preference | text | Nullable, for future i18n |
| push_token | text | Nullable, for future push notifications |
| created_at | timestamp | |

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
| completed_by | uuid | FK → users |
| completed_at | timestamp | |
| due_date | timestamp | Nullable |
| created_by | uuid | FK → users |
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
| created_by | uuid | FK → users |
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
| completed_by | uuid | FK → users, nullable |
| completed_at | timestamptz | Nullable |
| added_by | uuid | FK → users |
| position | integer | Sort order |
| created_at | timestamptz | |
| updated_at | timestamptz | |

All tables have Row Level Security (RLS) policies — users can only access data belonging to their family.

---

## Key Patterns

### Data Fetching
Every dashboard page follows the same pattern:
1. `useUser()` hook provides the current user (fetched once by UserProvider)
2. Guard: no user → redirect to login; no family → redirect to onboarding
3. `useEffect` with `[user?.family_id]` dependency (primitive, not object reference)
4. Fetch page-specific data using `user.family_id`
5. Render with loading/empty states

### Optimistic Updates
Mutations that have predictable outcomes use optimistic UI:
1. Update local state immediately (instant feedback)
2. Fire API call in background
3. On failure: revert local state or refetch from server

Used in: task complete/uncomplete, shopping item toggle/delete, dashboard item completion.

### Modals
All modals follow a consistent pattern:
- Props: `isOpen`, `onClose`, `familyId`, `userId`, callback (e.g. `onEventCreated`)
- Optional entity prop for edit mode (e.g. `event?: CalendarEvent`)
- `useEffect` populates form when `isOpen` changes
- Same overlay, card, close button, form layout, cancel/submit buttons
- Loading state on submit button

### Performance
- **Parallel fetching**: `Promise.all` for independent data on page load
- **Memoized lookups**: `useMemo` for member maps (O(1) vs O(n) array search)
- **Link prefetching**: `<Link>` components for navigation (auto-prefetch vs `router.push`)
- **Shared user context**: `UserProvider` fetches once, all pages use `useUser()`
- **Optimistic updates**: Instant perceived performance for mutations

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
| `SUPABASE_SERVICE_ROLE_KEY` | None | Server only | Admin key for invites (bypasses RLS) |

The service role key is **never** exposed to the client. It's only used in the `/api/invite` route handler.

---

## Commands

```bash
npm run dev          # Start development server (all apps via Turborepo)
npm run build        # Production build
npm run lint         # ESLint across all packages
npm run type-check   # TypeScript strict mode check
```
