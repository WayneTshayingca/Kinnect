import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getTasks,
  getFamilyMembers,
  createTask,
  completeTask,
  uncompleteTask,
  type Task,
  type User,
  ROLE_HEX_COLORS,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// ── Helpers ───────────────────────────────────────────────────────────────

type Filter = 'pending' | 'done' | 'all'

function dueDateLabel(due: string | null): { text: string; overdue: boolean } | null {
  if (!due) return null
  const d = new Date(due)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d < today) return { text: 'Overdue', overdue: true }
  if (d.toDateString() === today.toDateString()) return { text: 'Today', overdue: false }
  if (d.toDateString() === tomorrow.toDateString()) return { text: 'Tomorrow', overdue: false }
  return {
    text: d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
    overdue: false,
  }
}

function memberNames(assignedTo: string[] | null, members: User[]): string {
  if (!assignedTo || assignedTo.length === 0) return ''
  return assignedTo
    .slice(0, 2)
    .map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0] ?? '?')
    .join(', ') + (assignedTo.length > 2 ? ` +${assignedTo.length - 2}` : '')
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ name, role, size = 26 }: { name: string; role: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const bg = ROLE_HEX_COLORS[role ?? ''] ?? '#6B7280'
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: bg, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  onToggle,
  isLast,
}: {
  task: Task
  members: User[]
  onToggle: (task: Task) => void
  isLast: boolean
}) {
  const due = dueDateLabel(task.due_date)
  const names = memberNames(task.assigned_to, members)
  const assignedMembers = (task.assigned_to ?? []).slice(0, 3).map((id) => members.find((m) => m.id === id)).filter(Boolean) as User[]

  return (
    <View style={[styles.taskRow, !isLast && styles.taskRowBorder]}>
      <TouchableOpacity onPress={() => onToggle(task)} activeOpacity={0.6} style={styles.checkWrap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[styles.checkCircle, task.completed && styles.checkCircleDone]}>
          {task.completed && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.taskBody}>
        <Text
          style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        <View style={styles.taskMeta}>
          {names ? <Text style={styles.metaText}>{names}</Text> : null}
          {due ? (
            <View style={[styles.dueBadge, due.overdue && styles.dueBadgeOverdue]}>
              <Text style={[styles.dueText, due.overdue && styles.dueTextOverdue]}>{due.text}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {assignedMembers.length > 0 && (
        <View style={styles.avatarStack}>
          {assignedMembers.map((m, i) => (
            <View key={m.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }]}>
              <Avatar name={m.name} role={m.role} size={26} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ── Create task modal ──────────────────────────────────────────────────────

function CreateTaskModal({
  visible,
  members,
  familyId,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean
  members: User[]
  familyId: string
  userId: string
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const slideAnim = useRef(new Animated.Value(400)).current

  useEffect(() => {
    if (visible) {
      setTitle(''); setAssignees([]); setDueDate(''); setError('')
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }).start()
    }
  }, [visible, slideAnim])

  function toggleAssignee(id: string) {
    setAssignees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Task title is required'); return }
    setError('')
    setSaving(true)
    try {
      const task = await createTask({
        family_id: familyId,
        title: title.trim(),
        created_by: userId,
        assigned_to: assignees.length > 0 ? assignees : undefined,
        due_date: dueDate.trim() || undefined,
      })
      onCreated(task)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>New task</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What needs to be done?"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Due date (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
          />

          {members.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Assign to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalAssigneeRow}>
                {members.map((m) => {
                  const selected = assignees.includes(m.id)
                  const bg = ROLE_HEX_COLORS[m.role ?? ''] ?? '#6B7280'
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleAssignee(m.id)}
                      activeOpacity={0.7}
                      style={[styles.modalAssigneeChip, selected && { borderColor: bg, backgroundColor: bg + '15' }]}
                    >
                      <View style={[styles.modalAssigneeAvatar, { backgroundColor: bg }]}>
                        <Text style={styles.modalAssigneeAvatarText}>
                          {m.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={[styles.assigneeName, selected && { color: bg, fontWeight: '700' }]}>
                        {m.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={styles.createBtn} disabled={saving} activeOpacity={0.85}>
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.createText}>Create task</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()

  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!user?.family_id) return
    if (!quiet) setLoading(true)
    try {
      const [tasksData, membersData] = await Promise.all([
        getTasks(user.family_id),
        getFamilyMembers(user.family_id),
      ])
      setTasks(tasksData)
      setMembers(membersData)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.family_id])

  useEffect(() => { load() }, [load])

  useRealtimeSync(user?.family_id, {
    tasks: () => load(true),
    users: () => load(true),
  })

  function handleToggle(task: Task) {
    if (task.completed) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: false, completed_at: null, completed_by: null } : t))
      uncompleteTask(task.id).catch(() =>
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true } : t))
      )
    } else {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true, completed_at: new Date().toISOString() } : t))
      completeTask(task.id, user!.id).catch(() =>
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: false, completed_at: null } : t))
      )
    }
  }

  const pending = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)

  // Sort pending: overdue first, then by due_date asc, then no due date
  const sortedPending = [...pending].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return da - db
  })

  const filteredPending = assigneeFilter
    ? sortedPending.filter(t => t.assigned_to?.includes(assigneeFilter))
    : sortedPending

  const filteredDone = assigneeFilter
    ? done.filter(t => t.assigned_to?.includes(assigneeFilter))
    : done

  const displayed: Task[] =
    filter === 'pending' ? filteredPending :
    filter === 'done' ? filteredDone :
    [...filteredPending, ...filteredDone]

  const assigneeName = assigneeFilter
    ? members.find(m => m.id === assigneeFilter)?.name?.split(' ')[0] ?? null
    : null

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pending.length },
    { key: 'done', label: 'Done', count: done.length },
    { key: 'all', label: 'All', count: tasks.length },
  ]

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        {/* Filter tabs */}
        <View style={styles.tabs}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[styles.tab, filter === f.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>
                {f.label}
              </Text>
              {f.count > 0 && (
                <View style={[styles.tabBadge, filter === f.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, filter === f.key && styles.tabBadgeTextActive]}>
                    {f.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Assignee filter chips */}
        {members.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.assigneeRow}
            contentContainerStyle={styles.assigneeRowContent}
          >
            <TouchableOpacity
              onPress={() => setAssigneeFilter(null)}
              activeOpacity={0.7}
              style={[styles.assigneeChip, !assigneeFilter && styles.assigneeChipAllActive]}
            >
              <Text style={[styles.assigneeChipText, !assigneeFilter && styles.assigneeChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {members.map(m => {
              const isActive = assigneeFilter === m.id
              const color = ROLE_HEX_COLORS[m.role ?? ''] ?? '#6B7280'
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setAssigneeFilter(isActive ? null : m.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.assigneeChip,
                    isActive && { borderColor: color, backgroundColor: color + '28' },
                  ]}
                >
                  <View style={[styles.assigneeAvatar, { backgroundColor: color }]}>
                    <Text style={styles.assigneeAvatarText}>
                      {m.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <Text style={[styles.assigneeChipText, isActive && { color, fontWeight: '700' }]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, displayed.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={T.primary}
            />
          }
          ListEmptyComponent={
            filter === 'pending' ? (
              assigneeName ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>✓</Text>
                  <Text style={styles.emptyTitle}>All clear for {assigneeName}!</Text>
                  <Text style={styles.emptySubtitle}>No pending tasks assigned to them.</Text>
                </View>
              ) : (
                <View style={{ opacity: 0.65, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 14 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 18, height: 12, backgroundColor: 'rgba(49,46,129,0.08)', borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(49,46,129,0.2)' }} />
                    <View style={{ width: 56, marginTop: -2, paddingTop: 11, paddingHorizontal: 9, paddingBottom: 13, backgroundColor: 'rgba(49,46,129,0.07)', borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(49,46,129,0.2)' }}>
                      {[24, 24, 14].map((lineW, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: i < 2 ? 8 : 0 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(52,211,153,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 6, color: '#34D399', fontWeight: '800' }}>✓</Text>
                          </View>
                          <View style={{ width: lineW, height: 1.5, backgroundColor: 'rgba(49,46,129,0.15)', borderRadius: 1 }} />
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#374151' }}>All caught up!</Text>
                    <Text style={{ fontSize: 13, color: '#9ca3af' }}>No pending tasks for today.</Text>
                  </View>
                </View>
              )
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>{filter === 'done' ? '🎉' : '📋'}</Text>
                <Text style={styles.emptyTitle}>
                  {filter === 'done'
                    ? (assigneeName ? `Nothing done by ${assigneeName} yet` : 'Nothing done yet')
                    : (assigneeName ? `No tasks for ${assigneeName}` : 'No tasks yet')}
                </Text>
                <Text style={styles.emptySubtitle}>{filter === 'all' && !assigneeName ? 'Tap + to add your first task' : ''}</Text>
              </View>
            )
          }
          ListHeaderComponent={
            filter === 'all' && filteredPending.length > 0 && filteredDone.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending</Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={null}
          renderItem={({ item, index }) => {
            const showDoneDivider =
              filter === 'all' &&
              index === filteredPending.length - 1 &&
              filteredDone.length > 0
            const isLast = index === displayed.length - 1

            return (
              <>
                <View style={styles.card}>
                  <TaskRow
                    task={item}
                    members={members}
                    onToggle={handleToggle}
                    isLast={isLast}
                  />
                </View>
                {showDoneDivider && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Done</Text>
                  </View>
                )}
              </>
            )
          }}
        />
      )}

      {/* FAB */}
      {user?.family_id && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create modal */}
      {user?.family_id && user?.id && (
        <CreateTaskModal
          visible={showCreate}
          members={members}
          familyId={user.family_id}
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(task) => setTasks((prev) => [task, ...prev])}
        />
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const T = {
  primary: '#312E81',
  p800: '#1E1B4B',
  accent: '#FB7185',
  bg: '#f0eff8',
  success: '#34D399',
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Header
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(49,46,129,0.06)',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: T.primary,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  // Filter tabs
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },

  // Assignee filter
  assigneeRow: {
    marginTop: 10,
  },
  assigneeRowContent: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  assigneeChipAllActive: {
    borderColor: T.primary,
    backgroundColor: T.primary,
  },
  assigneeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(49,46,129,0.65)',
  },
  assigneeChipTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  assigneeAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeAvatarText: {
    fontSize: 7,
    fontWeight: '800',
    color: 'white',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(49,46,129,0.07)',
  },
  tabActive: {
    backgroundColor: T.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(49,46,129,0.5)',
  },
  tabTextActive: {
    color: 'white',
  },
  tabBadge: {
    backgroundColor: 'rgba(49,46,129,0.1)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: T.accent,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.primary,
  },
  tabBadgeTextActive: {
    color: 'white',
  },

  // List
  listContent: {
    padding: 14,
    gap: 8,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Section dividers (All view)
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a5a5b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Task card
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  checkWrap: {
    flexShrink: 0,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkCircleDone: {
    borderColor: T.success,
    backgroundColor: T.success,
  },
  checkMark: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.primary,
    lineHeight: 19,
  },
  taskTitleDone: {
    color: '#a5a5b8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#a5a5b8',
    fontWeight: '500',
  },
  dueBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dueBadgeOverdue: {
    backgroundColor: '#FEF2F2',
  },
  dueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  dueTextOverdue: {
    color: '#EF4444',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarWrap: {},
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontWeight: '800',
  },

  // Empty / loading states
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: T.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#a5a5b8',
    fontWeight: '500',
  },

  // FAB
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.primary,
    marginBottom: 16,
  },
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
  modalAssigneeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  modalAssigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: 'white',
  },
  modalAssigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAssigneeAvatarText: {
    fontSize: 8,
    fontWeight: '800',
    color: 'white',
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  createBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
})
