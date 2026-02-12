'use client'

import Link from 'next/link'
import { completeTask, type Task, type User } from '@kinnect/core'
import { CheckCircle, Circle, Plus } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  parent: 'bg-primary-500',
  grandparent: 'bg-purple-500',
  child: 'bg-accent-500',
  domestic_worker: 'bg-amber-500',
}

interface TodaysTasksWidgetProps {
  tasks: Task[]
  members: User[]
  userId: string
  onTaskCompleted: () => void
  onCreateTask: () => void
}

export default function TodaysTasksWidget({
  tasks,
  members,
  userId,
  onTaskCompleted,
  onCreateTask,
}: TodaysTasksWidgetProps) {
  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name || '?'
  }

  function getMemberRole(id: string) {
    return members.find((m) => m.id === id)?.role || null
  }

  async function handleComplete(taskId: string) {
    try {
      await completeTask(taskId, userId)
      onTaskCompleted()
    } catch (error) {
      console.error('Failed to complete task:', error)
      alert('Failed to complete task')
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
                    <div className="text-sm font-bold text-brand-primary">
                      {task.title}
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
      </div>
    </div>
  )
}
