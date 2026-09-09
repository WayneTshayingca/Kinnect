import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import {
  createResponsibilityFlow,
  updateResponsibilityFlow,
  type ResponsibilityTemplate,
  type ResponsibilityFlowWithDetails,
  type User,
} from '@kinnect/core'
import { T } from '@/lib/theme'
import { BottomSheetModal } from './BottomSheetModal'

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly', label: 'Pick days' },
]

const WEEKDAYS = [
  { iso: 1, short: 'M' },
  { iso: 2, short: 'T' },
  { iso: 3, short: 'W' },
  { iso: 4, short: 'T' },
  { iso: 5, short: 'F' },
  { iso: 6, short: 'S' },
  { iso: 7, short: 'S' },
]

const CATEGORIES = ['transport', 'household', 'care', 'errand']
const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  household: 'Household',
  care: 'Care',
  errand: 'Errand',
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Mirrors parseRecurrenceRule in apps/web/components/CreateRoutineModal.tsx
function parseRecurrenceRule(rule: string): { base: string; days: number[] } {
  if (rule.startsWith('weekly:')) {
    return { base: 'weekly', days: rule.slice(7).split(',').map(Number) }
  }
  return { base: rule, days: [1] }
}

interface RoutineSheetProps {
  visible: boolean
  familyId: string
  userId: string
  members: User[]
  templates: ResponsibilityTemplate[]
  /** Passing a flow switches the sheet to edit mode. */
  flow?: ResponsibilityFlowWithDetails | null
  onClose: () => void
  onSaved: () => void
}

export function RoutineSheet({
  visible,
  familyId,
  userId,
  members,
  templates,
  flow,
  onClose,
  onSaved,
}: RoutineSheetProps) {
  const isEditing = !!flow

  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [category, setCategory] = useState('household')
  const [recurrenceBase, setRecurrenceBase] = useState('weekdays')
  const [days, setDays] = useState<number[]>([1])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setError('')
    if (flow) {
      const { base, days: parsed } = parseRecurrenceRule(flow.recurrence_rule)
      setTitle(flow.title)
      setTemplateId(flow.template_id)
      setCategory(flow.category)
      setRecurrenceBase(base)
      setDays(parsed)
      setStartTime(flow.start_time?.slice(0, 5) ?? '')
      setEndTime(flow.end_time?.slice(0, 5) ?? '')
      setAssigneeId(flow.default_assignee_id)
    } else {
      setTitle('')
      setTemplateId(null)
      setCategory('household')
      setRecurrenceBase('weekdays')
      setDays([1])
      setStartTime('')
      setEndTime('')
      setAssigneeId(members[0]?.id ?? null)
    }
  }, [visible, flow, members])

  function applyTemplate(tpl: ResponsibilityTemplate) {
    const next = templateId === tpl.id ? null : tpl.id
    setTemplateId(next)
    if (next) {
      if (!title.trim()) setTitle(tpl.name)
      setCategory(tpl.category)
      if (tpl.default_start_time && !startTime) setStartTime(tpl.default_start_time.slice(0, 5))
    }
  }

  function toggleDay(iso: number) {
    setDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]))
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Give this routine a name')
      return
    }
    if (!assigneeId) {
      setError('Choose who is responsible')
      return
    }
    if (recurrenceBase === 'weekly' && days.length === 0) {
      setError('Pick at least one day')
      return
    }
    if (startTime && !TIME_RE.test(startTime)) {
      setError('Start time must be HH:MM')
      return
    }
    if (endTime && !TIME_RE.test(endTime)) {
      setError('End time must be HH:MM')
      return
    }

    const recurrenceRule =
      recurrenceBase === 'weekly' ? `weekly:${[...days].sort().join(',')}` : recurrenceBase

    setError('')
    setSaving(true)
    try {
      if (isEditing && flow) {
        await updateResponsibilityFlow(flow.id, {
          title: title.trim(),
          category,
          recurrence_rule: recurrenceRule,
          default_assignee_id: assigneeId,
          start_time: startTime || null,
          end_time: endTime || null,
        })
      } else {
        await createResponsibilityFlow({
          family_id: familyId,
          title: title.trim(),
          category,
          template_id: templateId,
          recurrence_rule: recurrenceRule,
          default_assignee_id: assigneeId,
          start_time: startTime || null,
          end_time: endTime || null,
          created_by: userId,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this routine')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal
      visible={visible}
      title={isEditing ? 'Edit routine' : 'New routine'}
      error={error}
      submitting={saving}
      submitLabel={isEditing ? 'Save changes' : 'Create routine'}
      onClose={onClose}
      onSubmit={handleSubmit}
      slideFrom={640}
    >
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isEditing && templates.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Start from a template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {templates.map((tpl) => {
                const active = templateId === tpl.id
                return (
                  <TouchableOpacity
                    key={tpl.id}
                    onPress={() => applyTemplate(tpl)}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{tpl.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. School run"
            placeholderTextColor={T.mutedInk}
            value={title}
            onChangeText={setTitle}
            selectionColor={T.accent}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = category === c
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.7}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {CATEGORY_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Repeats</Text>
          <View style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const active = recurrenceBase === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setRecurrenceBase(opt.value)}
                  activeOpacity={0.7}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {recurrenceBase === 'weekly' && (
            <View style={styles.dayRow}>
              {WEEKDAYS.map((d) => {
                const active = days.includes(d.iso)
                return (
                  <TouchableOpacity
                    key={d.iso}
                    onPress={() => toggleDay(d.iso)}
                    activeOpacity={0.7}
                    style={[styles.day, active && styles.dayActive]}
                    accessibilityLabel={`Day ${d.iso}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>{d.short}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.label}>Start time</Text>
            <TextInput
              style={styles.input}
              placeholder="07:00"
              placeholderTextColor={T.mutedInk}
              value={startTime}
              onChangeText={setStartTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              selectionColor={T.accent}
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.label}>End time</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={T.mutedInk}
              value={endTime}
              onChangeText={setEndTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              selectionColor={T.accent}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Responsible</Text>
          <View style={styles.chipRow}>
            {members.map((m) => {
              const active = assigneeId === m.id
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setAssigneeId(m.id)}
                  activeOpacity={0.7}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  body: {
    maxHeight: 420,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: T.bg,
  },
  chipActive: {
    borderColor: T.accent,
    backgroundColor: '#FFF5F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.mutedInk,
  },
  chipTextActive: {
    color: T.accent,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: {
    borderColor: T.accent,
    backgroundColor: T.accent,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.mutedInk,
  },
  dayTextActive: {
    color: 'white',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  timeField: {
    flex: 1,
  },
})
