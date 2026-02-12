'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  getFamily,
  getFamilyMembers,
  getTasks,
  getCalendarEvents,
  getShoppingListPreview,
  ensureShoppingList,
  signOut,
  type User,
  type Family,
  type Task,
  type CalendarEvent,
  type ListItem,
} from '@kinnect/core'
import CreateTaskModal from '@/components/CreateTaskModal'
import AddMemberModal from '@/components/AddMemberModal'
import { Logo } from '@/components/Logo'
import DashboardStats from '@/components/dashboard/DashboardStats'
import TodaysTasksWidget from '@/components/dashboard/TodaysTasksWidget'
import ShoppingListWidget from '@/components/dashboard/ShoppingListWidget'
import UpcomingEventsWidget from '@/components/dashboard/UpcomingEventsWidget'
import FamilyActivityWidget from '@/components/dashboard/FamilyActivityWidget'
import { LogOut } from 'lucide-react'

// ── helpers ──────────────────────────────────────────────

function isSameDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
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
  const [user, setUser] = useState<User | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [shoppingItems, setShoppingItems] = useState<ListItem[]>([])
  const [shoppingTotalCount, setShoppingTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (!currentUser?.family_id) {
        router.push('/onboarding')
        return
      }

      const familyId = currentUser.family_id
      const { weekStart, weekEnd } = getWeekRange()

      // Ensure shopping list exists for this family
      await ensureShoppingList(familyId)

      const [familyData, membersData, tasksData, eventsData, shoppingData] =
        await Promise.all([
          getFamily(familyId),
          getFamilyMembers(familyId),
          getTasks(familyId),
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
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTaskCreated() {
    if (user?.family_id) {
      const tasksData = await getTasks(user.family_id)
      setTasks(tasksData)
    }
  }

  async function handleTaskCompleted() {
    if (user?.family_id) {
      const tasksData = await getTasks(user.family_id)
      setTasks(tasksData)
    }
  }

  async function handleMemberAdded() {
    if (user?.family_id) {
      const membersData = await getFamilyMembers(user.family_id)
      setMembers(membersData)
    }
  }

  async function handleShoppingItemsChanged() {
    if (user?.family_id) {
      const shoppingData = await getShoppingListPreview(user.family_id, 4)
      setShoppingItems(shoppingData.items)
      setShoppingTotalCount(shoppingData.totalCount)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground">Loading dashboard...</div>
    )
  }

  if (!user?.family_id) {
    return null
  }

  // ── derived data ─────────────────────────────────────

  const todaysTasks = tasks.filter((t) => t.due_date && isSameDay(t.due_date))
  const completedToday = todaysTasks.filter((t) => t.completed).length

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
          <TodaysTasksWidget
            tasks={todaysTasks}
            members={members}
            userId={user.id}
            onTaskCompleted={handleTaskCompleted}
            onCreateTask={() => setShowCreateTask(true)}
          />
          <ShoppingListWidget
            items={shoppingItems}
            totalCount={shoppingTotalCount}
            familyId={user.family_id}
            userId={user.id}
            members={members}
            onItemsChanged={handleShoppingItemsChanged}
          />
        </div>

        {/* Full Width Widgets */}
        <UpcomingEventsWidget events={events} />
        <FamilyActivityWidget
          members={members}
          tasks={tasks}
          currentUserId={user.id}
          onAddMember={() => setShowAddMember(true)}
        />
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        familyId={user.family_id}
        userId={user.id}
        onTaskCreated={handleTaskCreated}
      />
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        familyId={user.family_id}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  )
}
