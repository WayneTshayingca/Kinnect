import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getTodaysResponsibilities,
  getFamilyMembers,
  getResponsibilityFlows,
  getResponsibilityTemplates,
  completeOccurrence,
  uncompleteOccurrence,
  reassignOccurrence,
  deactivateFlow,
  deleteFlow,
  type ResponsibilityOccurrenceWithFlow,
  type ResponsibilityFlowWithDetails,
  type ResponsibilityTemplate,
  type User,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useScreenData } from '@/hooks/useScreenData'
import { RoutineSheet } from '@/components/RoutineSheet'
import { SegmentedPills } from '@/components/ui/SegmentedPills'
import { T } from '@/lib/theme'

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  household: 'Household',
  care: 'Care',
  errand: 'Errand',
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  transport: { bg: '#EFF6FF', text: '#2563EB' },
  household: { bg: '#FFFBEB', text: '#D97706' },
  care: { bg: '#F5F3FF', text: '#7C3AED' },
  errand: { bg: '#F0FDF4', text: '#16A34A' },
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatRecurrence(rule: string): string {
  if (rule === 'daily') return 'Every day'
  if (rule === 'weekdays') return 'Weekdays'
  if (rule === 'weekends') return 'Weekends'
  if (rule.startsWith('weekly:')) {
    return rule.slice(7).split(',').map((d) => DAY_NAMES[Number(d)] ?? '').filter(Boolean).join(', ')
  }
  return rule
}

