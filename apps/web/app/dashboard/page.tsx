'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import dynamic from 'next/dynamic'
import DashboardLoading from './loading'
import {
    type CalendarEvent,
    type Family,
    getCalendarEvents,
    getFamily,
    getFamilyMembers,
    getShoppingListPreview,
    getTodaysTasks,
    getTodaysResponsibilities,
    type ListItem,
    type ResponsibilityOccurrenceWithFlow,
    signOut,
    getTodayStr,
    formatEventTime,
    type Task,
    type User,
    ROLE_HEX_COLORS,
} from '@kinnect/core'
import {useUser} from '@/components/providers/user-provider'
import TodaysTasksWidget from '@/components/dashboard/TodaysTasksWidget'
import ShoppingListWidget from '@/components/dashboard/ShoppingListWidget'
import FamilyActivityWidget from '@/components/dashboard/FamilyActivityWidget'
import TodaysResponsibilitiesWidget from '@/components/dashboard/TodaysResponsibilitiesWidget'
import WeekCalendarStrip from '@/components/dashboard/WeekCalendarStrip'
import DailySnapshotWidget from '@/components/dashboard/DailySnapshotWidget'
import {ErrorBoundary} from '@/components/ErrorBoundary'
import {useRealtimeSync} from '@/hooks/useRealtimeSync'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import logger from '@/lib/logger'
import toast from 'react-hot-toast'
import { mergeInflight } from '@/lib/optimistic'

// Lazy-load modals (only needed on user interaction)
const CreateTaskModal = dynamic(() => import('@/components/CreateTaskModal'), { ssr: false })
const CreateEventModal = dynamic(() => import('@/components/CreateEventModal'), { ssr: false })
const AddMemberModal = dynamic(() => import('@/components/AddMemberModal'), { ssr: false })
const CreateRoutineModal = dynamic(() => import('@/components/CreateRoutineModal'), { ssr: false })

// ── helpers ──────────────────────────────────────────────

function isRelevantTask(dueDateStr: string | null | undefined) {
  if (!dueDateStr) return true
  const dateOnly = dueDateStr.split('T')[0]
  return dateOnly <= getTodayStr()
}

function getUpcomingRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setDate(end.getDate() + 14); end.setHours(23, 59, 59, 999)
  return { weekStart: start, weekEnd: end }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getHeaderDate() {
  return new Date().toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })
}

