'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCalendarEvents, deleteCalendarEvent, getSAHolidays, formatEventTime, toLocaleDateStr, type CalendarEvent, type SAHoliday } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import toast from 'react-hot-toast'
import CreateEventModal from '@/components/CreateEventModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import logger from '@/lib/logger'
import { ChevronLeft, ChevronRight, Plus, Calendar, List, MapPin, Clock } from 'lucide-react'

// ── constants ──────────────────────────────────────────────

const EVENT_BAR_H = 20
const EVENT_BAR_GAP = 3
const DAY_NUM_H = 32
const HOUR_H = 64        // px per hour in time-based views
const TIME_COL_W = 48    // px for time-label column
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_LABELS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAY_SHORT    = ['S','M','T','W','T','F','S']

// ── helpers ────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function startDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/** Sun–Sat dates for the week containing `date` */
function getWeekDates(date: Date): Date[] {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  const sun = new Date(base)
  sun.setDate(base.getDate() - base.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun); d.setDate(sun.getDate() + i); return d
  })
}

/** Top-offset in the time grid for a given ISO datestring */
function timeTop(dateStr: string): number {
  const d = new Date(dateStr)
  return (d.getHours() + d.getMinutes() / 60) * HOUR_H
}

/** Block height for a timed event (min 28 px) */
function eventHeight(start: string, end: string): number {
  const ms = new Date(end || start).getTime() - new Date(start).getTime()
  return Math.max((ms / 3_600_000) * HOUR_H - 2, 28)
}

/**
 * Assigns non-overlapping column slots to events in the same day column.
 * Returns each event tagged with `col` (0-indexed) and `totalCols`.
 */
function layoutTimed(
  evs: CalendarEvent[]
): { ev: CalendarEvent; col: number; totalCols: number }[] {
  if (!evs.length) return []
  const sorted = [...evs].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  const cols: number[] = []
  const ends: number[] = []
  for (const ev of sorted) {
    const s = new Date(ev.start_time).getTime()
    const e = new Date(ev.end_time || ev.start_time).getTime() + 30 * 60_000
    let c = ends.findIndex(t => t <= s)
    if (c === -1) { c = ends.length; ends.push(e) } else ends[c] = e
    cols.push(c)
  }
  const total = Math.max(...cols) + 1
  return sorted.map((ev, i) => ({ ev, col: cols[i], totalCols: total }))
}

// ── types ──────────────────────────────────────────────────

interface SpanLayout {
  event: CalendarEvent
  colStart: number; colEnd: number; slot: number
  continuesLeft: boolean; continuesRight: boolean
}

// ── layout algorithm (multi-day spans) ─────────────────────

function assignSlots(raw: Omit<SpanLayout, 'slot'>[]): SpanLayout[] {
  const occ: { slot: number; s: number; e: number }[] = []
  return raw.map(span => {
    let slot = 0
    while (occ.some(o => o.slot === slot && o.s <= span.colEnd && o.e >= span.colStart)) slot++
    occ.push({ slot, s: span.colStart, e: span.colEnd })
    return { ...span, slot }
  })
}

