import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DS, DS_SHADOW } from '@/lib/theme'

// White 24px card with the brand's indigo-tinted shadow. The design system is
// explicit that cards carry shadow only — no borders, no left-bar accents.

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode
  style?: ViewStyle
  /** Off for grouped row lists that need their dividers to reach the edges. */
  padded?: boolean
}) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children as any}
    </View>
  )
}

interface CardHeaderProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  /** Domain tint for the icon chip. */
  tint?: keyof typeof DS.chipTint
  /** Trailing coral text link. */
  actionLabel?: string
  onAction?: () => void
  /** Trailing static text instead of a link, e.g. "3 LEFT". */
  meta?: string
}

export function CardHeader({
  icon,
  title,
  tint = 'tasks',
  actionLabel,
  onAction,
  meta,
}: CardHeaderProps) {
  const [chipBg, chipFg] = DS.chipTint[tint]

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.headerChip, { backgroundColor: chipBg }]}>
          <Ionicons name={icon} size={16} color={chipFg} />
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : meta ? (
        <Text style={styles.headerMeta}>{meta}</Text>
      ) : null}
    </View>
  )
}

/** Small uppercase label that sits above a card, not inside it. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children as any}</Text>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.card,
    borderRadius: DS.radius.card,
    ...DS_SHADOW.card,
  },
  padded: {
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  headerChip: {
    width: 30,
    height: 30,
    borderRadius: DS.radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.indigo600,
    flexShrink: 1,
  },
  headerAction: {
    color: DS.coral,
    fontSize: 13,
    fontWeight: '600',
  },
  headerMeta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: DS.indigo500,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: DS.inkMuted,
    marginHorizontal: 4,
    marginBottom: 8,
  },
})
