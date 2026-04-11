'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { completeTask, createTask, type Task, type User } from '@kinnect/core'
import { AlertCircle, CheckCircle2, Circle, Pencil, Plus } from 'lucide-react'
import logger from '@/lib/logger'
import { ROLE_COLORS } from '@/lib/constants'
import { getTodayStr } from '@/lib/formatters'

interface TodaysTasksWidgetProps {
  tasks: Task[]
  members: User[]
  userId: string
  familyId: string
  onTaskCompleted: (taskId?: string) => void
  onTaskCreated: () => Promise<void>
  onCreateTask: () => void
  onEditTask: (task: Task) => void
}

export default function TodaysTasksWidget({
  tasks,
  members,
  userId,
  familyId,
  onTaskCompleted,
  onTaskCreated,
  onCreateTask,
  onEditTask,
}: TodaysTasksWidgetProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [poppingId, setPoppingId] = useState<string | null>(null)

  const membersMap = useMemo(() => {
    const map: Record<string, User> = {}
    for (const m of members) map[m.id] = m
    return map
  }, [members])

  function isOverdue(dueDateStr: string | null | undefined) {
    if (!dueDateStr) return false
    return dueDateStr.split('T')[0] < getTodayStr()
  }

  function getMemberName(id: string | null | undefined) {
    if (!id) return '?'
    return membersMap[id]?.name || '?'
  }

  function getMemberRole(id: string) {
    return membersMap[id]?.role || null
  }

  async function handleComplete(taskId: string) {
    setPoppingId(taskId)
    onTaskCompleted(taskId)
    try {
      await completeTask(taskId, userId)
      await onTaskCreated()
    } catch (error) {
      logger.error('Failed to complete task', error)
      await onTaskCreated()
    } finally {
      setTimeout(() => setPoppingId(null), 450)
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim() || isAdding) return

    setIsAdding(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await createTask({
        family_id: familyId,
        title: newTaskTitle.trim(),
        created_by: userId,
        assigned_to: [userId],
        due_date: today,
      })
      setNewTaskTitle('')
      await onTaskCreated()
    } catch (error) {
      logger.error('Failed to add task', error)
      toast.error('Failed to add task')
    } finally {
      setIsAdding(false)
    }
  }

  const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 3)
  const recentComplete = tasks.find((t) => t.completed)

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
            <div className="w-7 h-7 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-brand-success" />
            </div>
            Today&apos;s Tasks
          </h2>
          <Link
            href="/dashboard/tasks"
            className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Tasks List */}
        <div className="space-y-1">
          {incompleteTasks.length === 0 && !recentComplete ? (
            <div className="text-center py-5">
              <p className="text-gray-400 text-sm font-medium mb-4">
                All clear for today!
              </p>
              <button
                onClick={onCreateTask}
                className="px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 transition-colors inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>
          ) : (
            <>
              {/* Incomplete tasks */}
              {incompleteTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50/80 rounded-xl transition-colors group"
                >
                  <button
                    onClick={() => handleComplete(task.id)}
                    className={`mt-0.5 text-gray-300 hover:text-brand-success transition-colors shrink-0 ${
                      poppingId === task.id ? 'animate-completion-pop text-brand-success' : ''
                    }`}
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => onEditTask(task)}
                        className="text-sm font-bold text-brand-primary group-hover:text-brand-accent transition-colors text-left"
                      >
                        {task.title}
                      </button>
                      {isOverdue(task.due_date) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold shrink-0">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {task.assigned_to.slice(0, 3).map((id) => (
                            <div
                              key={id}
                              className={`h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold ${
                                ROLE_COLORS[getMemberRole(id) || ''] || 'bg-gray-500'
                              }`}
                            >
                              {getMemberName(id).charAt(0)}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">
                          {task.assigned_to.map((id) => getMemberName(id)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1.5 text-gray-300 hover:text-brand-accent hover:bg-brand-bg rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Edit task"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Recent completion */}
              {recentComplete && (
                <div className="flex items-start gap-3 p-3 bg-success-50/50 rounded-xl border border-success-100/60 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-brand-success mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-500 line-through">
                      {recentComplete.title}
                    </div>
                    <div className="text-xs text-brand-success font-bold mt-0.5">Done!</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mt-4 pt-4 border-t border-gray-100/70">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Quick add task…"
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-transparent placeholder:text-gray-400 transition-shadow"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isAdding}
            className="px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