/** Month view week row: multi-day spans + per-day single events */
function computeMonthWeek(
  week: (number | null)[],
  events: CalendarEvent[],
  year: number,
  month: number
): { multiDay: SpanLayout[]; singleDay: Map<number, CalendarEvent[]> } {
  const colDates = week.map(d => d !== null ? new Date(year, month, d) : null)
  const valid = colDates.filter(Boolean) as Date[]
  if (!valid.length) return { multiDay: [], singleDay: new Map() }
  const first = valid[0], last = valid[valid.length - 1]
  const raw: Omit<SpanLayout, 'slot'>[] = []
  const singleDay = new Map<number, CalendarEvent[]>()

  for (const ev of events) {
    // Use UTC date components: events are stored as naive local strings (no offset),
    // so Postgres treats them as UTC. getUTC* gives the intended calendar date,
    // avoiding local-timezone rollover (e.g. T23:59:59Z → April 17 local in UTC+2).
    const sRaw = new Date(ev.start_time)
    const eRaw = new Date(ev.end_time || ev.start_time)
    const s0 = new Date(sRaw.getUTCFullYear(), sRaw.getUTCMonth(), sRaw.getUTCDate())
    const e0 = new Date(eRaw.getUTCFullYear(), eRaw.getUTCMonth(), eRaw.getUTCDate())
    if (s0 > last || e0 < first) continue
    if (e0.getTime() > s0.getTime()) {
      let cs = -1, ce = -1
      for (let c = 0; c < 7; c++) {
        const d = colDates[c]; if (!d) continue
        if (d >= s0 && d <= e0) { if (cs === -1) cs = c; ce = c }
      }
      if (cs === -1) continue
      raw.push({ event: ev, colStart: cs, colEnd: ce, continuesLeft: s0 < first, continuesRight: e0 > last })
    } else {
      for (let c = 0; c < 7; c++) {
        const d = colDates[c]; if (!d) continue
        if (d.getTime() === s0.getTime()) {
          const n = week[c]!
          if (!singleDay.has(n)) singleDay.set(n, [])
          singleDay.get(n)!.push(ev); break
        }
      }
    }
  }
  return { multiDay: assignSlots(raw), singleDay }
}

/** Week/day view: all-day + multi-day spans across a set of dates */
function computeAllDaySpans(dates: Date[], events: CalendarEvent[]): SpanLayout[] {
  const first = new Date(dates[0]); first.setHours(0, 0, 0, 0)
  const last  = new Date(dates[dates.length - 1]); last.setHours(23, 59, 59, 999)
  const raw: Omit<SpanLayout, 'slot'>[] = []
  for (const ev of events) {
    const sRaw = new Date(ev.start_time)
    const eRaw = new Date(ev.end_time || ev.start_time)
    const s0 = new Date(sRaw.getUTCFullYear(), sRaw.getUTCMonth(), sRaw.getUTCDate())
    const e0 = new Date(eRaw.getUTCFullYear(), eRaw.getUTCMonth(), eRaw.getUTCDate())
    const isMulti = e0.getTime() > s0.getTime() || ev.all_day
    if (!isMulti || s0 > last || e0 < first) continue
    let cs = -1, ce = -1
    for (let c = 0; c < dates.length; c++) {
      const d = new Date(dates[c]); d.setHours(0, 0, 0, 0)
      if (d >= s0 && d <= e0) { if (cs === -1) cs = c; ce = c }
    }
    if (cs === -1) continue
    raw.push({ event: ev, colStart: cs, colEnd: ce, continuesLeft: s0 < first, continuesRight: e0 > last })
  }
  return assignSlots(raw)
}

// ── span bar renderer (shared) ─────────────────────────────

function SpanBar({
  span, totalCols, topOffset, onEdit,
}: {
  span: SpanLayout; totalCols: number; topOffset: number
  onEdit: (ev: CalendarEvent) => void
}) {
  const mL = span.continuesLeft ? 0 : 3
  const mR = span.continuesRight ? 0 : 3
  const left = `calc(${(span.colStart / totalCols) * 100}% + ${mL}px)`
  const width = `calc(${((span.colEnd - span.colStart + 1) / totalCols) * 100}% - ${mL + mR}px)`
  const top = topOffset + span.slot * (EVENT_BAR_H + EVENT_BAR_GAP) + 2
  const round =
    span.continuesLeft && span.continuesRight ? 'rounded-none'
    : span.continuesLeft  ? 'rounded-l-none rounded-r-full'
    : span.continuesRight ? 'rounded-l-full rounded-r-none'
    : 'rounded-full'
  return (
    <div
      className={`absolute flex items-center text-white text-[11px] font-semibold cursor-pointer z-10 overflow-hidden select-none ${round}`}
      style={{ left, width, top, height: EVENT_BAR_H, background: 'linear-gradient(90deg,#fb7185,#f43f5e)' }}
      onClick={e => { e.stopPropagation(); onEdit(span.event) }}
      title={span.event.title}
    >
      <span className="px-2 truncate">{span.continuesLeft ? '↩ ' : ''}{span.event.title}</span>
    </div>
  )
}

// ── timed event block (shared) ─────────────────────────────

