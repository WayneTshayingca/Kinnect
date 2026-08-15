'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { type CalendarEvent, getSAHolidays, formatEventTime } from '@kinnect/core'
import { Calendar, Plus } from 'lucide-react'

interface WeekCalendarStripProps {
  events: CalendarEvent[]
  onCreateEvent?: () => void
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function WeekCalendarStrip({ events, onCreateEvent }: WeekCalendarStripProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = localDateStr(today)
  const [selectedStr, setSelectedStr] = useState(todayStr)

  const weekDays = useMemo(() => {
    const dow = today.getDay()
    const offset = -dow // shift to Sun
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + offset + i)
      return d
    })
  }, [today])

  const yr = today.getFullYear()
  const holidays = useMemo(
    () => [...getSAHolidays(yr), ...getSAHolidays(yr + 1)],
    [yr]
  )

  const eventDotDates = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) set.add(localDateStr(new Date(ev.start_time)))
    for (const h of holidays) {
      const d = new Date(h.date + 'T00:00:00')
      if (d >= weekDays[0] && d <= weekDays[6]) set.add(h.date)
    }
    return set
  }, [events, holidays, weekDays])

  const selectedEvents = useMemo(() =>
    events
      .filter(ev => localDateStr(new Date(ev.start_time)) === selectedStr)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [events, selectedStr]
  )
  const selectedHolidays = holidays.filter(h => h.date === selectedStr)
  const hasAnythingSelected = selectedEvents.length > 0 || selectedHolidays.length > 0

  const isSelectedToday = selectedStr === todayStr
  const selectedDay = weekDays.find(d => localDateStr(d) === selectedStr)
  const dayLabel = isSelectedToday
    ? 'today'
    : (selectedDay?.toLocaleDateString('en-ZA', { weekday: 'long' }) ?? '')

  return (
    <div
      className="rounded-[1.5rem] overflow-hidden flex flex-col md:h-full"
      style={{ background: 'white', boxShadow: '0 4px 20px rgba(49,46,129,0.10), 0 1px 6px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '13px 16px 11px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: '#312E81' }}>This Week</span>
        <Link
          href="/dashboard/calendar"
          style={{ fontSize: 12, fontWeight: 700, color: '#FB7185', textDecoration: 'none' }}
        >
          See all →
        </Link>
      </div>

      {/* Week strip */}
      <div className="flex justify-between shrink-0" style={{ padding: '13px 16px 9px' }}>
        {weekDays.map((day, i) => {
          const isToday = localDateStr(day) === todayStr
          const isSelected = localDateStr(day) === selectedStr
          const hasEvent = eventDotDates.has(localDateStr(day))
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          return (
            <button
              key={i}
              onClick={() => setSelectedStr(localDateStr(day))}
              className="flex flex-col items-center"
              style={{ gap: 3, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#a0a0c0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {DAY_LABELS[i]}
              </span>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isSelected ? '#312E81' : 'transparent',
                border: isToday && !isSelected ? '2px solid #312E81' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms ease',
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isSelected || isToday ? 800 : 600,
                  color: isSelected ? 'white' : isToday ? '#312E81' : isWeekend ? '#c4c4d8' : '#374151',
                }}>
                  {day.getDate()}
                </span>
              </div>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: hasEvent ? '#FB7185' : 'transparent',
              }} />
            </button>
          )
        })}
      </div>

      {/* Selected day's events */}
      <div
        className="flex-1"
        style={{ padding: '6px 16px 14px', borderTop: '1px solid rgba(0,0,0,0.04)' }}
      >
        {!hasAnythingSelected ? (
          <div className="flex items-center justify-between" style={{ paddingTop: 8 }}>
            <span style={{ fontSize: 12, color: '#a5a5b8', fontWeight: 500 }}>No events {dayLabel}</span>
            {onCreateEvent && (
              <button
                onClick={onCreateEvent}
                className="flex items-center gap-1"
                style={{ fontSize: 12, fontWeight: 700, color: '#FB7185', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Plus className="w-3 h-3" /> Add event
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8, paddingTop: 8 }}>
            {selectedHolidays.map(h => (
              <div key={h.date} className="flex items-center" style={{ gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: '#fef9ec',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 15,
                }}>
                  🎌
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: '#312E81', lineHeight: 1.3 }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: '#a5a5b8', marginTop: 1 }}>Public holiday · All day</div>
                </div>
              </div>
            ))}
            {selectedEvents.slice(0, 3).map(ev => (
              <div key={ev.id} className="flex items-center" style={{ gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'rgba(49,46,129,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Calendar style={{ width: 15, height: 15, color: '#312E81' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: '#312E81', lineHeight: 1.3 }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#a5a5b8', marginTop: 1 }}>
                    {ev.all_day ? 'All day' : formatEventTime(ev.start_time)}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </div>
                </div>
              </div>
            ))}
            {selectedEvents.length > 3 && (
              <Link
                href="/dashboard/calendar"
                style={{ fontSize: 11, fontWeight: 700, color: '#FB7185', textDecoration: 'none' }}
              >
                +{selectedEvents.length - 3} more →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
