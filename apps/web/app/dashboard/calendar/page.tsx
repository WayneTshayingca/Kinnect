'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCalendarEvents,
  deleteCalendarEvent,
  type CalendarEvent,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import toast from 'react-hot-toast'
import CreateEventModal from '@/components/CreateEventModal'

// ── helpers ──────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function startDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0 = Sun
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(dateStr: string, year: number, month: number, day: number) {
  const d = new Date(dateStr)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
  )
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── component ────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter()
  const { user } = useUser()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()

  // ── data loading ─────────────────────────────────────

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    setLoading(false)
  }, [user?.family_id])

  useEffect(() => {
    if (user?.family_id) {
      loadEvents()
    }
  }, [user, year, month])

  async function loadEvents() {
    if (!user?.family_id) return
    try {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDay = daysInMonth(year, month)
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      const data = await getCalendarEvents(user.family_id, start, end)
      setEvents(data)
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Delete this event?')) return
    try {
      await deleteCalendarEvent(eventId)
      await loadEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  // ── navigation ───────────────────────────────────────

  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today.getDate())
  }

  function openCreateForDate(day?: number) {
    const d = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : undefined
    setEditingEvent(null)
    setDefaultDate(d)
    setShowCreateEvent(true)
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev)
    setDefaultDate(undefined)
    setShowCreateEvent(true)
  }

  // ── derived data ─────────────────────────────────────

  function eventsForDay(day: number) {
    return events.filter(e => isSameDay(e.start_time, year, month, day))
  }

  /** Events grouped by date string for agenda view */
  function groupedEvents() {
    const groups: Record<string, CalendarEvent[]> = {}
    for (const event of events) {
      const key = new Date(event.start_time).toLocaleDateString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    }
    return groups
  }

  // ── render ───────────────────────────────────────────

  if (loading) {
    return <div className="p-8">Loading calendar...</div>
  }
  if (!user?.family_id) return null

  const totalDays = daysInMonth(year, month)
  const startDay = startDayOfMonth(year, month)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">
            {events.length} event{events.length !== 1 ? 's' : ''} this month
          </p>
        </div>
        <button
          onClick={() => openCreateForDate()}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span>
          Add Event
        </button>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setView('month')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              view === 'month'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('agenda')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              view === 'agenda'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Agenda
          </button>
        </nav>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── MONTH VIEW ─────────────────────────────────── */}
      {view === 'month' && (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-t border-l border-gray-200">
            {/* leading blanks */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`blank-${i}`} className="border-r border-b border-gray-200 bg-gray-50 min-h-[80px] sm:min-h-[100px]" />
            ))}

            {/* actual days */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const isToday = isCurrentMonth && day === today.getDate()
              const isSelected = selectedDay === day
              const dayEvents = eventsForDay(day)

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`border-r border-b border-gray-200 min-h-[80px] sm:min-h-[100px] p-1 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        isToday
                          ? 'bg-accent-500 text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreateForDate(day) }}
                        className="text-gray-400 hover:text-accent-500 text-xs leading-none"
                        title="Add event"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className="text-xs truncate rounded px-1 py-0.5 bg-primary-100 text-primary-700"
                        title={ev.title}
                      >
                        {ev.all_day ? '' : formatTime(ev.start_time) + ' '}{ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* trailing blanks to complete the grid */}
            {Array.from({ length: (7 - ((startDay + totalDays) % 7)) % 7 }).map((_, i) => (
              <div key={`trail-${i}`} className="border-r border-b border-gray-200 bg-gray-50 min-h-[80px] sm:min-h-[100px]" />
            ))}
          </div>

          {/* Selected day detail panel */}
          {selectedDay !== null && (
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {MONTH_NAMES[month]} {selectedDay}, {year}
                </h3>
                <button
                  onClick={() => openCreateForDate(selectedDay)}
                  className="text-sm text-accent-500 hover:text-accent-700 font-medium"
                >
                  + Add event
                </button>
              </div>
              {eventsForDay(selectedDay).length === 0 ? (
                <p className="text-sm text-gray-500">No events on this day.</p>
              ) : (
                <div className="space-y-2">
                  {eventsForDay(selectedDay).map(ev => (
                    <div key={ev.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{ev.title}</p>
                        <p className="text-sm text-gray-500">
                          {ev.all_day
                            ? 'All day'
                            : `${formatTime(ev.start_time)} – ${formatTime(ev.end_time)}`}
                        </p>
                        {ev.location && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {ev.location}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-sm text-gray-600 mt-1">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <button
                          onClick={() => openEditEvent(ev)}
                          className="text-gray-400 hover:text-primary-600 transition-colors"
                          title="Edit event"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete event"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── AGENDA VIEW ────────────────────────────────── */}
      {view === 'agenda' && (
        <>
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No events this month. Add one to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents()).map(([dateLabel, dayEvents]) => (
                <div key={dateLabel}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sticky top-0 bg-gray-50 py-1 px-1 -mx-1 rounded">
                    {dateLabel}
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{ev.title}</h4>
                            <p className="text-sm text-primary-600 mt-0.5">
                              {ev.all_day
                                ? 'All day'
                                : `${formatTime(ev.start_time)} – ${formatTime(ev.end_time)}`}
                            </p>
                            {ev.location && (
                              <p className="text-sm text-gray-500 mt-0.5">
                                <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {ev.location}
                              </p>
                            )}
                            {ev.description && (
                              <p className="text-sm text-gray-600 mt-1">{ev.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <button
                              onClick={() => openEditEvent(ev)}
                              className="text-gray-400 hover:text-primary-600 transition-colors"
                              title="Edit event"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete event"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => { setShowCreateEvent(false); setEditingEvent(null) }}
        familyId={user.family_id}
        userId={user.id}
        onEventCreated={loadEvents}
        defaultDate={defaultDate}
        event={editingEvent}
      />
    </div>
  )
}
