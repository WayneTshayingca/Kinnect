import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import {
  getTodaysTasks,
  getCalendarEvents,
  getShoppingListPreview,
  getTodaysResponsibilities,
  getFamilyMembers,
  getFamily,
  completeTask,
  completeOccurrence,
  getSAHolidays,
  type Task,
  type CalendarEvent,
  type ListItem,
  type ResponsibilityOccurrenceWithFlow,
  type User,
  ROLE_HEX_COLORS,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useScreenData } from '@/hooks/useScreenData'
import { MemberAvatarRow } from '@/components/MemberAvatarRow'
import { ShoppingIcon } from '@/components/TabIcons'
import { T } from '@/lib/theme'

// ── Helpers ──────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel() {
  return new Date()
    .toLocaleDateString('en-ZA', { weekday: 'long', day: '2-digit', month: 'long' })
    .toUpperCase()
}

function getUpcomingRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setDate(end.getDate() + 14); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatRoutineTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatEventTime(ev: CalendarEvent): string {
  if (ev.all_day) return 'All day'
  const d = new Date(ev.start_time)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

// ── Week Calendar Strip ───────────────────────────────────────────────────

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function WeekCalendarStrip({ events, holidays }: {
  events: CalendarEvent[]
  holidays: Array<{ date: string; name: string }>
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dow = today.getDay()
  const offset = -dow // shift to Sun

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offset + i)
    return d
  })

  const todayStr = localDateStr(today)
  const [selectedStr, setSelectedStr] = useState(todayStr)

  // Dot dates
  const eventDotDates = new Set<string>()
  for (const ev of events) eventDotDates.add(localDateStr(new Date(ev.start_time)))
  for (const h of holidays) {
    const d = new Date(h.date + 'T00:00:00')
    if (d >= weekDays[0] && d <= weekDays[6]) eventDotDates.add(h.date)
  }

  // Selected day's items, sorted by earliest time
  const selectedEvents = events
    .filter(ev => localDateStr(new Date(ev.start_time)) === selectedStr)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const selectedHolidays = holidays.filter(h => h.date === selectedStr)
  const hasAnythingSelected = selectedEvents.length > 0 || selectedHolidays.length > 0

  const isSelectedToday = selectedStr === todayStr
  const selectedDay = weekDays.find(d => localDateStr(d) === selectedStr)
  const dayLabel = isSelectedToday
    ? 'today'
    : (selectedDay?.toLocaleDateString('en-ZA', { weekday: 'long' }) ?? '')

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>This Week</Text>
        <Text style={styles.calendarLink}>See all</Text>
      </View>

      {/* Week strip */}
      <View style={styles.weekRow}>
        {weekDays.map((day, i) => {
          const isToday = localDateStr(day) === todayStr
          const isSelected = localDateStr(day) === selectedStr
          const hasEvent = eventDotDates.has(localDateStr(day))
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedStr(localDateStr(day))}
              activeOpacity={0.7}
              style={styles.dayCell}
            >
              <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
              <View style={[
                styles.dayCircle,
                isSelected && styles.dayCircleSelected,
                isToday && !isSelected && styles.dayCircleToday,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                  !isSelected && !isToday && isWeekend && styles.dayNumberWeekend,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={[styles.eventDot, hasEvent && styles.eventDotActive]} />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Selected day's events */}
      <View style={styles.calendarEvents}>
        {!hasAnythingSelected ? (
          <Text style={styles.calendarEmpty}>No events {dayLabel}</Text>
        ) : (
          <>
            {selectedHolidays.map(h => (
              <View key={h.date} style={styles.calendarEventRow}>
                <View style={[styles.calendarEventIcon, { backgroundColor: '#fef9ec' }]}>
                  <Ionicons name="flag" size={14} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calendarEventTitle} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.calendarEventTime}>Public holiday · All day</Text>
                </View>
              </View>
            ))}
            {selectedEvents.slice(0, 3).map(ev => (
              <View key={ev.id} style={styles.calendarEventRow}>
                <View style={[styles.calendarEventIcon, { backgroundColor: 'rgba(49,46,129,0.08)' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: T.primary }}>
                    {ev.all_day ? '—' : new Date(ev.start_time).getHours().toString().padStart(2, '0')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calendarEventTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={styles.calendarEventTime}>
                    {formatEventTime(ev)}{ev.location ? ` · ${ev.location}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  )
}

// ── Daily Snapshot ────────────────────────────────────────────────────────

function DailySnapshot({ tasksLeft, eventsToday, shoppingCount, routinesDone, routinesTotal }: {
  tasksLeft: number
  eventsToday: number
  shoppingCount: number
  routinesDone: number
  routinesTotal: number
}) {
  const stats: Array<{
    value: number
    label: string
    sub: string
    iconColor: string
    icon: React.ComponentProps<typeof Ionicons>['name']
  }> = [
    { value: tasksLeft,    label: 'Tasks left',    sub: tasksLeft === 0 ? 'All clear!' : 'Today',       iconColor: '#C7D2FE', icon: 'checkmark-circle-outline' },
    { value: eventsToday,  label: 'Events',        sub: eventsToday === 0 ? 'Free day' : 'scheduled',   iconColor: '#FDA4AF', icon: 'calendar-outline' },
    { value: shoppingCount, label: 'To buy',       sub: shoppingCount === 0 ? 'List clear' : 'On list', iconColor: '#86EFAC', icon: 'basket-outline' },
    { value: routinesTotal > 0 ? routinesDone : 0, label: 'Routines', sub: routinesTotal > 0 ? `${routinesDone}/${routinesTotal} done` : 'None today', iconColor: '#C4B5FD', icon: 'repeat-outline' },
  ]

  const allClear = tasksLeft === 0 && eventsToday === 0 && shoppingCount === 0

  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotHeaderRow}>
        <Text style={styles.snapshotHeader}>Daily Snapshot</Text>
        <Text style={styles.snapshotStatus}>
          {allClear ? "You're all set today!" : `${tasksLeft} tasks until you're done`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.snapshotCell, i < 3 && styles.snapshotCellBorder]}>
          <View style={styles.snapshotIcon}>
            {s.icon === 'basket-outline'
              ? <ShoppingIcon color={s.iconColor} size={15} />
              : <Ionicons name={s.icon} size={16} color={s.iconColor} />}
          </View>
          <Text style={styles.snapshotValue}>{s.value}</Text>
          <Text style={styles.snapshotLabel}>{s.label}</Text>
          <Text style={styles.snapshotSub}>{s.sub}</Text>
        </View>
      ))}
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [shopping, setShopping] = useState<ListItem[]>([])
  const [shoppingTotal, setShoppingTotal] = useState(0)
  const [routines, setRoutines] = useState<ResponsibilityOccurrenceWithFlow[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [familyName, setFamilyName] = useState('')

  const fetchData = useCallback(async () => {
    if (!user?.family_id) return
    const { start, end } = getUpcomingRange()
    const [tasksData, eventsData, shoppingData, routinesData, membersData, familyData] = await Promise.all([
      getTodaysTasks(user.family_id),
      getCalendarEvents(user.family_id, start, end),
      getShoppingListPreview(user.family_id, 6),
      getTodaysResponsibilities(user.family_id),
      getFamilyMembers(user.family_id),
      getFamily(user.family_id),
    ])
    setTasks(tasksData)
    setEvents(eventsData)
    setShopping(shoppingData.items)
    setShoppingTotal(shoppingData.totalCount)
    setRoutines(routinesData)
    setMembers(membersData)
    setFamilyName(familyData?.name ?? '')
  }, [user?.family_id])

  const { loading } = useScreenData(user?.family_id, fetchData, [
    'tasks', 'calendar_events', 'list_items', 'users', 'responsibility_occurrences',
  ])

  async function handleCompleteTask(taskId: string) {
    if (!user?.id) return
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: true, completed_at: new Date().toISOString() } : t))
    try {
      await completeTask(taskId, user.id)
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: false, completed_at: null } : t))
    }
  }

  async function handleCompleteRoutine(occ: ResponsibilityOccurrenceWithFlow) {
    if (!user?.id || occ.completed_by) return
    setRoutines((prev) => prev.map((r) => r.id === occ.id ? { ...r, completed_by: user.id } : r))
    try {
      await completeOccurrence(occ.id, user.id)
    } catch {
      setRoutines((prev) => prev.map((r) => r.id === occ.id ? { ...r, completed_by: null } : r))
    }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  // SA holidays for week strip
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const todayKey = now.toDateString()
  const holidays = useMemo(() => {
    const d0 = new Date(todayKey)
    const yr = d0.getFullYear()
    const end14 = new Date(d0); end14.setDate(end14.getDate() + 14)
    return [...getSAHolidays(yr), ...getSAHolidays(yr + 1)]
      .filter(h => { const d = new Date(h.date + 'T00:00:00'); return d >= d0 && d <= end14 })
  }, [todayKey])

  // Derived counts
  const pendingTasks = tasks.filter(t => !t.completed)
  const todayStr = localDateStr(now)
  const eventsToday = events.filter(ev => localDateStr(new Date(ev.start_time)) === todayStr).length
  const routinesDone = routines.filter(r => !!r.completed_by).length

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={T.primary} size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Header now lives in (tabs)/_layout.tsx so every tab shares one. */}

      {/* ── Dark banner: date, greeting, family avatars, daily snapshot ── */}
      <LinearGradient
        colors={['#1e1b4b', '#312e81', '#3730a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        {/* Today's date, own row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>{getTodayLabel()}</Text>
          <View style={styles.dateDot} />
        </View>

        {/* Greeting + family member avatars/add-member, inline */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingInline}>
            {getGreeting()}, <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
          <View style={styles.memberRow}>
            <MemberAvatarRow
              members={members}
              size={32}
              maxVisible={3}
              ringColor="#2f2c73"
              overflowBg="#FB7185"
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/profile')}
              style={styles.addMemberBtn}
            >
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Snapshot */}
        <DailySnapshot
          tasksLeft={pendingTasks.length}
          eventsToday={eventsToday}
          shoppingCount={shoppingTotal}
          routinesDone={routinesDone}
          routinesTotal={routines.length}
        />
      </LinearGradient>

      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>

        {/* Week Calendar Strip */}
        <WeekCalendarStrip events={events} holidays={holidays} />

        {/* Tasks card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>Today's Tasks</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} activeOpacity={0.7}>
              <Text style={styles.cardLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {pendingTasks.length === 0 ? (
            <View style={{ opacity: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 14, height: 9, backgroundColor: 'rgba(49,46,129,0.08)', borderRadius: 3, borderWidth: 1.5, borderColor: 'rgba(49,46,129,0.2)' }} />
                <View style={{ width: 44, marginTop: -2, paddingTop: 9, paddingHorizontal: 7, paddingBottom: 10, backgroundColor: 'rgba(49,46,129,0.07)', borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(49,46,129,0.2)' }}>
                  {[18, 18, 10].map((lineW, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: i < 2 ? 6 : 0 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(52,211,153,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 5, color: '#34D399', fontWeight: '800' }}>✓</Text>
                      </View>
                      <View style={{ width: lineW, height: 1.5, backgroundColor: 'rgba(49,46,129,0.15)', borderRadius: 1 }} />
                    </View>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>All clear for today!</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Enjoy your day.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {pendingTasks.slice(0, 3).map((task, i) => (
                <View
                  key={task.id}
                  style={[styles.taskRow, i < pendingTasks.slice(0, 3).length - 1 && styles.taskRowBorder]}
                >
                  <TouchableOpacity
                    onPress={() => handleCompleteTask(task.id)}
                    activeOpacity={0.7}
                    style={styles.checkBtn}
                  >
                    <View style={styles.checkCircle} />
                  </TouchableOpacity>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <Text style={styles.taskMeta} numberOfLines={1}>
                        {task.assigned_to.slice(0, 2).map(id => members.find(m => m.id === id)?.name?.split(' ')[0] ?? '?').join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.roleDot, {
                    backgroundColor: ROLE_HEX_COLORS[members.find(m => m.id === task.assigned_to?.[0])?.role || ''] ?? '#9CA3AF'
                  }]} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Shopping card — pill chips */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1F2' }]}>
                <ShoppingIcon color="#FB7185" size={14} />
              </View>
              <Text style={styles.cardTitle}>Shopping</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/shopping')}
              activeOpacity={0.7}
              style={styles.shopBtn}
            >
              <Text style={styles.shopBtnText}>Shop</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pillsContainer}>
            {shopping.length === 0 ? (
              <Text style={styles.shoppingEmpty}>Nothing on the list</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
                {shopping.slice(0, 6).map(item => (
                  <View key={item.id} style={styles.pill}>
                    <View style={styles.pillDot} />
                    <Text style={styles.pillText} numberOfLines={1}>{item.title}</Text>
                  </View>
                ))}
                {shoppingTotal > 6 && (
                  <View style={styles.pillMore}>
                    <Text style={styles.pillMoreText}>+{shoppingTotal - 6}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Routines card */}
        {routines.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="repeat-outline" size={14} color="#7C3AED" />
                </View>
                <Text style={styles.cardTitle}>Today's Routines</Text>
              </View>
              <Text style={styles.routineCount}>
                {routines.filter(r => r.completed_by).length} of {routines.length} done
              </Text>
            </View>
            <View style={styles.cardBody}>
              {routines.slice(0, 4).map((r, i) => {
                const done = !!r.completed_by
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => handleCompleteRoutine(r)}
                    activeOpacity={0.7}
                    style={[
                      styles.routineRow,
                      done && styles.routineRowDone,
                      i < routines.slice(0, 4).length - 1 && styles.routineRowBorder,
                    ]}
                  >
                    <View style={[styles.routineCheck, done && styles.routineCheckDone]}>
                      {done && <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.routineTitle, done && styles.routineTitleDone]}>{r.flow_title}</Text>
                      <Text style={styles.routineMeta}>{r.assignee_name.split(' ')[0]} · {formatRoutineTime(r.scheduled_time)}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
  },

  // Dark gradient banner wrapping date/greeting/avatars/daily snapshot
  banner: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    rowGap: 8,
  },

  // Date row (own line, above greeting)
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.accent,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
  },

  // Greeting + family avatars, inline
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 8,
  },
  greetingInline: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    flexShrink: 1,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  addMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    paddingHorizontal: 16,
    rowGap: 8,
    flexDirection: 'column',
  },

  // Generic card
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: T.primary,
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: T.accent,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.success,
  },

  // Week calendar strip
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: T.primary,
  },
  calendarLink: {
    fontSize: 12,
    fontWeight: '700',
    color: T.accent,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dayCell: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: T.mutedInk,
    textTransform: 'uppercase',
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleSelected: {
    backgroundColor: T.primary,
  },
  dayCircleToday: {
    borderColor: T.primary,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayNumberSelected: {
    color: 'white',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: T.primary,
    fontWeight: '800',
  },
  dayNumberWeekend: {
    color: '#c4c4d8',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  eventDotActive: {
    backgroundColor: T.accent,
  },
  calendarEvents: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    gap: 8,
  },
  calendarEmpty: {
    fontSize: 12,
    color: T.mutedInk,
    fontWeight: '500',
    paddingVertical: 6,
  },
  calendarEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarEventIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  calendarEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.primary,
    lineHeight: 18,
  },
  calendarEventTime: {
    fontSize: 11,
    color: T.mutedInk,
    marginTop: 1,
  },

  // Daily snapshot (sits inside the dark banner)
  snapshotCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  snapshotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 4,
  },
  snapshotHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  snapshotStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: T.accent,
  },
  snapshotCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  snapshotCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  snapshotIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
  },
  snapshotLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
  snapshotSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 12,
  },

  // Tasks
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  checkBtn: {
    padding: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.primary,
  },
  taskMeta: {
    fontSize: 11,
    color: T.mutedInk,
    marginTop: 2,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },

  // Shopping
  shopBtn: {
    backgroundColor: T.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  pillsContainer: {
    paddingVertical: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  pillsScroll: {
    paddingHorizontal: 14,
    gap: 7,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(49,46,129,0.07)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(49,46,129,0.3)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.primary,
    maxWidth: 80,
  },
  pillMore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,113,133,0.1)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pillMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.accent,
  },
  shoppingEmpty: {
    fontSize: 12,
    color: T.mutedInk,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Routines
  routineCount: {
    fontSize: 11,
    fontWeight: '700',
    color: T.success,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  routineRowDone: {
    backgroundColor: '#f0fdf4',
  },
  routineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  routineCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  routineCheckDone: {
    borderColor: T.success,
    backgroundColor: T.success,
  },
  routineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.primary,
  },
  routineTitleDone: {
    color: T.mutedInk,
    textDecorationLine: 'line-through',
  },
  routineMeta: {
    fontSize: 10,
    color: T.mutedInk,
    marginTop: 1,
  },
})
