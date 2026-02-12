'use client'

import { useState, useEffect } from 'react'
import { createCalendarEvent, updateCalendarEvent, type CalendarEvent } from '@kinnect/core'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
  userId: string
  onEventCreated: () => void
  defaultDate?: string
  event?: CalendarEvent | null
}

export default function CreateEventModal({
  isOpen,
  onClose,
  familyId,
  userId,
  onEventCreated,
  defaultDate,
  event,
}: CreateEventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEditing = !!event

  useEffect(() => {
    if (!isOpen) return

    if (event) {
      const start = new Date(event.start_time)
      const end = new Date(event.end_time)
      setTitle(event.title)
      setDescription(event.description || '')
      setLocation(event.location || '')
      setAllDay(event.all_day)
      setStartDate(start.toISOString().slice(0, 10))
      setStartTime(start.toTimeString().slice(0, 5))
      setEndDate(end.toISOString().slice(0, 10))
      setEndTime(end.toTimeString().slice(0, 5))
    } else {
      setTitle('')
      setDescription('')
      setLocation('')
      setStartDate(defaultDate || '')
      setStartTime('09:00')
      setEndDate(defaultDate || '')
      setEndTime('10:00')
      setAllDay(false)
    }
  }, [isOpen, event, defaultDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime}:00`
      const endDateTime = allDay
        ? `${endDate}T23:59:59`
        : `${endDate}T${endTime}:00`

      if (isEditing) {
        await updateCalendarEvent(event.id, {
          title,
          description: description || undefined,
          location: location || null,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: allDay,
        })
      } else {
        await createCalendarEvent(
          familyId,
          title,
          startDateTime,
          endDateTime,
          userId,
          description || undefined,
          allDay,
          location || undefined
        )
      }

      onEventCreated()
      onClose()
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} event:`, error)
      alert(`Failed to ${isEditing ? 'update' : 'create'} event`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="e.g., Family dinner"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="e.g., Grandma's house"
            />
          </div>

          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="mr-2 h-4 w-4 text-primary-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">All day event</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                />
              </div>
            )}
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
                : (isEditing ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
