# Kinnect Architecture Overview

## 🏗️ Monorepo Structure

```
kinnect/
│
├── 📦 apps/
│   └── 🌐 web/                          # Next.js 14 Web Application
│       ├── app/                         # App Router (Pages)
│       │   ├── page.tsx                 # Landing page
│       │   ├── layout.tsx               # Root layout
│       │   ├── globals.css              # Global styles
│       │   │
│       │   ├── auth/                    # Authentication pages
│       │   │   ├── login/page.tsx       # ✅ Login form
│       │   │   └── signup/page.tsx      # ✅ Signup form
│       │   │
│       │   └── dashboard/               # Protected dashboard
│       │       ├── layout.tsx           # ✅ Dashboard nav & auth check
│       │       ├── page.tsx             # ✅ Main dashboard
│       │       ├── tasks/page.tsx       # 📝 Tasks page (TODO)
│       │       ├── calendar/page.tsx    # 📝 Calendar page (TODO)
│       │       └── family/page.tsx      # 📝 Family management (TODO)
│       │
│       ├── components/                  # React components
│       │   └── providers/
│       │       └── supabase-provider.tsx # ✅ Supabase initialization
│       │
│       ├── .env.local                   # ✅ Environment variables (configured)
│       ├── next.config.js               # ✅ Next.js configuration
│       ├── tailwind.config.js           # ✅ Tailwind CSS setup
│       └── package.json                 # Web app dependencies
│
├── 📦 packages/
│   └── 🔧 core/                         # Shared Business Logic
│       └── src/
│           ├── supabase/                # Database layer
│           │   ├── client.ts            # ✅ Supabase client init
│           │   ├── auth.ts              # ✅ Auth functions (signup, login, etc.)
│           │   ├── families.ts          # ✅ Family queries
│           │   ├── tasks.ts             # ✅ Task queries
│           │   └── calendar.ts          # ✅ Calendar queries
│           │
│           ├── types/                   # TypeScript types
│           │   └── database.ts          # ✅ Database schema types
│           │
│           └── index.ts                 # ✅ Public API exports
│
├── 📁 supabase/
│   └── migrations/
│       └── 001_add_calendar_events.sql  # ⚠️ RUN THIS in Supabase SQL Editor
│
├── 📄 package.json                      # ✅ Workspace root config
├── 📄 turbo.json                        # ✅ Turborepo config
├── 📄 tsconfig.json                     # ✅ TypeScript config
├── 📄 .gitignore                        # ✅ Git ignore rules
├── 📄 README.md                         # Full documentation
└── 📄 QUICKSTART.md                     # Quick start guide
```

## 🔄 How It Works

### 1. Authentication Flow

```
User fills login form (web/app/auth/login/page.tsx)
    ↓
Calls signIn() from @kinnect/core
    ↓
packages/core/src/supabase/auth.ts → Supabase Auth
    ↓
Returns session → Redirect to /dashboard
    ↓
Dashboard layout checks auth (web/app/dashboard/layout.tsx)
    ↓
If not authenticated → Redirect to /auth/login
```

### 2. Data Loading Flow

```
Dashboard page loads (web/app/dashboard/page.tsx)
    ↓
Calls getCurrentUser() from @kinnect/core
    ↓
Gets user's family_id
    ↓
Calls getFamily(), getFamilyMembers(), getTasks()
    ↓
packages/core/src/supabase/*.ts query Supabase
    ↓
Display data in dashboard UI
```

### 3. Code Sharing Strategy

**What's in @kinnect/core (shared with future mobile app):**
- ✅ All Supabase queries
- ✅ TypeScript types
- ✅ Auth logic
- ✅ Business rules (e.g., points calculation)

**What's in apps/web (web-specific):**
- ✅ Next.js pages and routing
- ✅ React components
- ✅ Tailwind CSS styles
- ✅ Web-specific UI logic

**Later for apps/mobile (mobile-specific):**
- 📱 React Native screens
- 📱 Native navigation
- 📱 Mobile UI components

**Result:** When you build the mobile app, ~60-70% of code is already done! Just import from @kinnect/core.

