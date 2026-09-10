import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getSAHolidays,
  type CalendarEvent,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useScreenData } from '@/hooks/useScreenData'
import { BottomSheetModal } from '@/components/BottomSheetModal'
import { T } from '@/lib/theme'

// ── Date helpers ──────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
}

function formatEventTime(ev: CalendarEvent): string {
  if (ev.all_day) return 'All day'
  const d = new Date(ev.start_time)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function formatEventRange(ev: CalendarEvent): string {
  if (ev.all_day) return 'All day'
  const s = new Date(ev.start_time)
  const e = new Date(ev.end_time)
  const fmt = (d: Date) => d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(s)} – ${fmt(e)}`
}

// Returns all dates (YYYY-MM-DD) a multi-day event spans
function eventSpansDates(ev: CalendarEvent): Set<string> {
  const dates = new Set<string>()
  const start = new Date(ev.start_time); start.setHours(0, 0, 0, 0)
  const end = new Date(ev.end_time); end.setHours(23, 59, 59, 999)
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.add(dateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

// Build 6-week grid (42 cells) for the given month, starting Monday
function buildGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []

  for (let i = firstOffset; i > 0; i--) cells.push({ date: new Date(year, month, 1 - i), inMonth: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), inMonth: true })
  let next = 1
  while (cells.length < 42) cells.push({ date: new Date(year, month + 1, next++), inMonth: false })
  return cells
}

// ── Agenda event card ──────────────────────────────────────────────────────

function AgendaCard({
  ev,
  onDelete,
}: {
  ev: CalendarEvent
  onDelete: (id: string) => void
}) {
  function confirmDelete() {
    Alert.alert('Delete event', `Delete "${ev.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(ev.id) },
    ])
  }

  return (
    <View style={styles.agendaCard}>
      <View style={styles.agendaBar} />
      <View style={styles.agendaBody}>
        <Text style={styles.agendaTitle} numberOfLines={2}>{ev.title}</Text>
        <Text style={styles.agendaTime}>{formatEventRange(ev)}</Text>
        {ev.location ? <Text style={styles.agendaLocation} numberOfLines={1}>📍 {ev.location}</Text> : null}
        {ev.description ? <Text style={styles.agendaDesc} numberOfLines={2}>{ev.description}</Text> : null}
      </View>
      <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Create event modal ─────────────────────────────────────────────────────

function CreateEventModal({
  visible,
  initialDate,
  familyId,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean
  initialDate: string
  familyId: string
  userId: string
  onClose: () => void
  onCreated: (ev: CalendarEvent) => void
}) {
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (visible) {
      setTitle(''); setAllDay(false); setDate(initialDate)
      setStartTime('09:00'); setEndTime('10:00'); setLocation(''); setError('')
    }
  }, [visible, initialDate])

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('Date must be YYYY-MM-DD'); return }
    if (!allDay && !startTime.match(/^\d{2}:\d{2}$/)) { setError('Start time must be HH:MM'); return }
    if (!allDay && !endTime.match(/^\d{2}:\d{2}$/)) { setError('End time must be HH:MM'); return }

    const startISO = allDay ? `${date}T00:00:00` : `${date}T${startTime}:00`
    const endISO   = allDay ? `${date}T23:59:59` : `${date}T${endTime}:00`
    setError('')
    setSaving(true)
    try {
      const ev = await createCalendarEvent(
        familyId, title.trim(), startISO, endISO, userId,
        undefined, allDay, location.trim() || undefined
      )
      onCreated(ev)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal
      visible={visible}
      title="New event"
      error={error}
      submitting={saving}
      submitLabel="Save event"
      onClose={onClose}
      onSubmit={handleCreate}
      slideFrom={500}
    >
      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Event name"
        placeholderTextColor="#9CA3AF"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      {/* All day toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>All day</Text>
        <Switch
          value={allDay}
          onValueChange={setAllDay}
          trackColor={{ true: T.accent, false: '#E5E7EB' }}
          thumbColor="white"
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      {!allDay && (
        <View style={[styles.fieldRow, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Start</Text>
            <TextInput
              style={styles.textInput}
              placeholder="09:00"
              placeholderTextColor="#9CA3AF"
              value={startTime}
              onChangeText={setStartTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>End</Text>
            <TextInput
              style={styles.textInput}
              placeholder="10:00"
              placeholderTextColor="#9CA3AF"
              value={endTime}
              onChangeText={setEndTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      )}

      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Location (optional)</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Where is it?"
        placeholderTextColor="#9CA3AF"
        value={location}
        onChangeText={setLocation}
      />
    </BottomSheetModal>
  )
}

// ── Calendar screen ────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(today)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.family_id) return
    // Load current month ± 7 days buffer
    const start = new Date(year, month, 1); start.setDate(start.getDate() - 7)
    const end   = new Date(year, month + 1, 0); end.setDate(end.getDate() + 7)
    const data = await getCalendarEvents(user.family_id, start.toISOString(), end.toISOString())
    setEvents(data)
  }, [user?.family_id, year, month])

  const { loading, refreshing, reload, refresh } = useScreenData(user?.family_id, fetchData, ['calendar_events'])

  function prevMonth() {
    const d = new Date(year, month - 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
    setSelected(new Date(d.getFullYear(), d.getMonth(), 1))
  }
  function nextMonth() {
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
    setSelected(new Date(d.getFullYear(), d.getMonth(), 1))
  }
  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(today)
  }

  // Pre-compute event date sets for dot indicators
  const eventDateMap = useMemo(() => {
    const map = new Map<string, number>() // date → count
    for (const ev of events) {
      for (const ds of eventSpansDates(ev)) {
        map.set(ds, (map.get(ds) ?? 0) + 1)
      }
    }
    return map
  }, [events])

  // SA holidays for this year + next (for dots + agenda)
  const holidays = useMemo(() => [...getSAHolidays(year), ...getSAHolidays(year + 1)], [year])
  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h.name])), [holidays])

  // Events for the selected date
  const selectedStr = dateStr(selected)
  const dayEvents = useMemo(() => events.filter((ev) => eventSpansDates(ev).has(selectedStr))
    .sort((a, b) => {
      if (a.all_day && !b.all_day) return -1
      if (!a.all_day && b.all_day) return 1
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    }), [events, selectedStr])
  const dayHoliday = holidayMap.get(selectedStr)

  const grid = useMemo(() => buildGrid(year, month), [year, month])

  function handleDelete(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    deleteCalendarEvent(id).catch(() => reload(true))
  }

  function handleCreated(ev: CalendarEvent) {
    setEvents((prev) => [...prev, ev])
    // Auto-select the event's date
    setSelected(new Date(ev.start_time))
  }

  const selectedLabel = selected.toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday} activeOpacity={0.7}>
            <Text style={styles.monthLabel}>{monthLabel(year, month)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.dayHeaders}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Month grid */}
        {loading ? (
          <View style={styles.gridLoading}>
            <ActivityIndicator color={T.primary} />
          </View>
        ) : (
          <View style={styles.grid}>
            {grid.map((cell, i) => {
              const ds = dateStr(cell.date)
              const isToday = isSameDay(cell.date, today)
              const isSel = isSameDay(cell.date, selected)
              const hasEvents = (eventDateMap.get(ds) ?? 0) > 0
              const hasHoliday = holidayMap.has(ds)

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelected(cell.date)
                    if (!cell.inMonth) {
                      setYear(cell.date.getFullYear())
                      setMonth(cell.date.getMonth())
                    }
                  }}
                  activeOpacity={0.7}
                  style={styles.gridCell}
                >
                  <View style={[
                    styles.gridDay,
                    isSel && !isToday && styles.gridDaySelected,
                    isToday && styles.gridDayToday,
                  ]}>
                    <Text style={[
                      styles.gridDayText,
                      !cell.inMonth && styles.gridDayTextDim,
                      isSel && styles.gridDayTextSelected,
                      isToday && styles.gridDayTextToday,
                    ]}>
                      {cell.date.getDate()}
                    </Text>
                  </View>
                  {/* Dot indicators */}
                  <View style={styles.gridDots}>
                    {hasEvents && <View style={[styles.dot, { backgroundColor: T.accent }]} />}
                    {hasHoliday && <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      {/* ── Agenda ─────────────────────────────────────── */}
      <ScrollView
        style={styles.agenda}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.agendaContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={T.primary}
          />
        }
      >
        <Text style={styles.agendaDateLabel}>{selectedLabel}</Text>

        {/* Public holiday banner */}
        {dayHoliday && (
          <View style={styles.holidayBanner}>
            <Text style={styles.holidayFlag}>🇿🇦</Text>
            <View>
              <Text style={styles.holidayName}>{dayHoliday}</Text>
              <Text style={styles.holidayLabel}>Public holiday</Text>
            </View>
          </View>
        )}

        {/* Event cards */}
        {dayEvents.length > 0 ? (
          dayEvents.map((ev) => (
            <AgendaCard key={ev.id} ev={ev} onDelete={handleDelete} />
          ))
        ) : (
          <View style={styles.agendaEmpty}>
            <Text style={styles.agendaEmptyEmoji}>📭</Text>
            <Text style={styles.agendaEmptyText}>Nothing scheduled</Text>
            <Text style={styles.agendaEmptyHint}>Tap + to add an event</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ────────────────────────────────────────── */}
      {user?.family_id && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* ── Create modal ───────────────────────────────── */}
      {user?.family_id && user?.id && (
        <CreateEventModal
          visible={showCreate}
          initialDate={selectedStr}
          familyId={user.family_id}
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const CELL_SIZE = 38

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // ── Header / calendar ──────────────────────────────
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(49,46,129,0.06)',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 28,
    color: T.primary,
    lineHeight: 30,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: T.primary,
    letterSpacing: -0.3,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(49,46,129,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridLoading: {
    height: CELL_SIZE * 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  gridDay: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDayToday: {
    backgroundColor: T.primary,
  },
  gridDaySelected: {
    backgroundColor: T.accent,
  },
  gridDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.primary,
  },
  gridDayTextDim: {
    color: 'rgba(49,46,129,0.2)',
  },
  gridDayTextToday: {
    color: 'white',
    fontWeight: '800',
  },
  gridDayTextSelected: {
    color: 'white',
    fontWeight: '800',
  },
  gridDots: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
    alignItems: 'center',
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // ── Agenda ────────────────────────────────────────
  agenda: {
    flex: 1,
  },
  agendaContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  agendaDateLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: T.primary,
    marginBottom: 4,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
  },
  holidayFlag: {
    fontSize: 24,
  },
  holidayName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  holidayLabel: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  agendaBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#818CF8',
    alignSelf: 'stretch',
    minHeight: 40,
  },
  agendaBody: {
    flex: 1,
    gap: 2,
  },
  agendaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.primary,
    lineHeight: 19,
  },
  agendaTime: {
    fontSize: 12,
    fontWeight: '600',
    color: T.accent,
    marginTop: 2,
  },
  agendaLocation: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  agendaDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 15,
  },
  deleteBtn: {
    paddingLeft: 4,
    paddingTop: 2,
  },
  deleteIcon: {
    fontSize: 14,
    opacity: 0.4,
  },
  agendaEmpty: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  agendaEmptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  agendaEmptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: T.primary,
    marginBottom: 4,
  },
  agendaEmptyHint: {
    fontSize: 12,
    color: T.mutedInk,
    fontWeight: '500',
  },

  // ── FAB ──────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    marginTop: -1,
  },

  // ── Modal field content (chrome lives in BottomSheetModal) ─────────
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 0,
  },
})
