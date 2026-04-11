'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type CalendarEvent } from '@kinnect/core'
import { Calendar, Clock, MapPin, Plus, X } from 'lucide-react'
import { formatEventDate, formatEventTime } from '@/lib/formatters'

interface UpcomingEventsWidgetProps {
  events: CalendarEvent[]
  onCreateEvent?: () => void
}

const EVENT_DOT_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-emerald-400',
  'bg-amber-400',
]

export default function UpcomingEventsWidget({ events, onCreateEvent }: UpcomingEventsWidgetProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            This Week
          </h2>
          <Link
            href="/dashboard/calendar"
            className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            View Calendar
          </Link>
        </div>
      </div>

      <div className="px-6 py-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No events this week</p>
            {onCreateEvent ? (
              <button
                onClick={onCreateEvent}
                className="text-brand-accent text-sm font-bold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add an event
              </button>
            ) : (
              <Link
                href="/dashboard/calendar"
                className="text-brand-accent text-sm font-bold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add an event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event, i) => (
              <button
                key={event.id}
                className="w-full flex items-center gap-3 p-3 -mx-1 hover:bg-gray-50/80 rounded-xl transition-colors text-left group"
                onClick={() => setSelectedEvent(event)}
              >
                {/* Colored dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${EVENT_DOT_COLORS[i % EVENT_DOT_COLORS.length]}`} />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-brand-primary group-hover:text-brand-accent transition-colors truncate">
                    {event.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{formatEventDate(event.start_time)}</span>
                    {!event.all_day && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span>{formatEventTime(event.start_time)}</span>
                      </>
                    )}
                    {event.location && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="truncate">{event.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Add event CTA (when events exist) */}
        {events.length > 0 && onCreateEvent && (
          <div className="mt-3 pt-3 border-t border-gray-100/70">
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-1 text-sm font-bold text-brand-accent hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        )}
      </div>

      {/* Event Detail Sheet */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-base font-bold text-brand-primary leading-snug pr-2">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{formatEventDate(selectedEvent.start_time)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>
                  {selectedEvent.all_day
                    ? 'All day'
                    : `${formatEventTime(selectedEvent.start_time)} – ${formatEventTime(selectedEvent.end_time)}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="pt-2 mt-1 border-t border-gray-100">
                  <p className="text-sm text-gray-500">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Link
                href="/dashboard/calendar"
                className="block text-center px-4 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors"
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