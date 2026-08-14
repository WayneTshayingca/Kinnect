'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getTasks,
  completeTask,
  uncompleteTask,
  deleteTask,
  getFamilyMembers,
  type Task,
  type User,
  ROLE_HEX_COLORS,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import CreateTaskModal from '@/components/CreateTaskModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import logger from '@/lib/logger'
import toast from 'react-hot-toast'
import { timeAgo, getTodayStr } from '@/lib/formatters'
import { ROLE_COLORS } from '@/lib/constants'
import {
  CheckCircle2,
  Circle,
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  RotateCcw,
  ListChecks,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  household: 'bg-violet-50 text-violet-600',
  school:    'bg-blue-50 text-blue-600',
  work:      'bg-primary-50 text-primary-600',
  health:    'bg-success-50 text-success-700',
  errand:    'bg-accent-50 text-accent-600',
  finance:   'bg-amber-50 text-amber-700',
  personal:  'bg-rose-50 text-rose-600',
}

function formatDueDate(dueDate: string): string {
  const dateOnly = dueDate.split('T')[0]
  const today = getTodayStr()
  if (dateOnly === today) return 'Today'
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (dateOnly === tomorrow) return 'Tomorrow'
  return new Date(dateOnly + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Sub-components ────────────────────────────────────────────────

function DueDateBadge({ dueDate, completed }: { dueDate: string | null | undefined; completed: boolean | null }) {
  if (!dueDate || completed) return null
  const d = dueDate.split('T')[0]
  const today = getTodayStr()
  if (d < today) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full shrink-0">
        <AlertCircle className="w-3 h-3" />
        Overdue
      </span>
    )
  }
  if (d === today) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full shrink-0">
        <Clock className="w-3 h-3" />
        Today
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
      <Calendar className="w-3 h-3" />
      {formatDueDate(d)}
    </span>
  )
}

