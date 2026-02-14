'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type CalendarEvent } from '@kinnect/core'
import { Calendar, Clock, MapPin, Plus, X } from 'lucide-react'

interface UpcomingEventsWidgetProps {
  events: CalendarEvent[]
  onCreateEvent?: () => void
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
}

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function UpcomingEventsWidget({ events, onCreateEvent }: UpcomingEventsWidgetProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-brand-primary">
            <Calendar className="h-5 w-5 text-brand-accent" />
            This Week
          </h2>
          <div className="flex items-center gap-2">
            {onCreateEvent && (
              <button
                onClick={onCreateEvent}
                className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
            <Link
              href="/dashboard/calendar"
              className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              View Calendar
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">No upcoming events this week</p>
            {onCreateEvent ? (
              <button
                onClick={onCreateEvent}
                className="text-brand-accent text-sm font-bold mt-2 inline-block hover:underline"
              >
                Add an event
              </button>
            ) : (
              <Link
                href="/dashboard/calendar"
                className="text-brand-accent text-sm font-bold mt-2 inline-block hover:underline"
              >
                Add an event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 p-2 -mx-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="text-xs text-gray-500 font-medium min-w-[80px] pt-0.5">
                  {formatEventDate(event.start_time)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-brand-primary">
                    {event.title}
                  </div>
                  {!event.all_day && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatEventTime(event.start_time)}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-primary pr-4">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span>{formatEventDate(selectedEvent.start_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span>
                  {selectedEvent.all_day
                    ? 'All day'
                    : `${formatEventTime(selectedEvent.start_time)} – ${formatEventTime(selectedEvent.end_time)}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Link
                href="/dashboard/calendar"
                className="block text-center px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 transition-colors"
              >
                View in Calendar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
