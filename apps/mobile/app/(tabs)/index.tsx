import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  getTodaysTasks,
  getCalendarEvents,
  getShoppingListPreview,
  getTodaysResponsibilities,
  getFamilyMembers,
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

// ── Helpers ──────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getUpcomingRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setDate(end.getDate() + 14); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatEventDate(ev: CalendarEvent) {
  const d = new Date(ev.start_time)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return ev.all_day ? 'Today · All day' : `Today · ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) +
    (!ev.all_day ? ` · ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}` : '')
}

function formatRoutineTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── Avatar component ──────────────────────────────────────────────────────

function Avatar({ name, role, size = 32 }: { name: string; role: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const bg = ROLE_HEX_COLORS[role || ''] ?? '#6B7280'
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
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
  const [loading, setLoading] = useState(true)

  // Progress bar animation
  const barAnim = useRef(new Animated.Value(0)).current

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.completed).length
  const pendingTasks = tasks.filter((t) => !t.completed)
  const pct = totalTasks > 0 ? doneTasks / totalTasks : 0

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 700,
      useNativeDriver: false,
    }).start()
  }, [pct])

  const loadData = useCallback(async () => {
    if (!user?.family_id) return
    try {
      const { start, end } = getUpcomingRange()
      const [tasksData, eventsData, shoppingData, routinesData, membersData] = await Promise.all([
        getTodaysTasks(user.family_id),
        getCalendarEvents(user.family_id, start, end),
        getShoppingListPreview(user.family_id, 3),
        getTodaysResponsibilities(user.family_id),
        getFamilyMembers(user.family_id),
      ])
      setTasks(tasksData)
      setEvents(eventsData.slice(0, 2))
      setShopping(shoppingData.items)
      setShoppingTotal(shoppingData.totalCount)
      setRoutines(routinesData)
      setMembers(membersData)
    } catch {
      // silently fail — show empty states
    } finally {
      setLoading(false)
    }
  }, [user?.family_id])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  // Merge SA holidays into events preview
  const yr = new Date().getFullYear()
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const end14 = new Date(now); end14.setDate(end14.getDate() + 14)
  const holidays = [...getSAHolidays(yr), ...getSAHolidays(yr + 1)]
    .filter((h) => { const d = new Date(h.date + 'T00:00:00'); return d >= now && d <= end14 })
    .slice(0, 2)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#312E81" size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* ── Gradient Banner ────────────────────────────── */}
      <View style={[styles.banner, { paddingTop: insets.top + 18 }]}>
        {/* Header row */}
        <View style={styles.bannerHeader}>
          <View>
            <Text style={styles.bannerSubtitle}>{getGreeting()}</Text>
            <Text style={styles.bannerTitle}>{firstName} 👋</Text>
          </View>
          {/* Avatar stack */}
          <View style={styles.avatarStack}>
            {members.slice(0, 3).map((m, i) => (
              <View key={m.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                <Avatar name={m.name} role={m.role} size={32} />
              </View>
            ))}
            {members.length > 3 && (
              <View style={[styles.avatarOverflow, { marginLeft: -8 }]}>
                <Text style={styles.avatarOverflowText}>+{members.length - 3}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Task progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View style={styles.progressCardIcon}>
              <Text style={{ fontSize: 11 }}>✓</Text>
            </View>
            <Text style={styles.progressCardLabel}>Today's Tasks</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{pendingTasks.length} left</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressCaption}>{doneTasks} of {totalTasks} complete</Text>
        </View>
      </View>

      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>

        {/* Tasks card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} activeOpacity={0.7}>
              <Text style={styles.cardLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {pendingTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>All done! 🎉</Text>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {pendingTasks.slice(0, 3).map((task, i) => (
                <View key={task.id} style={[styles.taskRow, i < pendingTasks.slice(0, 3).length - 1 && styles.taskRowBorder]}>
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
                        {task.assigned_to.slice(0, 2).map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0] ?? '?').join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.roleDot, { backgroundColor: ROLE_HEX_COLORS[members.find((m) => m.id === task.assigned_to?.[0])?.role || ''] ?? '#9CA3AF' }]} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Events + Shopping 2-col row */}
        <View style={styles.twoCol}>
          {/* Events */}
          <View style={[styles.eventsCard, { flex: 1 }]}>
            <Text style={styles.eventsLabel}>Events</Text>
            {events.length === 0 && holidays.length === 0 ? (
              <Text style={styles.eventsEmpty}>Nothing coming up</Text>
            ) : (
              <>
                {events.slice(0, 2).map((ev, i) => (
                  <View key={ev.id} style={styles.eventRow}>
                    <View style={[styles.eventBar, { backgroundColor: '#818CF8' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                      <Text style={styles.eventDate}>{formatEventDate(ev)}</Text>
                    </View>
                  </View>
                ))}
                {events.length === 0 && holidays.slice(0, 2).map((h, i) => (
                  <View key={h.date} style={styles.eventRow}>
                    <View style={[styles.eventBar, { backgroundColor: '#f59e0b' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{h.name}</Text>
                      <Text style={styles.eventDate}>Public holiday</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Shopping */}
          <View style={[styles.shoppingCard, { flex: 1 }]}>
            <View style={styles.shoppingHeader}>
              <Text style={styles.shoppingTitle}>Shopping</Text>
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.7}
                style={styles.shopBtn}
              >
                <Text style={styles.shopBtnText}>Shop</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.shoppingBody}>
              {shopping.length === 0 ? (
                <Text style={styles.shoppingEmpty}>Nothing yet</Text>
              ) : (
                shopping.slice(0, 3).map((item, i) => (
                  <View key={item.id} style={[styles.shoppingRow, i < shopping.slice(0, 3).length - 1 && styles.shoppingRowBorder]}>
                    <View style={styles.shoppingCheck} />
                    <Text style={styles.shoppingItem} numberOfLines={1}>{item.title}</Text>
                  </View>
                ))
              )}
              {shoppingTotal > 3 && (
                <Text style={styles.shoppingMore}>+{shoppingTotal - 3} more</Text>
              )}
            </View>
          </View>
        </View>

        {/* Routines card */}
        {routines.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Routines</Text>
              <Text style={styles.routineCount}>
                {routines.filter((r) => r.completed_by).length} of {routines.length} done
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
                    style={[styles.routineRow, done && styles.routineRowDone, i < routines.slice(0, 4).length - 1 && styles.routineRowBorder]}
                  >
                    <View style={[styles.routineCheck, done && styles.routineCheckDone]}>
                      {done && <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.routineTitle, done && styles.routineTitleDone]}>{r.flow_title}</Text>
                      <Text style={styles.routineMeta}>{r.assignee_name} · {formatRoutineTime(r.scheduled_time)}</Text>
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

const T = {
  primary: '#312E81',
  p800: '#1E1B4B',
  accent: '#FB7185',
  success: '#34D399',
  bg: '#f0eff8',
}

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

  // Banner
  banner: {
    backgroundColor: T.p800,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(165,180,252,0.7)',
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontWeight: '800',
  },
  avatarOverflow: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarOverflowText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'white',
  },

  // Progress card
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    columnGap: 8,
  },
  progressCardIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  progressBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  progressCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(165,180,252,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Content area
  content: {
    padding: 16,
    rowGap: 12,
    flexDirection: 'column',
  },

  // Generic card
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
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
    color: '#a5a5b8',
    marginTop: 2,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },

  // Two-column row
  twoCol: {
    flexDirection: 'row',
    columnGap: 10,
  },

  // Events
  eventsCard: {
    backgroundColor: T.primary,
    borderRadius: 18,
    padding: 14,
    rowGap: 8,
  },
  eventsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  eventsEmpty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventBar: {
    width: 3,
    height: 30,
    borderRadius: 999,
    flexShrink: 0,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    lineHeight: 15,
  },
  eventDate: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },

  // Shopping
  shoppingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  shoppingHeader: {
    backgroundColor: 'rgba(251,113,133,0.07)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shoppingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: T.accent,
  },
  shopBtn: {
    backgroundColor: T.accent,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  shopBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  shoppingBody: {
    padding: 10,
    paddingTop: 6,
  },
  shoppingEmpty: {
    fontSize: 11,
    color: '#a5a5b8',
    textAlign: 'center',
    paddingVertical: 8,
  },
  shoppingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
  },
  shoppingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  shoppingCheck: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    flexShrink: 0,
  },
  shoppingItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  shoppingMore: {
    fontSize: 11,
    color: '#a5a5b8',
    fontWeight: '600',
    marginTop: 4,
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
    color: '#a5a5b8',
    textDecorationLine: 'line-through',
  },
  routineMeta: {
    fontSize: 10,
    color: '#a5a5b8',
    marginTop: 1,
  },
})
