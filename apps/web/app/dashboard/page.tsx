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
    type Task,
    type User,
} from '@kinnect/core'
import {useUser} from '@/components/providers/user-provider'
import {Logo} from '@/components/Logo'
import DashboardStats from '@/components/dashboard/DashboardStats'
import TodaysTasksWidget from '@/components/dashboard/TodaysTasksWidget'
import ShoppingListWidget from '@/components/dashboard/ShoppingListWidget'
import UpcomingEventsWidget from '@/components/dashboard/UpcomingEventsWidget'
import FamilyActivityWidget from '@/components/dashboard/FamilyActivityWidget'
import TodaysResponsibilitiesWidget from '@/components/dashboard/TodaysResponsibilitiesWidget'
import {ErrorBoundary} from '@/components/ErrorBoundary'
import {useRealtimeSync} from '@/hooks/useRealtimeSync'
import {LogOut} from 'lucide-react'
import logger from '@/lib/logger'
import toast from 'react-hot-toast'
import { getTodayStr } from '@/lib/formatters'

// Lazy-load modals (only needed on user interaction)
const CreateTaskModal = dynamic(() => import('@/components/CreateTaskModal'), { ssr: false })
const CreateEventModal = dynamic(() => import('@/components/CreateEventModal'), { ssr: false })
const AddMemberModal = dynamic(() => import('@/components/AddMemberModal'), { ssr: false })
const CreateRoutineModal = dynamic(() => import('@/components/CreateRoutineModal'), { ssr: false })

// ── helpers ──────────────────────────────────────────────

function isRelevantTask(dueDateStr: string | null | undefined) {
  if (!dueDateStr) return true // No due date = always relevantnicenic
  const dateOnly = dueDateStr.split('T')[0]
  return dateOnly <= getTodayStr() // Today or overdue
}


function getUpcomingRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setDate(end.getDate() + 14); end.setHours(23, 59, 59, 999)
  return { weekStart: start, weekEnd: end }
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

  // Track in-flight task mutations so realtime refetches don't overwrite optimistic state
  const inflightTasksRef = useRef<Map<string, Partial<Task>>>(new Map())

  // Explicit counter so optimistic increments survive reloads that race the DB write
  const [completedTodayCount, setCompletedTodayCount] = useState(0)

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    loadData(user.family_id)
  }, [user?.family_id])

  // Count tasks completed on the local calendar date — timezone-safe
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
          getCalendarEvents(
            familyId,
            weekStart.toISOString(),
            weekEnd.toISOString()
          ),
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

  // Optimistic: mark task completed locally (no immediate refetch — the
  // widget awaits the API call and then triggers onTaskCreated to sync)
  function handleTaskCompletedOptimistic(taskId?: string) {
    if (taskId) {
      const optimistic: Partial<Task> = { completed: true, completed_by: user!.id, completed_at: new Date().toISOString() }
      inflightTasksRef.current.set(taskId, optimistic)
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, ...optimistic } : t)
      )
      setCompletedTodayCount((prev) => prev + 1)
      broadcast('tasks')
      // Clear in-flight after a short delay to allow realtime events to settle
      setTimeout(() => inflightTasksRef.current.delete(taskId), 3000)
    }
  }

  // Optimistic: remove completed shopping item from preview, then sync
  function handleShoppingToggleOptimistic(itemId: string) {
    setShoppingItems((prev) => prev.filter((i) => i.id !== itemId))
    setShoppingTotalCount((prev) => Math.max(0, prev - 1))
    broadcast('list_items')
    // Background sync
    if (user?.family_id) {
      getShoppingListPreview(user.family_id, 4).then((data) => {
        setShoppingItems(data.items)
        setShoppingTotalCount(data.totalCount)
      }).catch((err) => { logger.error('Error syncing shopping list', err); toast.error('Failed to sync shopping list') })
    }
  }

  const reloadTasks = useCallback(async () => {
    if (user?.family_id) {
      const tasksData = await getTodaysTasks(user.family_id)
      // Preserve optimistic state for any tasks still in-flight
      const inflight = inflightTasksRef.current
      const merged = inflight.size > 0
        ? tasksData.map((t) => inflight.has(t.id) ? { ...t, ...inflight.get(t.id) } : t)
        : tasksData
      setTasks(merged)
      // Sync counter — take max so an optimistic increment never regresses if the
      // DB reload races ahead of the completeTask write finishing
      setCompletedTodayCount((prev) => Math.max(prev, countCompletedToday(merged)))
    }
  }, [user?.family_id])

  const reloadMembers = useCallback(async () => {
    if (user?.family_id) {
      const membersData = await getFamilyMembers(user.family_id)
      setMembers(membersData)
    }
  }, [user?.family_id])

  const reloadShopping = useCallback(async () => {
    if (user?.family_id) {
      const shoppingData = await getShoppingListPreview(user.family_id, 4)
      setShoppingItems(shoppingData.items)
      setShoppingTotalCount(shoppingData.totalCount)
    }
  }, [user?.family_id])

  const reloadEvents = useCallback(async () => {
    if (user?.family_id) {
      const { weekStart, weekEnd } = getUpcomingRange()
      const eventsData = await getCalendarEvents(user.family_id, weekStart.toISOString(), weekEnd.toISOString())
      setEvents(eventsData)
    }
  }, [user?.family_id])

  const reloadResponsibilities = useCallback(async () => {
    if (user?.family_id) {
      const data = await getTodaysResponsibilities(user.family_id)
      setResponsibilities(data)
    }
  }, [user?.family_id])

  // ── Realtime sync (Broadcast) ─────────────────────────
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

  if (loading) {
    return <DashboardLoading />
  }

  if (!user?.family_id) {
    return null
  }

  // ── derived data ─────────────────────────────────────

  const relevantTasks = tasks.filter((t) => isRelevantTask(t.due_date))
  const todaysTasks = relevantTasks.filter((t) => !t.completed)

  // ── render ─────────────────────────────────────────────

  return (
    <div className="flex-1">
      {/* ── Top Banner ────────────────────────────────── */}
      <div
        className="text-white p-6 md:p-8 rounded-b-[2.5rem] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #3730a3 100%)',
          boxShadow: '0 8px 32px -4px rgb(49 46 129 / 0.35), 0 2px 8px -2px rgb(49 46 129 / 0.2)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <Logo variant="icon" color="white" size="sm" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {family?.name}
                </h1>
                <p className="text-indigo-300 text-sm font-medium">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="md:hidden p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors border border-white/10"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <DashboardStats
            doneToday={completedTodayCount}
            dailyTasks={todaysTasks.length}
          />
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="max-w-4xl mx-auto -mt-4 space-y-5 pb-6">
        {/* Widget Grid: Tasks + Shopping List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <ShoppingListWidget
              items={shoppingItems}
              totalCount={shoppingTotalCount}
              familyId={user.family_id}
              userId={user.id}
              members={members}
              onItemAdded={() => { reloadShopping(); broadcast('list_items') }}
              onItemToggled={handleShoppingToggleOptimistic}
            />
          </ErrorBoundary>
        </div>

        {/* Full Width Widgets */}
        <ErrorBoundary>
          <TodaysResponsibilitiesWidget
            responsibilities={responsibilities}
            members={members}
            userId={user.id}
            onChanged={() => { reloadResponsibilities(); broadcast('responsibility_occurrences') }}
            onCreateRoutine={() => setShowCreateRoutine(true)}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <UpcomingEventsWidget events={events} onCreateEvent={() => setShowCreateEvent(true)} />
        </ErrorBoundary>
        <ErrorBoundary>
          <FamilyActivityWidget
            members={members}
            tasks={tasks}
            currentUserId={user.id}
            onAddMember={() => setShowAddMember(true)}
          />
        </ErrorBoundary>
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