function TimedBlock({
  ev, col, totalCols, onEdit,
}: {
  ev: CalendarEvent; col: number; totalCols: number
  onEdit: (ev: CalendarEvent) => void
}) {
  const top    = timeTop(ev.start_time)
  const height = eventHeight(ev.start_time, ev.end_time || ev.start_time)
  return (
    <div
      className="absolute rounded-lg px-2 py-0.5 cursor-pointer overflow-hidden hover:brightness-95 transition-all z-10"
      style={{
        top, height,
        left:  `calc(${(col / totalCols) * 100}% + 3px)`,
        width: `calc(${(1 / totalCols) * 100}% - 6px)`,
        background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
        borderLeft: '3px solid #6366f1',
      }}
      onClick={e => { e.stopPropagation(); onEdit(ev) }}
      title={ev.title}
    >
      <p className="text-[11px] font-bold text-primary-800 truncate leading-tight">{ev.title}</p>
      {height >= 40 && (
        <p className="text-[10px] text-primary-500 truncate">
          {formatEventTime(ev.start_time)}{ev.end_time ? ` – ${formatEventTime(ev.end_time)}` : ''}
        </p>
      )}
    </div>
  )
}

// ── time grid skeleton (shared by day + week) ───────────────

function TimeGrid({ children, scrollRef }: { children: React.ReactNode; scrollRef?: React.RefObject<HTMLDivElement> }) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: 560 }} ref={scrollRef}>
      <div className="relative" style={{ height: 24 * HOUR_H, minHeight: 24 * HOUR_H }}>
        {/* Hour lines */}
        {HOURS.map(h => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-gray-50 pointer-events-none"
            style={{ top: h * HOUR_H }}
          />
        ))}
        {children}
      </div>
    </div>
  )
}

// ── page component ─────────────────────────────────────────

type CalView = 'month' | 'week' | 'day' | 'agenda'

