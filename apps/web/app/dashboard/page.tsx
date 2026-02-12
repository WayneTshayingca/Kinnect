'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getCurrentUser,
  getFamily,
  getFamilyMembers,
  getTasks,
  completeTask,
  signOut,
  type User,
  type Family,
  type Task,
} from '@kinnect/core'
import CreateTaskModal from '@/components/CreateTaskModal'
import AddMemberModal from '@/components/AddMemberModal'
import { Logo } from '@/components/Logo'
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Trophy,
  Heart,
  Plus,
  LogOut,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  parent: 'bg-primary-500',
  grandparent: 'bg-purple-500',
  child: 'bg-accent-500',
  domestic_worker: 'bg-amber-500',
}

function memberColor(role: string | null) {
  return ROLE_COLORS[role || ''] || 'bg-gray-500'
}

function isSameDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

// ── component ────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
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

      const [familyData, membersData, tasksData] = await Promise.all([
        getFamily(currentUser.family_id),
        getFamilyMembers(currentUser.family_id),
        getTasks(currentUser.family_id),
      ])

      setFamily(familyData)
      setMembers(membersData)
      setTasks(tasksData)
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

  async function handleMemberAdded() {
    if (user?.family_id) {
      const membersData = await getFamilyMembers(user.family_id)
      setMembers(membersData)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return
    try {
      await completeTask(taskId, user.id)
      if (user.family_id) {
        const tasksData = await getTasks(user.family_id)
        setTasks(tasksData)
        const updatedUser = await getCurrentUser()
        setUser(updatedUser)
      }
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading dashboard...</div>
  }

  if (!user?.family_id) {
    return null
  }

  // ── derived data ─────────────────────────────────────

  const today = new Date()

  const todaysTasks = tasks.filter(
    (t) => t.due_date && isSameDay(t.due_date)
  )
  const completedToday = todaysTasks.filter((t) => t.completed).length

  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < today && !t.completed
  )

  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0)

  const pendingTasks = tasks.filter((t) => !t.completed)

  // Tasks to feature: today's tasks first, then recent pending
  const featuredTasks =
    todaysTasks.length > 0
      ? todaysTasks.slice(0, 6)
      : pendingTasks.slice(0, 6)

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name || '?'
  }

  function getMemberRole(id: string) {
    return members.find((m) => m.id === id)?.role || null
  }

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

          <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <div className="text-3xl font-black">{completedToday}</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
                Done Today
              </div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-3xl font-black">{todaysTasks.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
                Daily Tasks
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">{totalPoints}</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
                Total Points
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="max-w-4xl mx-auto -mt-4 space-y-6 pb-4">
        {/* Progress + Alert row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Progress */}
          <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-3 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-brand-primary">
                  <CheckCircle className="h-5 w-5 text-brand-success" />
                  Today&apos;s Progress
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    completedToday === todaysTasks.length &&
                    todaysTasks.length > 0
                      ? 'bg-brand-success text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {completedToday}/{todaysTasks.length}
                </span>
              </div>
            </div>
            <div className="px-6 pt-6 pb-6">
              {/* Progress bar */}
              <div className="h-3 rounded-full bg-primary-50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-success transition-all duration-500"
                  style={{
                    width: `${
                      todaysTasks.length > 0
                        ? (completedToday / todaysTasks.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-4 text-sm text-gray-500 font-medium">
                {todaysTasks.length === 0
                  ? 'No tasks scheduled for today. Take a break!'
                  : completedToday === todaysTasks.length
                    ? 'Amazing! Every task is complete.'
                    : `${todaysTasks.length - completedToday} tasks left to conquer today.`}
              </p>
              <button
                onClick={() => setShowCreateTask(true)}
                className="w-full mt-6 bg-brand-accent hover:bg-accent-600 text-white rounded-xl h-12 shadow-lg shadow-accent-500/20 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Family Task
              </button>
            </div>
          </div>

          {/* Overdue Alert OR On Track */}
          {overdueTasks.length > 0 ? (
            <div className="bg-accent-50 rounded-[1.5rem] shadow-sm border-2 border-accent-200/40">
              <div className="px-6 pt-6 pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-brand-accent p-2 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-accent-900">
                    Action Required
                  </h2>
                </div>
              </div>
              <div className="px-6 pb-6">
                <p className="text-sm text-accent-700 mb-6 font-medium">
                  {overdueTasks.length} task
                  {overdueTasks.length > 1 ? 's are' : ' is'} overdue.
                  Let&apos;s get these finished!
                </p>
                <Link
                  href="/dashboard/tasks"
                  className="block w-full text-center bg-white border border-accent-200 text-brand-accent hover:bg-accent-50 rounded-xl h-11 leading-[2.75rem] font-bold transition-colors"
                >
                  Resolve Issues
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-brand-bg/50 rounded-[1.5rem] shadow-sm border border-brand-bg flex items-center justify-center p-8">
              <div className="text-center">
                <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                  <Heart className="h-8 w-8 text-brand-accent" />
                </div>
                <h3 className="font-bold text-brand-primary">
                  You&apos;re on track!
                </h3>
                <p className="text-sm text-primary-500 mt-1 font-medium">
                  Everything is up to date.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Featured Tasks ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-brand-primary">
              Featured Tasks
            </h2>
            <Link
              href="/dashboard/tasks"
              className="text-brand-accent font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors text-sm"
            >
              View Full List
            </Link>
          </div>

          {featuredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] shadow-sm border border-gray-50">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-gray-200" />
              </div>
              <p className="text-gray-400 font-bold">No tasks to show</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      {task.category ? (
                        <span className="bg-primary-50 text-brand-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                          {task.category}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center text-amber-500 font-black text-sm">
                        <Trophy className="h-3.5 w-3.5 mr-1" />
                        {task.points || 0}
                      </div>
                    </div>

                    <h3
                      className={`font-bold text-brand-primary line-clamp-1 group-hover:text-brand-accent transition-colors ${
                        task.completed ? 'line-through opacity-50' : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    <div className="mt-4 flex items-center justify-between">
                      {/* Assigned avatars */}
                      <div className="flex -space-x-2">
                        {(task.assigned_to || []).slice(0, 3).map((id) => (
                          <div
                            key={id}
                            className={`h-7 w-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold ${memberColor(getMemberRole(id))}`}
                          >
                            {getMemberName(id).charAt(0)}
                          </div>
                        ))}
                      </div>

                      {/* Status + complete action */}
                      {task.completed ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-success-50 text-brand-success">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-gray-100 text-gray-600 hover:bg-success-50 hover:text-brand-success transition-colors"
                        >
                          Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Family Leaderboard ──────────────────────── */}
        <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-primary">
              Family Leaderboard
            </h2>
            <button
              onClick={() => setShowAddMember(true)}
              className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Member
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {members.map((member) => {
              const completedCount = tasks.filter(
                (t) =>
                  t.completed &&
                  t.assigned_to &&
                  t.assigned_to.includes(member.id)
              ).length

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-primary-50/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-full shadow-sm flex items-center justify-center text-white font-bold ${memberColor(member.role)}`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-brand-primary">
                        {member.name}
                        {member.id === user.id && (
                          <span className="text-xs text-primary-400 font-medium ml-1.5">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                        {member.role || 'Member'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Completed
                      </p>
                      <p className="font-bold text-brand-primary">
                        {completedCount}
                      </p>
                    </div>
                    <div className="bg-brand-bg px-4 py-2 rounded-xl text-center min-w-[80px]">
                      <div className="flex items-center justify-center text-brand-primary font-black">
                        <TrendingUp className="h-4 w-4 mr-1 text-brand-success" />
                        <span>{member.points || 0}</span>
                      </div>
                      <p className="text-[10px] text-primary-400 uppercase font-bold">
                        Points
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
