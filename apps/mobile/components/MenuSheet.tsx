import { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { DS } from '@/lib/theme'

// The design's 5th tab is not a destination — it opens an anchored sheet just
// above the tab bar. Entries are shortcuts to screens that don't warrant a tab
// of their own, plus the one accent row for upgrading.

type MenuRoute = '/profile' | '/routines' | '/account-security' | '/paywall'

interface MenuEntry {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: MenuRoute
  /** Coral treatment — the design allows exactly one accent row. */
  accent?: boolean
}

const ENTRIES: MenuEntry[] = [
  { key: 'profile', label: 'Family & profile', icon: 'person-outline', route: '/profile' },
  { key: 'routines', label: 'Routines', icon: 'repeat-outline', route: '/routines' },
  { key: 'security', label: 'Security', icon: 'lock-closed-outline', route: '/account-security' },
  { key: 'plans', label: 'Upgrade to Premium', icon: 'sparkles-outline', route: '/paywall', accent: true },
]

export function MenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const slide = useRef(new Animated.Value(12)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      slide.setValue(12)
      fade.setValue(0)
    }
  }, [visible, slide, fade])

  function go(route: MenuRoute) {
    onClose()
    router.push(route)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View
        style={[
          styles.sheet,
          // Clears the tab bar, which is 64pt plus the home-indicator inset.
          { bottom: 64 + insets.bottom + 14, opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        {ENTRIES.map((entry) => {
          const [chipBg, chipFg] = entry.accent ? DS.chipTint.premium : DS.chipTint.tasks
          return (
            <TouchableOpacity
              key={entry.key}
              onPress={() => go(entry.route)}
              activeOpacity={0.7}
              style={styles.row}
            >
              <View style={[styles.chip, { backgroundColor: chipBg }]}>
                <Ionicons name={entry.icon} size={18} color={chipFg} />
              </View>
              <Text style={[styles.label, entry.accent && styles.labelAccent]}>
                {entry.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={DS.inkFaint} />
            </TouchableOpacity>
          )
        })}
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,14,30,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: DS.radius.sheet,
    padding: 8,
    shadowColor: DS.indigo600,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: DS.radius.pill,
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: DS.indigo600,
  },
  labelAccent: {
    color: DS.coral,
  },
})
