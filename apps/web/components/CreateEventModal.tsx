'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { createCalendarEvent, updateCalendarEvent, type CalendarEvent, getTodayStr } from '@kinnect/core'
import logger from '@/lib/logger'
import Modal from '@/components/Modal'

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
      setStartDate(defaultDate || getTodayStr())
      setStartTime('09:00')
      setEndDate(defaultDate || getTodayStr())
      setEndTime('10:00')
      setAllDay(false)
    }
  }, [isOpen, event, defaultDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // All-day events: append 'Z' to treat as UTC directly, so toISOString()
      // doesn't shift the date (e.g. SAST midnight would roll back to the previous
      // day in UTC without the explicit Z). Timed events use local time as before.
      const startDateTime = allDay
        ? new Date(`${startDate}T00:00:00Z`).toISOString()
        : new Date(`${startDate}T${startTime}:00`).toISOString()
      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59Z`).toISOString()
        : new Date(`${endDate}T${endTime}:00`).toISOString()

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
      logger.error(`Error ${isEditing ? 'updating' : 'creating'} event`, error)
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} event`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create New Event'}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={loading
        ? (isEditing ? 'Saving...' : 'Creating...')
        : (isEditing ? 'Save Changes' : 'Create Event')}
    >
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
            lang="en-ZA"
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
            lang="en-ZA"
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
    </Modal>
  )
}