export default function CalendarPage() {
  const router = useRouter()
  const { user } = useUser()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const timeGridRef = useRef<HTMLDivElement>(null)
  // Index range (year*12+month) of the 3-month window currently in `events`.
  // Navigation within this window skips the fetch entirely — instant rendering.
  const loadedRange = useRef<{ min: number; max: number } | null>(null)

  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [view, setView]   = useState<CalView>('month')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [eventToDelete, setEventToDelete] = useState<string | null>(null)

  // ── data ──────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    if (!user.family_id) { router.push('/onboarding'); return }
    setLoading(false)
  }, [user?.family_id])

  useEffect(() => { if (user?.family_id) loadEvents() }, [user, year, month])

  // Scroll to ~7am when entering time-based views
  useEffect(() => {
    if ((view === 'day' || view === 'week') && timeGridRef.current) {
      timeGridRef.current.scrollTop = 7 * HOUR_H - 30
    }
  }, [view])

  // Sync year/month when day/week navigation crosses a month boundary
  useEffect(() => {
    if (view !== 'day' && view !== 'week') return
    const cy = currentDate.getFullYear(), cm = currentDate.getMonth()
    if (cy !== year || cm !== month) { setYear(cy); setMonth(cm) }
  }, [currentDate, view])

  const loadEvents = useCallback(async (force = false) => {
    if (!user?.family_id) return
    const idx = year * 12 + month
    // Skip fetch when the target month is already inside the loaded 3-month window.
    // Force=true bypasses this (used after create/delete and realtime reloads so
    // mutations are always reflected even without navigating away).
    if (!force && loadedRange.current && idx >= loadedRange.current.min && idx <= loadedRange.current.max) return
    try {
      // 3-month window: full previous month + current + full next month.
      // Adjacent-month navigation is instant — no fetch, no blank period.
      const start = toLocaleDateStr(new Date(year, month - 1, 1))
      const end   = toLocaleDateStr(new Date(year, month + 2, 0)) // day 0 = last day of month+1
      const data  = await getCalendarEvents(user.family_id, start, end)
      setEvents(data)
      loadedRange.current = { min: idx - 1, max: idx + 1 }
    } catch (err) { logger.error('Error loading events', err) }
  }, [user?.family_id, year, month])

  const reloadEvents = useCallback(() => loadEvents(true), [loadEvents])
  const broadcast = useRealtimeSync(user?.family_id, { calendar_events: reloadEvents })

  async function handleDelete(id: string) {
    try {
      await deleteCalendarEvent(id); await reloadEvents(); broadcast('calendar_events')
    } catch (err) { logger.error('Error deleting event', err); toast.error('Failed to delete event') }
  }

  // ── navigation ────────────────────────────────────────

  function switchView(v: CalView) {
    if ((v === 'day' || v === 'week') && (view === 'month' || view === 'agenda')) {
      const target = selectedDay ? new Date(year, month, selectedDay) : new Date()
      setCurrentDate(target)
    }
    if ((v === 'month' || v === 'agenda') && (view === 'day' || view === 'week')) {
      setYear(currentDate.getFullYear()); setMonth(currentDate.getMonth())
    }
    setView(v)
  }

  const prevMonth = () => { setSelectedDay(null); month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1) }
  const nextMonth = () => { setSelectedDay(null); month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1) }
  const prevDay   = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  const nextDay   = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
  const prevWeek  = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek  = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })

  function goToToday() {
    if (view === 'month' || view === 'agenda') {
      setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate())
    } else {
      setCurrentDate(new Date())
    }
  }

  function openCreate(dateStr?: string) {
    setEditingEvent(null); setDefaultDate(dateStr); setShowCreateEvent(true)
  }
  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev); setDefaultDate(undefined); setShowCreateEvent(true)
  }

  // ── derived ───────────────────────────────────────────

  const isToday  = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()

  function eventsOnDate(date: Date): CalendarEvent[] {
    const s = new Date(date); s.setHours(0, 0, 0, 0)
    const e = new Date(date); e.setHours(23, 59, 59, 999)
    return events.filter(ev => new Date(ev.start_time) <= e && new Date(ev.end_time || ev.start_time) >= s)
  }

  // Banner count: only events whose start_time falls in the displayed month
  // (events[] includes a ±7-day buffer, so raw .length would be inaccurate)
  const eventsThisMonth = useMemo(() =>
    events.filter(ev => {
      const d = new Date(ev.start_time)
      return d.getFullYear() === year && d.getMonth() === month
    }).length
  , [events, year, month])

  // SA public holidays for the visible year range (±1 for boundary weeks)
  const holidays = useMemo<SAHoliday[]>(() => [
    ...getSAHolidays(year - 1),
    ...getSAHolidays(year),
    ...getSAHolidays(year + 1),
  ], [year])

  function holidayOnDate(date: Date): SAHoliday | undefined {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return holidays.find(h => h.date === key)
  }

  // Month grid
  const totalDays = daysInMonth(year, month)
  const startDay  = startDayOfMonth(year, month)
  const isCurMon  = year === today.getFullYear() && month === today.getMonth()
  const cells     = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  // Week view dates
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  // Agenda grouping (events + holidays in the current month)
  const groupedEvents = useMemo(() => {
    const map = new Map<string, { label: string; evs: CalendarEvent[]; holiday?: SAHoliday }>()

    for (const ev of events) {
      const d = new Date(ev.start_time)
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!map.has(key)) map.set(key, {
        label: d.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        evs: [],
      })
      map.get(key)!.evs.push(ev)
    }

    // Weave in holidays for this month
    for (const h of holidays) {
      const d = new Date(h.date + 'T00:00:00')
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      if (!map.has(h.date)) map.set(h.date, {
        label: d.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        evs: [],
      })
      map.get(h.date)!.holiday = h
    }

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [events, holidays, year, month])

  // ── render ───────────────────────────────────────────

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-44 bg-gray-200 rounded-[2rem]" />
      <div className="h-8 w-52 bg-gray-100 rounded-xl mx-auto" />
      <div className="grid grid-cols-7">{Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 border border-white" />)}</div>
    </div>
  )
  if (!user?.family_id) return null

  // ── shared event detail card (in day-detail panel / agenda) ──
  function EventCard({ ev }: { ev: CalendarEvent }) {
    return (
      <div className="px-5 py-4 flex items-start justify-between hover:bg-gray-50/50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-accent-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {ev.all_day ? 'All day' : `${formatEventTime(ev.start_time)} – ${formatEventTime(ev.end_time)}`}
            </span>
            {ev.location && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" />{ev.location}</span>}
          </div>
          {ev.description && <p className="text-sm text-gray-500 mt-1.5">{ev.description}</p>}
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => setEventToDelete(ev.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    )
  }

  // ── banner nav ─────────────────────────────────────────

  function BannerNav() {
    const navBtn = "p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors flex items-center justify-center"
    const todayBtn = "text-xs px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-primary-200 font-semibold transition-colors"
    if (view === 'month' || view === 'agenda') {
      return (
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className={navBtn}><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-brand-primary">{MONTH_NAMES[month]} {year}</h2>
            {!isCurMon && <button onClick={goToToday} className={todayBtn}>Today</button>}
          </div>
          <button onClick={nextMonth} className={navBtn}><ChevronRight className="w-4 h-4 text-gray-600" /></button>
        </div>
      )
    }
    if (view === 'day') {
      const label = currentDate.toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      return (
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className={navBtn}><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-brand-primary">{label}</h2>
            {!isToday(currentDate) && <button onClick={goToToday} className={todayBtn}>Today</button>}
          </div>
          <button onClick={nextDay} className={navBtn}><ChevronRight className="w-4 h-4 text-gray-600" /></button>
        </div>
      )
    }
    // week
    const s = weekDates[0], e = weekDates[6]
    const sameMonth = s.getMonth() === e.getMonth()
    const label = sameMonth
      ? `${s.toLocaleDateString('en-ZA', { month: 'long' })} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`
      : `${s.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}, ${s.getFullYear()}`
    const hasToday = weekDates.some(d => isToday(d))
    return (
      <div className="flex items-center gap-2">
        <button onClick={prevWeek} className={navBtn}><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-brand-primary">{label}</h2>
          {!hasToday && <button onClick={goToToday} className={todayBtn}>Today</button>}
        </div>
        <button onClick={nextWeek} className={navBtn}><ChevronRight className="w-4 h-4 text-gray-600" /></button>
      </div>
    )
  }

  const nowTop = timeTop(today.toISOString())

  // ─────────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-0 pb-8 space-y-4">
      {/* ── Banner ──────────────────────────────── */}
      <div
        className="rounded-[1.5rem] px-5 py-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #3730a3 100%)',
          boxShadow: '0 8px 32px -4px rgb(49 46 129 / 0.35), 0 2px 8px -2px rgb(49 46 129 / 0.2)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Calendar</h1>
              <p className="text-indigo-300 text-sm font-medium mt-0.5">
                {eventsThisMonth} event{eventsThisMonth !== 1 ? 's' : ''} this month
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreate()}
            className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden min-[360px]:inline">Add Event</span>
          </button>
        </div>
      </div>

      <div>
        {/* ── View Toggle + Nav row ──────────────── */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <BannerNav />
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1">
          {(['month','week','day','agenda'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                view === v ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'agenda' ? <List className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          </div>
        </div>

        {/* ═══════════════ MONTH VIEW ═══════════════ */}
        {view === 'month' && (
          <>
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider py-2">{d}</div>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {weeks.map((week, wi) => {
                const { multiDay, singleDay } = computeMonthWeek(week, events, year, month)
                const maxSlot = multiDay.reduce((m, s) => Math.max(m, s.slot), -1)
                const barsH   = maxSlot >= 0 ? (maxSlot + 1) * (EVENT_BAR_H + EVENT_BAR_GAP) + 4 : 0
                return (
                  <div key={wi} className={`relative grid grid-cols-7 ${wi > 0 ? 'border-t border-gray-100' : ''}`}>
                    {week.map((day, col) => {
                      const today_ = isCurMon && day === today.getDate()
                      const sel    = selectedDay === day
                      const pills  = day ? (singleDay.get(day) ?? []) : []
                      const holiday = day ? holidayOnDate(new Date(year, month, day)) : undefined
                      return (
                        <div
                          key={col}
                          onClick={() => day && setSelectedDay(sel ? null : day)}
                          className={`${col > 0 ? 'border-l border-gray-100' : ''} transition-colors ${
                            !day ? 'bg-gray-50/40' : sel ? 'bg-primary-50/70 cursor-pointer' : 'hover:bg-gray-50/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-end pr-2 pt-1.5" style={{ height: DAY_NUM_H }}>
                            {day && (
                              <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                                today_ ? 'bg-accent-500 text-white font-bold'
                                : sel   ? 'bg-primary-100 text-primary-700 font-semibold'
                                : 'text-gray-600'
                              }`}>{day}</span>
                            )}
                          </div>
                          <div style={{ height: barsH }} />
                          <div className="px-1 pb-1.5 space-y-0.5 min-h-[20px]">
                            {holiday && (
                              <div
                                className="text-[10px] truncate rounded-md px-1.5 py-0.5 bg-amber-50 text-amber-700 font-medium border border-amber-200/60"
                                title={holiday.name}
                              >
                                🇿🇦 {holiday.name}
                              </div>
                            )}
                            {pills.slice(0, holiday ? 1 : 2).map(ev => (
                              <div
                                key={ev.id}
                                onClick={e => { e.stopPropagation(); openEdit(ev) }}
                                className="text-[10px] truncate rounded-md px-1.5 py-0.5 bg-primary-100 text-primary-700 cursor-pointer hover:bg-primary-200 transition-colors font-medium"
                                title={ev.title}
                              >
                                {!ev.all_day && <span className="opacity-60 mr-1">{formatEventTime(ev.start_time)}</span>}
                                {ev.title}
                              </div>
                            ))}
                            {pills.length > (holiday ? 1 : 2) && <div className="text-[10px] text-gray-400 px-1 font-medium">+{pills.length - (holiday ? 1 : 2)} more</div>}
                          </div>
                        </div>
                      )
                    })}
                    {multiDay.map((span, si) => <SpanBar key={si} span={span} totalCols={7} topOffset={DAY_NUM_H} onEdit={openEdit} />)}
                  </div>
                )
              })}
            </div>

            {/* Selected day panel */}
            {selectedDay !== null && (
              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
                <div className="px-5 py-4 bg-primary-50/50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-primary-900">{MONTH_NAMES[month]} {selectedDay}, {year}</h3>
                  <button
                    onClick={() => openCreate(toLocaleDateStr(new Date(year, month, selectedDay)))}
                    className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-semibold"
                  >
                    <Plus className="w-4 h-4" />Add event
                  </button>
                </div>
                {(() => {
                  const dayDate = new Date(year, month, selectedDay)
                  const dayHoliday = holidayOnDate(dayDate)
                  const dayEvs = eventsOnDate(dayDate)
                  return (
                    <>
                      {dayHoliday && (
                        <div className="px-5 py-3 flex items-center gap-2.5 bg-amber-50/60 border-b border-amber-100/60">
                          <span className="text-base">🇿🇦</span>
                          <div>
                            <p className="text-sm font-bold text-amber-800">{dayHoliday.name}</p>
                            <p className="text-xs text-amber-600/70">South African public holiday</p>
                          </div>
                        </div>
                      )}
                      {dayEvs.length === 0 && !dayHoliday
                        ? <div className="px-5 py-8 text-center"><p className="text-gray-400 text-sm">No events on this day.</p></div>
                        : dayEvs.length > 0 && <div className="divide-y divide-gray-50">{dayEvs.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
                      }
                    </>
                  )
                })()}
              </div>
            )}
          </>
        )}

        {/* ═══════════════ WEEK VIEW ═══════════════ */}
        {view === 'week' && (() => {
          const allDaySpans = computeAllDaySpans(weekDates, events)
          const maxADSlot   = allDaySpans.reduce((m, s) => Math.max(m, s.slot), -1)
          const allDayH     = maxADSlot >= 0 ? (maxADSlot + 1) * (EVENT_BAR_H + EVENT_BAR_GAP) + 12 : 0
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Day headers */}
              <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(7,1fr)` }}>
                <div className="border-r border-gray-100" />
                {weekDates.map((d, col) => {
                  const tod = isToday(d)
                  const wkHoliday = holidayOnDate(d)
                  return (
                    <div
                      key={col}
                      className={`py-2 text-center cursor-pointer hover:bg-gray-50 transition-colors ${col > 0 ? 'border-l border-gray-100' : ''} ${wkHoliday ? 'bg-amber-50/40' : ''}`}
                      onClick={() => { setCurrentDate(d); setView('day') }}
                    >
                      <div className={`text-[11px] font-bold uppercase tracking-wider ${tod ? 'text-accent-500' : 'text-gray-400'}`}>{DAY_SHORT[col]}</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-0.5 text-sm font-bold ${tod ? 'bg-accent-500 text-white' : 'text-gray-700'}`}>
                        {d.getDate()}
                      </div>
                      {wkHoliday && (
                        <div className="px-1 mt-0.5">
                          <span className="text-[9px] text-amber-600 font-semibold leading-tight block truncate" title={wkHoliday.name}>
                            🇿🇦 {wkHoliday.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* All-day row */}
              {allDayH > 0 && (
                <div className="relative border-b border-gray-100" style={{ height: allDayH }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `${TIME_COL_W}px 1fr` }}>
                    <div className="flex items-start justify-end pr-2 pt-1.5 border-r border-gray-100">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">all day</span>
                    </div>
                    <div className="relative">
                      {allDaySpans.map((span, si) => <SpanBar key={si} span={span} totalCols={7} topOffset={4} onEdit={openEdit} />)}
                    </div>
                  </div>
                </div>
              )}

              {/* Time grid */}
              <TimeGrid scrollRef={timeGridRef}>
                {/* Time labels */}
                {HOURS.map(h => (
                  <div key={h} className="absolute flex items-start justify-end pr-2 pointer-events-none" style={{ top: h * HOUR_H, width: TIME_COL_W, height: HOUR_H }}>
                    {h > 0 && <span className="text-[10px] text-gray-300 font-medium leading-none mt-0.5">{h}:00</span>}
                  </div>
                ))}

                {/* Vertical column separator */}
                <div className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: TIME_COL_W }} />

                {/* Day columns */}
                {weekDates.map((d, col) => {
                  const timedEvs = eventsOnDate(d).filter(ev => !ev.all_day)
                  const layout   = layoutTimed(timedEvs)
                  const todayCol = isToday(d)
                  return (
                    <div
                      key={col}
                      className={`absolute top-0 bottom-0 ${todayCol ? 'bg-primary-50/30' : ''}`}
                      style={{
                        left:  `calc(${TIME_COL_W}px + ${col} * (100% - ${TIME_COL_W}px) / 7)`,
                        width: `calc((100% - ${TIME_COL_W}px) / 7)`,
                        borderLeft: col > 0 ? '1px solid #f9fafb' : 'none',
                      }}
                      onClick={() => openCreate(toLocaleDateStr(d))}
                    >
                      {layout.map(({ ev, col: ec, totalCols: tc }, idx) => (
                        <TimedBlock key={ev.id + idx} ev={ev} col={ec} totalCols={tc} onEdit={openEdit} />
                      ))}
                      {/* Current time indicator */}
                      {todayCol && (
                        <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
                          <div className="w-2.5 h-2.5 rounded-full bg-accent-500 -ml-1.5 shrink-0" />
                          <div className="flex-1 h-0.5 bg-accent-500" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </TimeGrid>
            </div>
          )
        })()}

        {/* ═══════════════ DAY VIEW ════════════════ */}
        {view === 'day' && (() => {
          const dayEvs    = eventsOnDate(currentDate)
          const allDayEvs = dayEvs.filter(ev => ev.all_day)
          const timedEvs  = dayEvs.filter(ev => !ev.all_day)
          const layout    = layoutTimed(timedEvs)
          const dayHoliday = holidayOnDate(currentDate)
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Public holiday banner */}
              {dayHoliday && (
                <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-100/60 flex items-center gap-2.5">
                  <span className="text-base">🇿🇦</span>
                  <div>
                    <span className="text-sm font-bold text-amber-800">{dayHoliday.name}</span>
                    <span className="text-xs text-amber-600/70 ml-2">Public holiday</span>
                  </div>
                </div>
              )}
              {/* All-day events */}
              {allDayEvs.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">All day</span>
                  {allDayEvs.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => openEdit(ev)}
                      className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer text-white"
                      style={{ background: 'linear-gradient(90deg,#fb7185,#f43f5e)' }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              )}

              {/* Time grid */}
              <TimeGrid scrollRef={timeGridRef}>
                {/* Time labels */}
                {HOURS.map(h => (
                  <div key={h} className="absolute flex items-start justify-end pr-2 pointer-events-none z-10" style={{ top: h * HOUR_H, width: TIME_COL_W, height: HOUR_H }}>
                    {h > 0 && <span className="text-[10px] text-gray-300 font-medium leading-none mt-0.5">{h}:00</span>}
                  </div>
                ))}

                {/* Clickable hour slots */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute cursor-pointer hover:bg-gray-50/60 transition-colors"
                    style={{ top: h * HOUR_H, height: HOUR_H, left: TIME_COL_W, right: 0 }}
                    onClick={() => {
                      const d = new Date(currentDate); d.setHours(h, 0, 0, 0)
                      openCreate(`${toLocaleDateStr(currentDate)}T${String(h).padStart(2,'0')}:00`)
                    }}
                  />
                ))}

                {/* Events */}
                {layout.map(({ ev, col: ec, totalCols: tc }, idx) => (
                  <div
                    key={ev.id + idx}
                    className="absolute rounded-lg px-2 py-1 cursor-pointer overflow-hidden hover:brightness-95 transition-all z-10"
                    style={{
                      top: timeTop(ev.start_time),
                      height: eventHeight(ev.start_time, ev.end_time || ev.start_time),
                      left:  `calc(${TIME_COL_W}px + (100% - ${TIME_COL_W}px - 8px) * ${ec} / ${tc} + 4px)`,
                      width: `calc((100% - ${TIME_COL_W}px - 8px) / ${tc})`,
                      background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
                      borderLeft: '3px solid #6366f1',
                    }}
                    onClick={e => { e.stopPropagation(); openEdit(ev) }}
                    title={ev.title}
                  >
                    <p className="text-[11px] font-bold text-primary-800 truncate leading-tight">{ev.title}</p>
                    <p className="text-[10px] text-primary-500 truncate">
                      {formatEventTime(ev.start_time)}{ev.end_time ? ` – ${formatEventTime(ev.end_time)}` : ''}
                    </p>
                  </div>
                ))}

                {/* Current time indicator */}
                {isToday(currentDate) && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
                    <div className="shrink-0" style={{ width: TIME_COL_W }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-500 -ml-1.5 shrink-0" />
                    <div className="flex-1 h-0.5 bg-accent-500" />
                  </div>
                )}
              </TimeGrid>
            </div>
          )
        })()}

        {/* ═══════════════ AGENDA VIEW ══════════════ */}
        {view === 'agenda' && (
          groupedEvents.length === 0
            ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No events this month</p>
                <button onClick={() => openCreate()} className="mt-4 text-sm text-accent-600 hover:text-accent-700 font-semibold">+ Add your first event</button>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedEvents.map(({ label, evs, holiday }) => (
                  <div key={label}>
                    <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2 px-1">{label}</h3>
                    <div className="space-y-2">
                      {holiday && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200/60">
                          <span className="text-lg">🇿🇦</span>
                          <div>
                            <p className="text-sm font-bold text-amber-800">{holiday.name}</p>
                            <p className="text-xs text-amber-600/70">South African public holiday</p>
                          </div>
                        </div>
                      )}
                      {evs.map(ev => (
                        <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                          <EventCard ev={ev} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
        )}
      </div>

      {/* ── Modals ──────────────────────────────── */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => { setShowCreateEvent(false); setEditingEvent(null) }}
        familyId={user.family_id}
        userId={user.id}
        onEventCreated={() => { reloadEvents(); broadcast('calendar_events') }}
        defaultDate={defaultDate}
        event={editingEvent}
      />
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => { if (eventToDelete) handleDelete(eventToDelete) }}
        title="Delete event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