type Tab = 'today' | 'manage'

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()

  const [tab, setTab] = useState<Tab>('today')
  const [routines, setRoutines] = useState<ResponsibilityOccurrenceWithFlow[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [flows, setFlows] = useState<ResponsibilityFlowWithDetails[]>([])
  const [templates, setTemplates] = useState<ResponsibilityTemplate[]>([])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<ResponsibilityFlowWithDetails | null>(null)

  const isAdmin = user?.role === 'admin'

  const fetchData = useCallback(async () => {
    if (!user?.family_id) return
    const [routinesData, membersData, flowsData, templatesData] = await Promise.all([
      getTodaysResponsibilities(user.family_id),
      getFamilyMembers(user.family_id),
      getResponsibilityFlows(user.family_id),
      getResponsibilityTemplates(),
    ])
    setRoutines(routinesData)
    setMembers(membersData)
    setFlows(flowsData)
    setTemplates(templatesData)
  }, [user?.family_id])

  const { loading, refreshing, refresh } = useScreenData(user?.family_id, fetchData, ['responsibility_occurrences'])

  async function handleToggle(occ: ResponsibilityOccurrenceWithFlow) {
    if (!user?.id) return
    const done = !!occ.completed_by
    setRoutines((prev) => prev.map((r) => r.id === occ.id ? { ...r, completed_by: done ? null : user.id } : r))
    try {
      if (done) await uncompleteOccurrence(occ.id)
      else await completeOccurrence(occ.id, user.id)
    } catch {
      setRoutines((prev) => prev.map((r) => r.id === occ.id ? { ...r, completed_by: occ.completed_by } : r))
    }
  }

  function handleReassign(occ: ResponsibilityOccurrenceWithFlow) {
    Alert.alert(
      'Reassign to',
      undefined,
      members.map((m) => ({
        text: m.name,
        onPress: async () => {
          setRoutines((prev) => prev.map((r) => r.id === occ.id ? { ...r, assignee_name: m.name } : r))
          try {
            await reassignOccurrence(occ.id, m.id)
          } catch {
            refresh()
          }
        },
      })).concat([{ text: 'Cancel', style: 'cancel' } as any])
    )
  }

  function handleFlowActions(flow: ResponsibilityFlowWithDetails) {
    const actions: Parameters<typeof Alert.alert>[2] = [
      { text: 'Edit', onPress: () => { setEditingFlow(flow); setSheetOpen(true) } },
    ]

    // Deactivating an already-paused flow is a no-op, so only offer it while active.
    if (flow.active) {
      actions.push({
        text: 'Pause routine',
        onPress: async () => {
          setFlows((prev) => prev.map((f) => f.id === flow.id ? { ...f, active: false } : f))
          try {
            await deactivateFlow(flow.id)
            refresh()
          } catch {
            refresh()
            Alert.alert('Error', 'Could not pause this routine')
          }
        },
      })
    }

    actions.push(
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(flow) },
      { text: 'Cancel', style: 'cancel' },
    )

    Alert.alert(flow.title, undefined, actions)
  }

  function confirmDelete(flow: ResponsibilityFlowWithDetails) {
    Alert.alert(
      `Delete ${flow.title}?`,
      'This removes the routine and all of its upcoming occurrences. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const previous = flows
            setFlows((prev) => prev.filter((f) => f.id !== flow.id))
            try {
              await deleteFlow(flow.id)
              refresh()
            } catch {
              setFlows(previous)
              Alert.alert('Error', 'Could not delete this routine')
            }
          },
        },
      ]
    )
  }

  const pending = routines.filter((r) => !r.completed_by)
  const completed = routines.filter((r) => !!r.completed_by)

  return (
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      <View className="bg-primary-800 px-5 pt-1.5 pb-[18px] rounded-b-3xl flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="flex-1 text-2xl font-extrabold text-white tracking-tight">Routines</Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => { setEditingFlow(null); setSheetOpen(true) }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-white/15 rounded-full px-3 py-1.5"
            accessibilityLabel="New routine"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-[13px] font-bold text-white">New</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mx-4 mt-4">
        <SegmentedPills<Tab>
          segments={[
            { value: 'today', label: 'Today' },
            { value: 'manage', label: 'All routines', badge: flows.length || '' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#312E81" size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#312E81" />}
        >
          {tab === 'today' ? (
            <View className="gap-2">
              <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">
                Today · {completed.length}/{routines.length} done
              </Text>

              {routines.length === 0 ? (
                <View className="bg-white rounded-3xl py-10 items-center gap-2 shadow-sm">
                  <Ionicons name="repeat-outline" size={28} color={T.mutedInk} />
                  <Text className="text-sm font-bold text-primary-600">No routines today</Text>
                  <Text className="text-xs text-ink-muted">Nothing scheduled for today.</Text>
                </View>
              ) : (
                <View className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  {pending.map((r, i) => {
                    const cat = CATEGORY_STYLES[r.category] ?? { bg: '#F3F4F6', text: '#6B7280' }
                    return (
                      <View key={r.id} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                        <TouchableOpacity
                          onPress={() => handleToggle(r)}
                          activeOpacity={0.7}
                          accessibilityLabel={`Mark ${r.flow_title} done`}
                        >
                          <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
                        </TouchableOpacity>
                        <View className="flex-1 gap-1">
                          <Text className="text-sm font-bold text-primary-600">{r.flow_title}</Text>
                          <View className="flex-row items-center gap-1.5">
                            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: cat.bg }}>
                              <Text className="text-[10px] font-bold" style={{ color: cat.text }}>
                                {CATEGORY_LABELS[r.category] ?? r.category}
                              </Text>
                            </View>
                            <Text className="text-[11px] text-ink-muted">
                              {r.assignee_name.split(' ')[0]} · {formatTime(r.scheduled_time)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleReassign(r)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Reassign ${r.flow_title}`}
                        >
                          <Ionicons name="swap-horizontal" size={18} color={T.mutedInk} />
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                  {completed.map((r, i) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => handleToggle(r)}
                      activeOpacity={0.7}
                      className={`flex-row items-center gap-3 px-4 py-3 bg-emerald-50/40 ${(pending.length + i) > 0 ? 'border-t border-black/[0.04]' : ''}`}
                    >
                      <View className="w-6 h-6 rounded-full bg-emerald-400 items-center justify-center">
                        <Ionicons name="checkmark" size={14} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-ink-muted line-through">{r.flow_title}</Text>
                        <Text className="text-[11px] text-ink-muted">{r.assignee_name.split(' ')[0]}</Text>
                      </View>
                      <Ionicons name="arrow-undo" size={16} color={T.mutedInk} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">
                All routines
              </Text>

              {flows.length === 0 ? (
                <View className="bg-white rounded-3xl py-10 items-center gap-2 px-8 shadow-sm">
                  <Ionicons name="repeat-outline" size={28} color={T.mutedInk} />
                  <Text className="text-sm font-bold text-primary-600">No routines yet</Text>
                  <Text className="text-xs text-ink-muted text-center leading-4">
                    Set up a recurring responsibility — the school run, shopping duty — and
                    Kinnect will schedule it automatically.
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => { setEditingFlow(null); setSheetOpen(true) }}
                      activeOpacity={0.85}
                      className="bg-accent-500 rounded-2xl px-5 py-3 mt-2"
                    >
                      <Text className="text-[14px] font-bold text-white">New routine</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="bg-white rounded-3xl overflow-hidden shadow-sm">
                  {flows.map((f, i) => {
                    const cat = CATEGORY_STYLES[f.category] ?? { bg: '#F3F4F6', text: '#6B7280' }
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => isAdmin ? handleFlowActions(f) : undefined}
                        activeOpacity={isAdmin ? 0.7 : 1}
                        className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''} ${!f.active ? 'opacity-50' : ''}`}
                      >
                        <View className="flex-1 gap-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-sm font-bold text-primary-600">{f.title}</Text>
                            {!f.active && (
                              <View className="bg-gray-100 rounded px-1.5 py-0.5">
                                <Text className="text-[9px] font-bold text-ink-muted uppercase">Paused</Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-1.5">
                            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: cat.bg }}>
                              <Text className="text-[10px] font-bold" style={{ color: cat.text }}>
                                {CATEGORY_LABELS[f.category] ?? f.category}
                              </Text>
                            </View>
                            <Text className="text-[11px] text-ink-muted">
                              {formatRecurrence(f.recurrence_rule)}
                              {f.start_time ? ` · ${formatTime(f.start_time)}` : ''}
                              {` · ${f.assignee_name.split(' ')[0]}`}
                            </Text>
                          </View>
                        </View>
                        {isAdmin && (
                          <Ionicons name="ellipsis-horizontal" size={18} color={T.mutedInk} />
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {!isAdmin && flows.length > 0 && (
                <Text className="text-[11px] text-ink-muted px-1">
                  Only admins can add or change routines.
                </Text>
              )}
            </View>
          )}

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}

      {user?.family_id && user?.id && (
        <RoutineSheet
          visible={sheetOpen}
          familyId={user.family_id}
          userId={user.id}
          members={members}
          templates={templates}
          flow={editingFlow}
          onClose={() => setSheetOpen(false)}
          onSaved={refresh}
        />
      )}
    </View>
  )
}
