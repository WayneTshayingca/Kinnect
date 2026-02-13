'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTasks, completeTask, uncompleteTask, type Task } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import CreateTaskModal from '@/components/CreateTaskModal'

export default function TasksPage() {
  const router = useRouter()
  const { user } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    getTasks(user.family_id)
      .then(setTasks)
      .catch((err) => console.error('Error loading tasks:', err))
      .finally(() => setLoading(false))
  }, [user?.family_id])

  async function handleTaskCreated() {
    if (user?.family_id) {
      const tasksData = await getTasks(user.family_id)
      setTasks(tasksData)
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: true, completed_by: user.id, completed_at: new Date().toISOString() }
          : t
      )
    )

    try {
      await completeTask(taskId, user.id)
    } catch (error) {
      console.error('Error completing task:', error)
      // Revert on failure
      if (user.family_id) {
        const tasksData = await getTasks(user.family_id)
        setTasks(tasksData)
      }
    }
  }

  async function handleUncompleteTask(taskId: string) {
    if (!user?.family_id) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: false, completed_by: null, completed_at: null }
          : t
      )
    )

    try {
      await uncompleteTask(taskId)
    } catch (error) {
      console.error('Error undoing task:', error)
      // Revert on failure
      const tasksData = await getTasks(user.family_id)
      setTasks(tasksData)
    }
  }

  if (loading) {
    return <div className="p-8">Loading tasks...</div>
  }

  if (!user?.family_id) {
    return null
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  const pendingCount = tasks.filter(t => !t.completed).length
  const completedCount = tasks.filter(t => t.completed).length


  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">
            {pendingCount} pending, {completedCount} completed
          </p>
        </div>
        <button
          onClick={() => setShowCreateTask(true)}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span>
          Create Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setFilter('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'all'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'pending'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'completed'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed ({completedCount})
          </button>
        </nav>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {filter === 'completed' ? 'No completed tasks yet' : 'No tasks yet. Create one to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                {!task.completed && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="flex-shrink-0 w-5 h-5 mt-0.5 border-2 border-gray-300 rounded hover:border-accent-500 hover:bg-primary-50 transition-colors"
                    title="Mark as complete"
                  />
                )}
                {task.completed && (
                  <button
                    onClick={() => handleUncompleteTask(task.id)}
                    className="flex-shrink-0 w-5 h-5 mt-0.5 bg-success-500 rounded flex items-center justify-center hover:bg-success-400 transition-colors cursor-pointer"
                    title="Mark as incomplete"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}

                {/* Task Content */}
                <div className="flex-1">
                  <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {task.due_date && (
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <span>{task.assigned_to.length} assigned</span>
                    )}
                    {task.completed_at && (
                      <span className="text-success-600">
                        ✓ Completed {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        familyId={user.family_id}
        userId={user.id}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}