function AssigneeAvatars({
  assigneeIds,
  membersMap,
}: {
  assigneeIds: string[] | null
  membersMap: Record<string, User>
}) {
  if (!assigneeIds?.length) return null
  const visible = assigneeIds.slice(0, 3)
  const overflow = assigneeIds.length - 3
  return (
    <div className="flex -space-x-1 shrink-0">
      {visible.map((id) => {
        const m = membersMap[id]
        if (!m) return null
        return (
          <div
            key={id}
            title={m.name}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ring-1 ring-white ${
              ROLE_COLORS[m.role || ''] || 'bg-gray-400'
            }`}
          >
            {m.name.charAt(0).toUpperCase()}
          </div>
        )
      })}
      {overflow > 0 && (
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-1 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  )
}

function TaskCheckbox({
  completed,
  onComplete,
  onUncomplete,
}: {
  completed: boolean | null
  onComplete: () => void
  onUncomplete: () => void
}) {
  if (completed) {
    return (
      <button
        onClick={onUncomplete}
        title="Mark incomplete"
        className="shrink-0 text-success-500 hover:text-gray-400 transition-colors"
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>
    )
  }
  return (
    <button
      onClick={onComplete}
      title="Mark complete"
      className="shrink-0 text-primary-200 hover:text-success-400 transition-colors"
    >
      <Circle className="w-5 h-5" />
    </button>
  )
}

type SectionAccent = 'coral' | 'indigo' | 'gray' | 'success'

function SectionHeader({ label, count, accent = 'gray' }: { label: string; count: number; accent?: SectionAccent }) {
  const styles: Record<SectionAccent, string> = {
    coral:   'text-accent-600 border-accent-200',
    indigo:  'text-primary-600 border-primary-200',
    gray:    'text-gray-500 border-gray-200',
    success: 'text-success-700 border-success-200',
  }
  const countStyles: Record<SectionAccent, string> = {
    coral:   'bg-accent-100 text-accent-700',
    indigo:  'bg-primary-100 text-primary-700',
    gray:    'bg-gray-100 text-gray-600',
    success: 'bg-success-100 text-success-700',
  }
  return (
    <div className={`flex items-center gap-2 pb-2 mb-1 border-b ${styles[accent]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${countStyles[accent]}`}>
        {count}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

export default function TasksPage() {
  const router = useRouter()
  const { user } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [search, setSearch] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  const inflightRef = useRef<Map<string, Partial<Task>>>(new Map())

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    Promise.all([
      getTasks(user.family_id),
      getFamilyMembers(user.family_id),
    ])
      .then(([tasksData, membersData]) => {
        setTasks(tasksData)
        setMembers(membersData)
      })
      .catch((err) => { logger.error('Error loading tasks', err); toast.error('Failed to load tasks') })
      .finally(() => setLoading(false))
  }, [user?.family_id])

  const reloadTasks = useCallback(async () => {
    if (user?.family_id) {
      const tasksData = await getTasks(user.family_id)
      const inflight = inflightRef.current
      if (inflight.size > 0) {
        setTasks(tasksData.map((t) => inflight.has(t.id) ? { ...t, ...inflight.get(t.id) } : t))
      } else {
        setTasks(tasksData)
      }
    }
  }, [user?.family_id])

  const broadcast = useRealtimeSync(user?.family_id, { tasks: reloadTasks })

  async function handleCompleteTask(taskId: string) {
    if (!user) return
    const optimistic: Partial<Task> = { completed: true, completed_by: user.id, completed_at: new Date().toISOString() }
    inflightRef.current.set(taskId, optimistic)
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...optimistic } : t))
    try {
      await completeTask(taskId, user.id)
      broadcast('tasks')
    } catch (error) {
      logger.error('Error completing task', error)
      toast.error('Failed to complete task')
      await reloadTasks()
    } finally {
      inflightRef.current.delete(taskId)
    }
  }

  async function handleUncompleteTask(taskId: string) {
    if (!user?.family_id) return
    const optimistic: Partial<Task> = { completed: false, completed_by: null, completed_at: null }
    inflightRef.current.set(taskId, optimistic)
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...optimistic } : t))
    try {
      await uncompleteTask(taskId)
      broadcast('tasks')
    } catch (error) {
      logger.error('Error undoing task', error)
      toast.error('Failed to undo task')
      await reloadTasks()
    } finally {
      inflightRef.current.delete(taskId)
    }
  }

  async function handleDeleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    try {
      await deleteTask(taskId)
      broadcast('tasks')
    } catch (error) {
      logger.error('Error deleting task', error)
      toast.error('Failed to delete task')
      await reloadTasks()
    }
  }

  const membersMap = useMemo(() => {
    const map: Record<string, User> = {}
    for (const m of members) map[m.id] = m
    return map
  }, [members])

  const todayStr = getTodayStr()

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'pending' && task.completed) return false
    if (filter === 'completed' && !task.completed) return false
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
    if (assigneeFilter && !task.assigned_to?.includes(assigneeFilter)) return false
    return true
  }), [tasks, filter, search, assigneeFilter])

  const groupedTasks = useMemo(() => {
    const pending = filteredTasks.filter((t) => !t.completed)
    const dateOf = (t: Task) => (t.due_date ?? '').split('T')[0]
    return {
      overdue:  pending.filter((t) => t.due_date && dateOf(t) < todayStr)
                       .sort((a, b) => dateOf(a).localeCompare(dateOf(b))),
      today:    pending.filter((t) => t.due_date && dateOf(t) === todayStr),
      upcoming: pending.filter((t) => t.due_date && dateOf(t) > todayStr)
                       .sort((a, b) => dateOf(a).localeCompare(dateOf(b))),
      noDue:    pending.filter((t) => !t.due_date),
      completed: filteredTasks.filter((t) => t.completed),
    }
  }, [filteredTasks, todayStr])

  const pendingCount  = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks])
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])
  const overdueCount  = useMemo(
    () => tasks.filter((t) => !t.completed && t.due_date && t.due_date.split('T')[0] < todayStr).length,
    [tasks, todayStr]
  )

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 sm:px-0 space-y-4 animate-pulse">
        <div className="rounded-[1.5rem] h-28 bg-primary-100" />
        <div className="flex gap-2">
          <div className="flex-1 h-11 bg-gray-100 rounded-xl" />
          <div className="w-28 h-11 bg-gray-100 rounded-xl" />
        </div>
        <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
              <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                <div className="h-3 w-1/3 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user?.family_id) return null

  // ── Sections config ──────────────────────────────────────────────

  const sections: { key: keyof typeof groupedTasks; label: string; accent: SectionAccent }[] = [
    { key: 'overdue',   label: 'Overdue',     accent: 'coral' },
    { key: 'today',     label: 'Due Today',   accent: 'indigo' },
    { key: 'upcoming',  label: 'Upcoming',    accent: 'gray' },
    { key: 'noDue',     label: 'No Deadline', accent: 'gray' },
    { key: 'completed', label: 'Completed',   accent: 'success' },
  ]

  const visibleSections = sections.filter((s) => groupedTasks[s.key].length > 0)

  return (
    <div className="px-4 sm:px-0 space-y-4 pb-8">

      {/* ── Header banner ──────────────────────────────────────── */}
      <div
        className="rounded-[1.5rem] px-5 py-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #3730a3 100%)',
          boxShadow: '0 8px 32px -4px rgb(49 46 129 / 0.35), 0 2px 8px -2px rgb(49 46 129 / 0.2)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <ListChecks className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-indigo-300 text-sm whitespace-nowrap">{pendingCount} pending</span>
                {overdueCount > 0 && (
                  <>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-accent-300 text-sm font-semibold whitespace-nowrap">{overdueCount} overdue</span>
                  </>
                )}
                {completedCount > 0 && (
                  <>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-success-400 text-sm whitespace-nowrap">{completedCount} done</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden min-[360px]:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ── Controls row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent placeholder:text-gray-400 shadow-card"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5 shadow-card shrink-0">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                filter === f
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Assignee filter chips ────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAssigneeFilter(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              !assigneeFilter
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'text-gray-500 border-gray-200 bg-white hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            All members
          </button>
          {members.map(m => {
            const isActive = assigneeFilter === m.id
            const hex = ROLE_HEX_COLORS[m.role ?? ''] ?? '#6B7280'
            return (
              <button
                key={m.id}
                onClick={() => setAssigneeFilter(isActive ? null : m.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                style={isActive
                  ? { backgroundColor: hex, borderColor: hex, color: 'white' }
                  : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }
                }
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                  style={{ backgroundColor: hex }}
                >
                  {m.name.charAt(0)}
                </div>
                {m.name.split(' ')[0]}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Task groups ──────────────────────────────────────────── */}
      {visibleSections.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] shadow-card text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <ListChecks className="h-7 w-7 text-primary-300" />
          </div>
          <p className="text-gray-800 font-bold">
            {search
              ? 'No tasks match your search'
              : assigneeFilter
              ? `No ${filter === 'completed' ? 'completed' : 'pending'} tasks for ${members.find(m => m.id === assigneeFilter)?.name?.split(' ')[0] ?? 'this person'}`
              : filter === 'completed'
              ? 'Nothing completed yet'
              : 'All clear!'}
          </p>
          {!search && !assigneeFilter && filter !== 'completed' && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-400 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add a task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleSections.map(({ key, label, accent }) => {
            const sectionTasks = groupedTasks[key]
            return (
              <div key={key}>
                <SectionHeader label={label} count={sectionTasks.length} accent={accent} />
                <div className="space-y-1.5">
                  {sectionTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      membersMap={membersMap}
                      isOverdue={key === 'overdue'}
                      animDelay={Math.min(idx, 7) * 40}
                      onComplete={() => handleCompleteTask(task.id)}
                      onUncomplete={() => handleUncompleteTask(task.id)}
                      onEdit={() => { setEditingTask(task); setShowCreateTask(true) }}
                      onDelete={() => setTaskToDelete(task.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => { setShowCreateTask(false); setEditingTask(null) }}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        onTaskCreated={() => { reloadTasks(); broadcast('tasks') }}
        task={editingTask}
      />

      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => { if (taskToDelete) handleDeleteTask(taskToDelete) }}
        title="Delete task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────

function TaskCard({
  task,
  membersMap,
  isOverdue,
  animDelay,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: {
  task: Task
  membersMap: Record<string, User>
  isOverdue: boolean
  animDelay: number
  onComplete: () => void
  onUncomplete: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const catStyle = CATEGORY_STYLES[task.category?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-500'

  return (
    <div
      className={`bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 group animate-slide-up overflow-hidden ${
        isOverdue ? 'border-l-[3px] border-l-accent-400' : ''
      }`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        {/* Checkbox */}
        <div className="pt-0.5">
          <TaskCheckbox
            completed={task.completed}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold leading-snug ${
              task.completed ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {task.title}
          </p>
          {task.description && !task.completed && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <DueDateBadge dueDate={task.due_date} completed={task.completed} />

            {task.category && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${catStyle}`}>
                {task.category}
              </span>
            )}

            {task.completed && task.completed_at && (
              <span className="text-[10px] text-success-600 font-semibold shrink-0">
                ✓ {timeAgo(task.completed_at)}
              </span>
            )}
          </div>
        </div>

        {/* Assignees */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <AssigneeAvatars assigneeIds={task.assigned_to} membersMap={membersMap} />

          {/* Actions — hover-revealed */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {task.completed ? (
              <button
                onClick={onUncomplete}
                className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mark incomplete"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
