'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { completeTask, createTask, type Task, type User } from '@kinnect/core'
import { AlertCircle, CheckCircle, Circle, Pencil, Plus } from 'lucide-react'
import logger from '@/lib/logger'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary-500',
  member: 'bg-purple-500',
  dependent: 'bg-accent-500',
  observer: 'bg-amber-500',
}

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

  // Pre-compute member lookup map for O(1) access
  const membersMap = useMemo(() => {
    const map: Record<string, User> = {}
    for (const m of members) map[m.id] = m
    return map
  }, [members])

  function isOverdue(dueDateStr: string | null | undefined) {
    if (!dueDateStr) return false
    const dateOnly = dueDateStr.split('T')[0]
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return dateOnly < todayStr
  }

  function getMemberName(id: string | null | undefined) {
    if (!id) return '?'
    return membersMap[id]?.name || '?'
  }

  function getMemberRole(id: string) {
    return membersMap[id]?.role || null
  }

  async function handleComplete(taskId: string) {
    // Optimistic — notify parent immediately for instant UI update
    onTaskCompleted(taskId)
    try {
      await completeTask(taskId, userId)
      // Sync after API confirms
      await onTaskCreated()
    } catch (error) {
      logger.error('Failed to complete task', error)
      // Revert by refetching
      await onTaskCreated()
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
    <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-brand-primary">
            <CheckCircle className="h-5 w-5 text-brand-success" />
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
        <div className="space-y-2">
          {incompleteTasks.length === 0 && !recentComplete ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm font-medium mb-4">
                No tasks for today!
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
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="mt-0.5 text-gray-300 hover:text-brand-success transition-colors"
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-brand-primary group-hover:text-brand-accent transition-colors">
                        {task.title}
                      </span>
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
                                ROLE_COLORS[getMemberRole(id) || ''] ||
                                'bg-gray-500'
                              }`}
                            >
                              {getMemberName(id).charAt(0)}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {task.assigned_to.map((id) => getMemberName(id)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1.5 text-gray-300 hover:text-brand-accent hover:bg-brand-bg rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit task"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Recent completion */}
              {recentComplete && (
                <div className="flex items-start gap-3 p-3 bg-success-50/50 rounded-xl border border-success-100">
                  <CheckCircle className="w-5 h-5 text-brand-success mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-600 line-through">
                      {recentComplete.title}
                    </div>
                    <div className="text-xs text-brand-success font-bold mt-0.5">
                      Done!
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Quick add task..."
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-gray-400"
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
