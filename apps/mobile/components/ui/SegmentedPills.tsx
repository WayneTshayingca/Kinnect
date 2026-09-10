import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { DS } from '@/lib/theme'

// Lavender-track segmented control. The design uses this for the tasks
// status filter, the calendar view switcher, and the billing period toggle;
// routines.tsx had hand-rolled its own.

export interface Segment<T extends string> {
  value: T
  label: string
  /** Appended to the label, e.g. a count. */
  badge?: number | string
}

export function SegmentedPills<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View style={styles.track}>
      {segments.map((s) => {
        const active = s.value === value
        return (
          <TouchableOpacity
            key={s.value}
            onPress={() => onChange(s.value)}
            activeOpacity={0.7}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {s.label}
              {s.badge !== undefined && s.badge !== '' ? ` ${s.badge}` : ''}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: DS.lavender,
    borderRadius: DS.radius.pill,
    padding: 3,
  },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillActive: {
    backgroundColor: '#fff',
    shadowColor: DS.indigo600,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.inkMuted,
  },
  labelActive: {
    color: DS.indigo600,
    fontWeight: '700',
  },
})
