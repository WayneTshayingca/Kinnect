import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DS, DS_SHADOW } from '@/lib/theme'

// The design system's screen header: a dark indigo banner CARD that sits on the
// light surface, rather than a full-bleed bar. Every non-home screen opens with
// one, which is what replaced the three different header treatments the app had
// grown (white rounded panel, flat dark bar, none).

interface ScreenBannerProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  /** Secondary line under the title. Pass a node for mixed-colour stats. */
  subtitle?: React.ReactNode
  /** Optional back chevron shown before the icon chip. */
  onBack?: () => void
  /** Trailing action — an icon button, or a labelled pill when `actionLabel` is set. */
  actionIcon?: keyof typeof Ionicons.glyphMap
  actionLabel?: string
  onAction?: () => void
  /** Coral fill on the action, for the primary create action. */
  actionAccent?: boolean
}

export function ScreenBanner({
  icon,
  title,
  subtitle,
  onBack,
  actionIcon,
  actionLabel,
  onAction,
  actionAccent = false,
}: ScreenBannerProps) {
  const hasAction = !!onAction && (!!actionIcon || !!actionLabel)

  return (
    <View style={styles.banner}>
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.iconChip}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {typeof subtitle === 'string'
          ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          : subtitle
            // Cast: root has @types/react 18, apps/mobile has 19 — the hoisted
            // duplicate makes ReactNode's bigint arm fail to match here (same
            // workaround as BottomSheetModal.tsx).
            ? <View style={styles.subtitleRow}>{subtitle as any}</View>
            : null}
      </View>

      {hasAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.85}
          accessibilityLabel={actionLabel ?? title}
          style={[
            actionLabel ? styles.actionPill : styles.actionSquare,
            actionAccent ? styles.actionAccent : styles.actionGlass,
          ]}
        >
          {actionIcon && (
            <Ionicons name={actionIcon} size={actionLabel ? 16 : 18} color="#fff" />
          )}
          {actionLabel && <Text style={styles.actionLabel}>{actionLabel}</Text>}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: DS.indigo900,
    borderRadius: DS.radius.banner,
    padding: 16,
    ...DS_SHADOW.banner,
  },
  back: {
    marginRight: -4,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.iconChip,
    backgroundColor: DS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.indigo300,
    marginTop: 3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },

  actionSquare: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  actionAccent: {
    backgroundColor: DS.coral,
  },
  actionGlass: {
    backgroundColor: DS.glass,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})

/** Stat fragment for a banner subtitle, e.g. "5 pending · 3 done". */
export function BannerStat({ value, tone = 'muted' }: { value: string; tone?: 'muted' | 'success' }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: tone === 'success' ? '700' : '600',
        color: tone === 'success' ? DS.success : DS.indigo300,
      }}
    >
      {value}
    </Text>
  )
}

export function BannerDot() {
  return <Text style={{ color: 'rgba(255,255,255,0.3)' }}>·</Text>
}