## 🗄️ Database Schema (Supabase)

### Existing Tables (✅ Already in your database)

1. **families**
   - id (uuid)
   - name (text)
   - created_at (timestamp)

2. **users**
   - id (uuid)
   - family_id (uuid) → families
   - auth_user_id (uuid) → auth.users
   - name (text)
   - role (parent | grandparent | child | domestic_worker)
   - phone (text)
   - avatar_url (text)
   - points (integer) ← Reward system
   - created_at (timestamp)

3. **tasks**
   - id (uuid)
   - family_id (uuid) → families
   - title (text)
   - description (text)
   - assigned_to (uuid) → users
   - completed (boolean)
   - points (integer) ← Reward value
   - due_date (timestamp)
   - created_at (timestamp)

### New Table (⚠️ Need to create via migration)

4. **calendar_events** ← RUN MIGRATION FILE
   - id (uuid)
   - family_id (uuid) → families
   - title (text)
   - description (text)
   - start_time (timestamp)
   - end_time (timestamp)
   - all_day (boolean)
   - created_by (uuid) → users
   - created_at (timestamp)

## 🚀 Development Workflow

### Starting the App

```bash
cd ~/Documents/apps/kinnect
npm install        # Install all dependencies
npm run dev        # Start Next.js dev server
```

Open http://localhost:3000

### Making Changes

**To add a new page:**
1. Create file in `apps/web/app/your-page/page.tsx`
2. Add navigation link in `apps/web/app/dashboard/layout.tsx`

**To add a database query:**
1. Add function in `packages/core/src/supabase/*.ts`
2. Export it from `packages/core/src/index.ts`
3. Import in your page: `import { yourFunction } from '@kinnect/core'`

**To add a type:**
1. Define in `packages/core/src/types/database.ts`
2. Export from `packages/core/src/index.ts`
3. Import: `import type { YourType } from '@kinnect/core'`

### Building Features

**Example: Building Task Creation Page**

1. Create UI page: `apps/web/app/dashboard/tasks/page.tsx`
2. Use existing query: `import { createTask } from '@kinnect/core'`
3. Build form that calls `createTask(familyId, title, ...)`
4. Done! The query logic is already in @kinnect/core

## 📊 Current Status

### ✅ Completed (Working Now)

- [x] Monorepo structure
- [x] Next.js 14 setup
- [x] Supabase connection
- [x] TypeScript configuration
- [x] Tailwind CSS styling
- [x] Authentication (signup/login/logout)
- [x] Protected routes
- [x] Dashboard layout with navigation
- [x] Database queries (families, users, tasks, calendar)
- [x] Points/rewards logic

### 📝 TODO (Next Steps)

- [ ] Onboarding flow (create family after signup)
- [ ] Task creation UI
- [ ] Task completion with points
- [ ] Calendar event creation
- [ ] Calendar view component
- [ ] Family member management UI
- [ ] Mobile responsive polish

## 🎯 Your 6-Week Web MVP Timeline

**Weeks 1-2: Foundation** ✅ DONE
- Monorepo setup
- Authentication
- Basic structure

**Weeks 3-4: Core Features** ← YOU ARE HERE
- Task creation & completion
- Family member management
- Dashboard with real data

**Weeks 5-6: Polish & Launch**
- Calendar view
- Mobile responsiveness
- Beta testing with your family
- Bug fixes

## 🔑 Key Commands

```bash
# Development
npm run dev          # Start all apps in dev mode
npm run build        # Build for production
npm run lint         # Lint code
npm run type-check   # Check TypeScript

# Package-specific
cd apps/web && npm run dev       # Run just the web app
cd packages/core && npm run dev  # Build core in watch mode
```

## 📝 Environment Variables

Located in `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://mvmjvfwyvvvjqwctmhsz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

✅ Already configured with your credentials!

## 🔗 Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/mvmjvfwyvvvjqwctmhsz
- **Local Dev Server:** http://localhost:3000 (after `npm run dev`)
- **Vercel (for deployment):** Connect your GitHub repo

---

**Everything is ready! Just run `npm install` and `npm run dev` to start building!** 🚀
