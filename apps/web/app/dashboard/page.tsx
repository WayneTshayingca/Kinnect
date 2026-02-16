'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import dynamic from 'next/dynamic'
import {
    type CalendarEvent,
    type Family,
    getCalendarEvents,
    getFamily,
    getFamilyMembers,
    getShoppingListPreview,
    getTodaysTasks,
    type ListItem,
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
import {ErrorBoundary} from '@/components/ErrorBoundary'
import {useRealtimeSync} from '@/hooks/useRealtimeSync'
import {LogOut} from 'lucide-react'
import logger from '@/lib/logger'

// Lazy-load modals (only needed on user interaction)
const CreateTaskModal = dynamic(() => import('@/components/CreateTaskModal'), { ssr: false })
const CreateEventModal = dynamic(() => import('@/components/CreateEventModal'), { ssr: false })
const AddMemberModal = dynamic(() => import('@/components/AddMemberModal'), { ssr: false })

// Lazy-load AnimatedLogo to defer the motion library (~340KB)
const AnimatedLogo = dynamic(() => import('@/components/AnimatedLogo').then(mod => ({ default: mod.AnimatedLogo })), { ssr: false })

// ── helpers ──────────────────────────────────────────────

function getLocalTodayStr() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function isRelevantTask(dueDateStr: string | null | undefined) {
  if (!dueDateStr) return true // No due date = always relevant
  const dateOnly = dueDateStr.split('T')[0]
  return dateOnly <= getLocalTodayStr() // Today or overdue
}


function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return { weekStart, weekEnd }
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
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  // Track in-flight task mutations so realtime refetches don't overwrite optimistic state
  const inflightTasksRef = useRef<Map<string, Partial<Task>>>(new Map())

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    loadData(user.family_id)
  }, [user?.family_id])

  async function loadData(familyId: string) {
    try {
      const { weekStart, weekEnd } = getWeekRange()

      const [familyData, membersData, tasksData, eventsData, shoppingData] =
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
        ])

      setFamily(familyData)
      setMembers(membersData)
      setTasks(tasksData)
      setEvents(eventsData)
      setShoppingItems(shoppingData.items)
      setShoppingTotalCount(shoppingData.totalCount)
    } catch (error) {
      logger.error('Error loading dashboard', error)
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
      }).catch((err) => logger.error('Error syncing shopping list', err))
    }
  }

  const reloadTasks = useCallback(async () => {
    if (user?.family_id) {
      const tasksData = await getTodaysTasks(user.family_id)
      // Preserve optimistic state for any tasks still in-flight
      const inflight = inflightTasksRef.current
      if (inflight.size > 0) {
        setTasks(tasksData.map((t) => inflight.has(t.id) ? { ...t, ...inflight.get(t.id) } : t))
      } else {
        setTasks(tasksData)
      }
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
      const { weekStart, weekEnd } = getWeekRange()
      const eventsData = await getCalendarEvents(user.family_id, weekStart.toISOString(), weekEnd.toISOString())
      setEvents(eventsData)
    }
  }, [user?.family_id])

  // ── Realtime sync (Broadcast) ─────────────────────────
  const broadcast = useRealtimeSync(user?.family_id, {
    tasks: reloadTasks,
    list_items: reloadShopping,
    calendar_events: reloadEvents,
    users: reloadMembers,
  })

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AnimatedLogo size="lg" color="primary" />
        <p className="text-sm text-gray-500 animate-pulse">Loading dashboard...</p>
      </div>
    )
  }

  if (!user?.family_id) {
    return null
  }

  // ── derived data ─────────────────────────────────────

  const relevantTasks = tasks.filter((t) => isRelevantTask(t.due_date))
  const todaysTasks = relevantTasks.filter((t) => !t.completed)
  const completedToday = relevantTasks.filter((t) => t.completed).length

  // ── render ─────────────────────────────────────────────

  return (
    <div className="flex-1">
      {/* ── Top Banner ────────────────────────────────── */}
      <div className="bg-brand-primary text-white p-6 md:p-8 rounded-b-[2rem] shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <Logo variant="icon" color="white" size="sm" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {family?.name}
                </h1>
                <p className="text-indigo-200 text-sm font-medium">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="md:hidden p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors backdrop-blur-sm border border-white/10"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <DashboardStats
            doneToday={completedToday}
            dailyTasks={todaysTasks.length}
            upcomingEvents={events.length}
          />
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="max-w-4xl mx-auto -mt-4 space-y-6 pb-4">
        {/* Widget Grid: Tasks + Shopping List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ErrorBoundary>
            <TodaysTasksWidget
              tasks={todaysTasks}
              members={members}
              userId={user.id}
              familyId={user.family_id}
              onTaskCompleted={handleTaskCompletedOptimistic}
              onTaskCreated={async () => { await reloadTasks(); broadcast('tasks') }}
              onCreateTask={() => setShowCreateTask(true)}
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
        onClose={() => setShowCreateTask(false)}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        onTaskCreated={async () => { await reloadTasks(); broadcast('tasks') }}
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
    </div>
  )
}