function MemberAvatar({ member, size = 36 }: { member: User; size?: number }) {
  const initials = member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: ROLE_HEX_COLORS[member.role || ''] ?? '#6B7280',
        border: '2px solid white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 800, color: 'white', flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

// ── component ────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [shoppingItems, setShoppingItems] = useState<ListItem[]>([])
  const [shoppingTotalCount, setShoppingTotalCount] = useState(0)
  const [responsibilities, setResponsibilities] = useState<ResponsibilityOccurrenceWithFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateRoutine, setShowCreateRoutine] = useState(false)

  const inflightTasksRef = useRef<Map<string, Partial<Task>>>(new Map())
  const [completedTodayCount, setCompletedTodayCount] = useState(0)

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    loadData(user.family_id)
  }, [user?.family_id])

  function countCompletedToday(taskList: Task[]): number {
    const now = new Date()
    return taskList.filter((t) => {
      if (!t.completed || !t.completed_at) return false
      const d = new Date(t.completed_at)
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth()    === now.getMonth()    &&
        d.getDate()     === now.getDate()
      )
    }).length
  }

  async function loadData(familyId: string) {
    try {
      const { weekStart, weekEnd } = getUpcomingRange()

      const [familyData, membersData, tasksData, eventsData, shoppingData, responsibilitiesData] =
        await Promise.all([
          getFamily(familyId),
          getFamilyMembers(familyId),
          getTodaysTasks(familyId),
          getCalendarEvents(familyId, weekStart.toISOString(), weekEnd.toISOString()),
          getShoppingListPreview(familyId, 4),
          getTodaysResponsibilities(familyId),
        ])

      setFamily(familyData)
      setMembers(membersData)
      setTasks(tasksData)
      setCompletedTodayCount(countCompletedToday(tasksData))
      setEvents(eventsData)
      setShoppingItems(shoppingData.items)
      setShoppingTotalCount(shoppingData.totalCount)
      setResponsibilities(responsibilitiesData)
    } catch (error) {
      logger.error('Error loading dashboard', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleTaskCompletedOptimistic(taskId?: string) {
    if (taskId) {
      const optimistic: Partial<Task> = { completed: true, completed_by: user!.id, completed_at: new Date().toISOString() }
      inflightTasksRef.current.set(taskId, optimistic)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...optimistic } : t))
      setCompletedTodayCount((prev) => prev + 1)
      broadcast('tasks')
      setTimeout(() => inflightTasksRef.current.delete(taskId), 3000)
    }
  }

  function handleShoppingToggleOptimistic(itemId: string) {
    setShoppingItems((prev) => prev.filter((i) => i.id !== itemId))
    setShoppingTotalCount((prev) => Math.max(0, prev - 1))
    broadcast('list_items')
  }

  const reloadTasks = useCallback(async () => {
    if (user?.family_id) {
      const tasksData = await getTodaysTasks(user.family_id)
      const merged = mergeInflight(tasksData, inflightTasksRef.current)
      setTasks(merged)
      setCompletedTodayCount((prev) => Math.max(prev, countCompletedToday(merged)))
    }
  }, [user?.family_id])

  const reloadMembers = useCallback(async () => {
    if (user?.family_id) setMembers(await getFamilyMembers(user.family_id))
  }, [user?.family_id])

  const reloadShopping = useCallback(async () => {
    if (user?.family_id) {
      const data = await getShoppingListPreview(user.family_id, 4)
      setShoppingItems(data.items)
      setShoppingTotalCount(data.totalCount)
    }
  }, [user?.family_id])

  const reloadEvents = useCallback(async () => {
    if (user?.family_id) {
      const { weekStart, weekEnd } = getUpcomingRange()
      setEvents(await getCalendarEvents(user.family_id, weekStart.toISOString(), weekEnd.toISOString()))
    }
  }, [user?.family_id])

  const reloadResponsibilities = useCallback(async () => {
    if (user?.family_id) setResponsibilities(await getTodaysResponsibilities(user.family_id))
  }, [user?.family_id])

  const broadcast = useRealtimeSync(user?.family_id, {
    tasks: reloadTasks,
    list_items: reloadShopping,
    calendar_events: reloadEvents,
    users: reloadMembers,
    responsibility_occurrences: reloadResponsibilities,
  })

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) return <DashboardLoading />
  if (!user?.family_id) return null

  // ── derived data ─────────────────────────────────────
  const relevantTasks = tasks.filter((t) => isRelevantTask(t.due_date))
  const todaysTasks   = relevantTasks.filter((t) => !t.completed)
  const completedRelevant = relevantTasks.filter((t) => t.completed).length

  const firstName = user.name?.split(' ')[0] ?? 'there'

  // Daily snapshot stats
  const todayDateStr = new Date().toDateString()
  const eventsToday = events.filter(ev => new Date(ev.start_time).toDateString() === todayDateStr).length
  const nextTodayEvent = events
    .filter(ev => new Date(ev.start_time).toDateString() === todayDateStr && !ev.all_day)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]
  const nextEventTime = nextTodayEvent ? formatEventTime(nextTodayEvent.start_time) : null
  const routinesDone = responsibilities.filter(r => r.status === 'completed').length
  const routinesTotal = responsibilities.length

  // ── render ─────────────────────────────────────────────
  return (
    <div className="flex-1">

      {/* ── Mobile top bar (only on dashboard — layout hides it here) ── */}
      <div className="md:hidden flex items-center justify-between mb-5">
        <Logo variant="full" color="primary" size="sm" />
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* ── Bento Header ───────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted-ink)' }}>
            {getHeaderDate()}
          </p>
          <h1 className="text-[22px] font-black tracking-tight" style={{ color: 'var(--brand-ink)' }}>
            {getGreeting()}, {firstName}
          </h1>
        </div>

        {/* Avatar stack */}
        <div className="flex items-center shrink-0">
          {members.slice(0, 3).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i, position: 'relative' }}>
              <MemberAvatar member={m} size={36} />
            </div>
          ))}
          {members.length > 3 && (
            <div
              style={{
                marginLeft: -10, width: 36, height: 36, borderRadius: '50%',
                background: 'var(--brand-ink)', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
              }}
            >
              +{members.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Snapshot — desktop only, above grid ── */}
      <div className="hidden md:block mb-2.5">
        <DailySnapshotWidget
          tasksLeft={todaysTasks.length}
          eventsToday={eventsToday}
          shoppingCount={shoppingTotalCount}
          routinesDone={routinesDone}
          routinesTotal={routinesTotal}
          nextEventTime={nextEventTime}
        />
      </div>

      {/* ── Bento Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 pb-6">

        {/* ── Mobile: stacked layout ── */}
        <div className="md:hidden flex flex-col gap-2">
          {/* Daily Snapshot stats */}
          <DailySnapshotWidget
            tasksLeft={todaysTasks.length}
            eventsToday={eventsToday}
            shoppingCount={shoppingTotalCount}
            routinesDone={routinesDone}
            routinesTotal={routinesTotal}
            nextEventTime={nextEventTime}
          />

          {/* Week calendar strip */}
          <ErrorBoundary>
            <WeekCalendarStrip events={events} onCreateEvent={() => setShowCreateEvent(true)} />
          </ErrorBoundary>

          {/* Tasks — full width */}
          <ErrorBoundary>
            <TodaysTasksWidget
              tasks={todaysTasks}
              members={members}
              userId={user.id}
              familyId={user.family_id}
              onTaskCompleted={handleTaskCompletedOptimistic}
              onTaskCreated={async () => { await reloadTasks(); broadcast('tasks') }}
              onCreateTask={() => setShowCreateTask(true)}
              onEditTask={(task) => { setEditingTask(task); setShowCreateTask(true) }}
              variant="bento"
              completedCount={completedRelevant}
              totalCount={relevantTasks.length}
            />
          </ErrorBoundary>

          {/* Shopping — full width, pill chips */}
          <ErrorBoundary>
            <ShoppingListWidget
              items={shoppingItems}
              totalCount={shoppingTotalCount}
              familyId={user.family_id}
              userId={user.id}
              members={members}
              onItemAdded={() => { reloadShopping(); broadcast('list_items') }}
              onItemToggled={handleShoppingToggleOptimistic}
              onItemToggleFailed={reloadShopping}
              variant="bento"
            />
          </ErrorBoundary>

          {/* Routines */}
          <ErrorBoundary>
            <TodaysResponsibilitiesWidget
              responsibilities={responsibilities}
              members={members}
              userId={user.id}
              onChanged={() => { reloadResponsibilities(); broadcast('responsibility_occurrences') }}
              onCreateRoutine={() => setShowCreateRoutine(true)}
            />
          </ErrorBoundary>
        </div>

        {/* ── Desktop: bento grid ── */}
        <div
          className="hidden md:grid gap-2.5"
          style={{ gridTemplateColumns: '2fr 1fr 1fr' }}
        >
          {/* Tasks — col 1, rows 1–2 */}
          <div style={{ gridColumn: '1', gridRow: '1 / 3' }}>
            <ErrorBoundary>
              <TodaysTasksWidget
                tasks={todaysTasks}
                members={members}
                userId={user.id}
                familyId={user.family_id}
                onTaskCompleted={handleTaskCompletedOptimistic}
                onTaskCreated={async () => { await reloadTasks(); broadcast('tasks') }}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={(task) => { setEditingTask(task); setShowCreateTask(true) }}
                variant="bento"
                completedCount={completedRelevant}
                totalCount={relevantTasks.length}
              />
            </ErrorBoundary>
          </div>

          {/* Week Calendar Strip — cols 2–3, row 1 */}
          <div style={{ gridColumn: '2 / 4', gridRow: '1' }}>
            <ErrorBoundary>
              <WeekCalendarStrip events={events} onCreateEvent={() => setShowCreateEvent(true)} />
            </ErrorBoundary>
          </div>

          {/* Shopping — col 2, row 2 */}
          <div style={{ gridColumn: '2', gridRow: '2' }}>
            <ErrorBoundary>
              <ShoppingListWidget
                items={shoppingItems}
                totalCount={shoppingTotalCount}
                familyId={user.family_id}
                userId={user.id}
                members={members}
                onItemAdded={() => { reloadShopping(); broadcast('list_items') }}
                onItemToggled={handleShoppingToggleOptimistic}
                onItemToggleFailed={reloadShopping}
                variant="bento"
              />
            </ErrorBoundary>
          </div>

          {/* Family — col 3, row 2 */}
          <div style={{ gridColumn: '3', gridRow: '2' }}>
            <ErrorBoundary>
              <FamilyActivityWidget
                members={members}
                tasks={tasks}
                currentUserId={user.id}
                onAddMember={() => setShowAddMember(true)}
                variant="bento"
              />
            </ErrorBoundary>
          </div>

          {/* Routines — full width, row 3 */}
          <div style={{ gridColumn: '1 / 4', gridRow: '3' }}>
            <ErrorBoundary>
              <TodaysResponsibilitiesWidget
                responsibilities={responsibilities}
                members={members}
                userId={user.id}
                onChanged={() => { reloadResponsibilities(); broadcast('responsibility_occurrences') }}
                onCreateRoutine={() => setShowCreateRoutine(true)}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => { setShowCreateTask(false); setEditingTask(null) }}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        onTaskCreated={async () => { await reloadTasks(); broadcast('tasks') }}
        task={editingTask}
      />
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        familyId={user.family_id}
        userId={user.id}
        onEventCreated={() => { reloadEvents(); broadcast('calendar_events') }}
      />
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        familyId={user.family_id}
        onMemberAdded={() => { reloadMembers(); broadcast('users') }}
      />
      <CreateRoutineModal
        isOpen={showCreateRoutine}
        onClose={() => setShowCreateRoutine(false)}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        onRoutineCreated={() => { reloadResponsibilities(); broadcast('responsibility_occurrences') }}
      />
    </div>
  )
}
