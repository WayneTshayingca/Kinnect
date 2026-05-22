'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { type CalendarEvent, type SAHoliday, getSAHolidays } from '@kinnect/core'
import { Calendar, Clock, MapPin, Plus, X, Flag } from 'lucide-react'
import { formatEventDate, formatEventTime } from '@/lib/formatters'

interface UpcomingEventsWidgetProps {
  events: CalendarEvent[]
  onCreateEvent?: () => void
  variant?: 'bento'
}

type Item =
  | { kind: 'event';   event: CalendarEvent; dateMs: number }
  | { kind: 'holiday'; holiday: SAHoliday;   dateMs: number }

export default function UpcomingEventsWidget({ events, onCreateEvent, variant }: UpcomingEventsWidgetProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Merge family events with SA public holidays for the next 14 days
  const items = useMemo<Item[]>(() => {
    const now   = new Date(); now.setHours(0, 0, 0, 0)
    const end14 = new Date(now); end14.setDate(end14.getDate() + 14)

    // Holidays for current year + next year (covers Dec→Jan window)
    const yr = now.getFullYear()
    const allHolidays: SAHoliday[] = [...getSAHolidays(yr), ...getSAHolidays(yr + 1)]

    const holidayItems: Item[] = allHolidays
      .filter(h => {
        const d = new Date(h.date + 'T00:00:00')
        return d >= now && d <= end14
      })
      .map(h => ({ kind: 'holiday', holiday: h, dateMs: new Date(h.date + 'T00:00:00').getTime() }))

    const eventItems: Item[] = events.map(ev => ({
      kind: 'event',
      event: ev,
      dateMs: new Date(ev.start_time).getTime(),
    }))

    return [...eventItems, ...holidayItems].sort((a, b) => a.dateMs - b.dateMs)
  }, [events])

  if (variant === 'bento') {
    const visibleItems = items.slice(0, 2)
    return (
      <div className="rounded-[1.5rem] overflow-hidden h-full" style={{ background: '#312E81', padding: '12px 13px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Events
          </span>
          {onCreateEvent && (
            <button
              onClick={onCreateEvent}
              style={{ fontSize: 9, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, padding: '2px 7px', cursor: 'pointer' }}
            >
              + Add
            </button>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <div className="py-2 text-center">
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Nothing coming up</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {visibleItems.map((item, i) => {
              const color = item.kind === 'holiday' ? '#f59e0b' : '#818CF8'
              const title = item.kind === 'holiday' ? item.holiday.name : item.event.title
              const time = item.kind === 'holiday' ? 'All day' : (item.event.all_day ? 'All day' : formatEventTime(item.event.start_time))
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 2.5, height: 26, borderRadius: 9999, background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'white', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{title}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Event Detail Sheet (shared with default variant) */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEvent(null)}
          >
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-5">
                <h3 className="text-base font-bold text-primary-800">{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)} className="text-gray-300 hover:text-gray-500 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2.5 text-sm text-gray-600">
                <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 text-blue-400" /><span>{formatEventDate(selectedEvent.start_time)}</span></div>
                <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-blue-400" /><span>{selectedEvent.all_day ? 'All day' : `${formatEventTime(selectedEvent.start_time)} – ${formatEventTime(selectedEvent.end_time)}`}</span></div>
                {selectedEvent.location && <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-blue-400" /><span>{selectedEvent.location}</span></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            Upcoming
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
        {items.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Nothing coming up</p>
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
            {items.map((item, i) =>
              item.kind === 'holiday' ? (
                <div
                  key={`holiday-${item.holiday.date}`}
                  className="flex items-center gap-3 p-3 -mx-1 rounded-xl bg-amber-50/60"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-amber-800 truncate flex items-center gap-1.5">
                      <Flag className="w-3 h-3 shrink-0 text-amber-500" />
                      {item.holiday.name}
                    </div>
                    <div className="text-xs text-amber-600/70 mt-0.5">
                      {new Date(item.holiday.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                      {' · '}Public holiday
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  key={item.event.id}
                  className="w-full flex items-center gap-3 p-3 -mx-1 hover:bg-gray-50/80 rounded-xl transition-colors text-left group"
                  onClick={() => setSelectedEvent(item.event)}
                >
                  <div className="w-2 h-2 rounded-full shrink-0 bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-brand-primary group-hover:text-brand-accent transition-colors truncate">
                      {item.event.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{formatEventDate(item.event.start_time)}</span>
                      {!item.event.all_day && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span>{formatEventTime(item.event.start_time)}</span>
                        </>
                      )}
                      {item.event.location && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="truncate">{item.event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        )}

        {/* Add event CTA */}
        {items.length > 0 && onCreateEvent && (
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
