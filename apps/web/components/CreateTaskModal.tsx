'use client'

import {useEffect, useState} from 'react'
import toast from 'react-hot-toast'
import {createTask, updateTask, getFamilyMembers, type Task, type User} from '@kinnect/core'
import logger from '@/lib/logger'
import { getTodayStr } from '@/lib/formatters'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
  userId: string
  members?: User[]
  onTaskCreated: () => void
  task?: Task | null
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  familyId,
  userId,
  members: membersProp,
  onTaskCreated,
  task
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [fetchedMembers, setFetchedMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const isEditing = !!task
  const members = membersProp || fetchedMembers

  useEffect(() => {
    if (isOpen && !membersProp) {
      loadMembers()
    }
  }, [isOpen, familyId, membersProp])

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setAssignedTo(task.assigned_to || [])
    } else if (isOpen) {
      setTitle('')
      setDescription('')
      setDueDate(getTodayStr())
      setAssignedTo([])
    }
  }, [isOpen, task])

  async function loadMembers() {
    try {
      const familyMembers = await getFamilyMembers(familyId)
      setFetchedMembers(familyMembers)
    } catch (error) {
      logger.error('Error loading family members', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await updateTask(task.id, {
          title,
          description: description || null,
          assigned_to: assignedTo,
          due_date: dueDate || null,
        })
      } else {
        await createTask({
          family_id: familyId,
          title,
          description,
          assigned_to: assignedTo,
          due_date: dueDate || undefined,
          created_by: userId
        })
      }

      onTaskCreated()
      onClose()
    } catch (error) {
      logger.error(isEditing ? 'Error updating task' : 'Error creating task', error)
      toast.error(error instanceof Error ? error.message : isEditing ? 'Failed to update task' : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  function toggleAssignee(memberId: string) {
    setAssignedTo(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="e.g., Clean your room"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="Add any details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">No other family members yet</p>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <label key={member.id} className="flex items-center cursor-pointer text-gray-900">
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(member.id)}
                      onChange={() => toggleAssignee(member.id)}
                      className="mr-2 h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">{member.name}</span>
                    {member.role && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({member.role})
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              lang="en-ZA"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
            >
              {loading
                ? (isEditing ? 'Saving...' : 'Creating...')
                : (isEditing ? 'Save Changes' : 'Create Task')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
