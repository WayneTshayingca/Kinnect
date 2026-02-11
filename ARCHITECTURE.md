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
│       │       ├── layout.tsx            # Nav bar, auth guard, sign out
│       │       ├── page.tsx              # Dashboard home (stats + recent tasks)
│       │       ├── tasks/page.tsx        # Task list with filters
│       │       ├── calendar/page.tsx     # Month grid + agenda views
│       │       └── family/page.tsx       # Family member management
│       │
│       ├── components/
│       │   ├── providers/
│       │   │   └── supabase-provider.tsx # Initializes Supabase client on app start
│       │   ├── CreateTaskModal.tsx       # Modal: create task with assignees + points
│       │   ├── CreateEventModal.tsx      # Modal: create/edit calendar event
│       │   └── AddMemberModal.tsx        # Modal: add/edit family member + invite
│       │
│       ├── .env.local                    # Environment variables
│       ├── next.config.js                # Next.js config
│       ├── tailwind.config.js            # Tailwind CSS (custom primary colors)
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
│           │   │                         # assignTask, deleteTask
│           │   └── calendar.ts           # getCalendarEvents, createCalendarEvent,
│           │                             # updateCalendarEvent, deleteCalendarEvent
│           ├── types/
│           │   └── database.ts           # Auto-generated DB types + helper aliases
│           └── index.ts                  # Public API (re-exports everything)
│
├── supabase/
│   └── migrations/
│       ├── 001_add_calendar_events.sql   # calendar_events table + RLS policies
│       └── 002_add_location_to_calendar_events.sql  # adds location column
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
      │  → Sets user role to "parent"
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
Calls getCurrentUser() from @kinnect/core
  │  → Checks Supabase auth session
  │  → Looks up user record by auth_user_id
  │
  ├─ No session → Redirect to /auth/login
  ├─ No family_id → Redirect to /onboarding
  └─ Has family → Render page content
```

### 3. Dashboard

```
Dashboard page loads (/dashboard)
  └─ Calls getCurrentUser()
  └─ Gets user.family_id
      │
      ▼
Parallel fetch:
  ├─ getFamily(familyId)        → family name
  ├─ getFamilyMembers(familyId) → member count
  └─ getTasks(familyId)         → pending/completed tasks
      │
      ▼
Renders:
  ├─ Stat cards: Family Members | Pending Tasks | Your Points
  ├─ Recent tasks list (first 5)
  ├─ "Create Task" button → opens CreateTaskModal
  └─ "Add Member" button → opens AddMemberModal
```

### 4. Task Management

```
Tasks page loads (/dashboard/tasks)
  └─ Fetches user + getTasks(familyId)
      │
      ▼
Renders task list with filter tabs: All | Pending | Completed
  │
  ├─ "Create Task" button
  │   └─ Opens CreateTaskModal
  │       ├─ Title (required), Description, Due Date, Points
  │       ├─ Assign To: checkboxes for each family member
  │       └─ Submit → createTask() from @kinnect/core
  │           └─ Inserts into tasks table, reloads list
  │
  └─ Task card actions:
      └─ Checkbox → completeTask(taskId, userId) from @kinnect/core
          ├─ Sets completed=true, completed_by, completed_at
          ├─ Awards points to completing user
          └─ Reloads task list + user (for updated points)
```

### 5. Calendar

```
Calendar page loads (/dashboard/calendar)
  └─ Fetches user + getCalendarEvents(familyId, monthStart, monthEnd)
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

### 6. Family Management

```
Family page loads (/dashboard/family)
  └─ Fetches user + getFamily() + getFamilyMembers() in parallel
      │
      ▼
HEADER:
  ├─ Family name (click pencil to edit inline)
  │   └─ Edit mode: text input + save/cancel
  │       └─ Save → updateFamily(familyId, { name })
  ├─ Member count subtitle
  └─ "Add Member" button

MEMBER CARDS (one per member):
  ├─ Avatar: first letter of name (blue circle)
  ├─ Name + "(You)" badge for current user
  ├─ Role badge: Parent (blue) | Grandparent (purple) |
  │               Child (green) | Helper (amber)
  ├─ Phone number (if set)
  ├─ Points
  ├─ Joined date
  │
  ├─ "Invite" button (amber, shown when member has no auth account)
  │   └─ Opens edit modal with email field visible
  │
  ├─ Edit (pencil) → opens AddMemberModal in edit mode
  │   ├─ Pre-fills name, role, phone
  │   ├─ Shows email field if member has no account
  │   ├─ Submit → updateFamilyMember() + sendInvite() if email provided
  │   └─ Invite flow:
  │       POST /api/invite { email, userId, familyId }
  │         └─ Server creates Supabase admin client (service role key)
  │         └─ Calls auth.admin.inviteUserByEmail(email)
  │         └─ Links auth_user_id to member record
  │         └─ Supabase sends invite email automatically
  │
  ├─ Delete (trash) → confirm dialog → removeFamilyMember()
  │   (hidden for current user — can't delete yourself)
  │
  └─ Add mode (AddMemberModal without member prop):
      ├─ Name, Role, Phone, Email (optional)
      ├─ Submit → addFamilyMember() + updateFamilyMember(phone)
      ├─ If email provided → POST /api/invite
      └─ Info note: "Creates profile without login credentials"
```

### 7. Email Invite Flow (Detailed)

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
| role | text | parent, grandparent, child, domestic_worker |
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

All tables have Row Level Security (RLS) policies — users can only access data belonging to their family.

---

## Key Patterns

### Data Fetching
Every dashboard page follows the same pattern:
1. `getCurrentUser()` on mount
2. Guard: no user → redirect to login; no family → redirect to onboarding
3. Fetch page-specific data using `user.family_id`
4. Render with loading/empty states

### Modals
All modals follow a consistent pattern:
- Props: `isOpen`, `onClose`, `familyId`, `userId`, callback (e.g. `onEventCreated`)
- Optional entity prop for edit mode (e.g. `event?: CalendarEvent`)
- `useEffect` populates form when `isOpen` changes
- Same overlay, card, close button, form layout, cancel/submit buttons
- Loading state on submit button

### Styling
- Tailwind utility classes throughout
- Custom primary colors: `primary-50/100/500/600/700` (sky blue)
- Consistent card style: `bg-white rounded-lg shadow p-4 hover:shadow-md`
- Form inputs: `border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500`
- Buttons: `bg-blue-600 text-white rounded-lg hover:bg-blue-700`
- Tab navigation: `border-b-2` active state pattern

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
