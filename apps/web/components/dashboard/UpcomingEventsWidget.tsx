'use client'

import Link from 'next/link'
import { type CalendarEvent } from '@kinnect/core'
import { Calendar } from 'lucide-react'

interface UpcomingEventsWidgetProps {
  events: CalendarEvent[]
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

export default function UpcomingEventsWidget({ events }: UpcomingEventsWidgetProps) {
  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-brand-primary">
            <Calendar className="h-5 w-5 text-brand-accent" />
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
          <p className="text-gray-400 text-sm font-medium py-2">
            No upcoming events this week.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 p-2 -mx-2 hover:bg-gray-50 rounded-xl transition-colors"
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
    </div>
  )
}
