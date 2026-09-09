import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getTodaysResponsibilities,
  getFamilyMembers,
  completeOccurrence,
  uncompleteOccurrence,
  reassignOccurrence,
  type ResponsibilityOccurrenceWithFlow,
  type User,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useScreenData } from '@/hooks/useScreenData'
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

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()

  const [routines, setRoutines] = useState<ResponsibilityOccurrenceWithFlow[]>([])
  const [members, setMembers] = useState<User[]>([])

  const fetchData = useCallback(async () => {
    if (!user?.family_id) return
    const [routinesData, membersData] = await Promise.all([
      getTodaysResponsibilities(user.family_id),
      getFamilyMembers(user.family_id),
    ])
    setRoutines(routinesData)
    setMembers(membersData)
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

  const pending = routines.filter((r) => !r.completed_by)
  const completed = routines.filter((r) => !!r.completed_by)

  return (
    <View className="flex-1 bg-[#f0eff8]" style={{ paddingTop: insets.top }}>
      <View className="bg-primary-800 px-5 pt-1.5 pb-[18px] rounded-b-3xl flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-white tracking-tight">Routines</Text>
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
          <View className="gap-2">
            <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">
              Today · {completed.length}/{routines.length} done
            </Text>

            {routines.length === 0 ? (
              <View className="bg-white rounded-3xl py-10 items-center gap-2 shadow-sm">
                <Ionicons name="repeat-outline" size={28} color={T.mutedInk} />
                <Text className="text-sm font-bold text-primary-600">No routines today</Text>
              </View>
            ) : (
              <View className="bg-white rounded-3xl overflow-hidden shadow-sm">
                {pending.map((r, i) => {
                  const cat = CATEGORY_STYLES[r.category] ?? { bg: '#F3F4F6', text: '#6B7280' }
                  return (
                    <View key={r.id} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                      <TouchableOpacity onPress={() => handleToggle(r)} activeOpacity={0.7}>
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

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  )
}
