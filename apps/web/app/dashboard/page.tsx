'use client'

import AddMemberModal from '@/components/AddMemberModal'
import { completeTask } from '@kinnect/core'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getFamily, getFamilyMembers, getTasks, type User, type Family, type Task } from '@kinnect/core'
import CreateTaskModal from '@/components/CreateTaskModal'

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
    // Reload tasks
    if (user?.family_id) {
      const tasksData = await getTasks(user.family_id)
      setTasks(tasksData)
    }
  }

  async function handleMemberAdded() {
    // Reload family members
    if (user?.family_id) {
      const membersData = await getFamilyMembers(user.family_id)
      setMembers(membersData)
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return

    try {
      await completeTask(taskId, user.id)
      // Reload tasks
      if (user.family_id) {
        const tasksData = await getTasks(user.family_id)
        setTasks(tasksData)
        // Reload user to get updated points
        const updatedUser = await getCurrentUser()
        setUser(updatedUser)
      }
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Failed to complete task')
    }
  }

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>
  }

  if (!user?.family_id) {
    return null // Will redirect to onboarding
  }

  const pendingTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome back, {user.name}!
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Family Members Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Family Members</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{members.length}</dd>
                  </dl>
                </div>
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                title="Add family member"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{pendingTasks.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Points Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Your Points</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{user.points || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
          <button
            onClick={() => setShowCreateTask(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-xl leading-none">+</span>
            Create Task
          </button>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tasks yet. Create one to get started!</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tasks.slice(0, 5).map((task) => (
                <li key={task.id} className="py-4">
                  <div className="flex items-center justify-between">
                    {/* Checkbox for completion */}
                    <div className="flex items-center gap-3 flex-1">
                      {!task.completed && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="flex-shrink-0 w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors"
                          title="Mark as complete"
                        >
                          {/* Empty checkbox */}
                        </button>
                      )}
                      {task.completed && (
                        <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {task.points} pts
                      </span>
                      {task.completed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        familyId={user.family_id}
        onMemberAdded={handleMemberAdded}
      />

      {/* Create Task Modal */}
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