import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getFamily } from '@kinnect/core'
import { useNotifications } from '@kinnect/hooks'
import { useUser } from '@/components/providers/user-provider'
import { Avatar } from '@/components/Avatar'
import { KinnectMark } from '@/components/KinnectMark'
import { FamilySwitcherSheet } from '@/components/FamilySwitcherSheet'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { DS } from '@/lib/theme'

// Persistent top bar. In the design this sits above every screen, not just the
// dashboard — it's how you switch family and reach notifications from anywhere.
// Mounted once in app/(tabs)/_layout.tsx so all tabs share one instance.
//
// Was DashboardHeader, which took familyName as a prop from the dashboard; now
// it resolves the family itself since it no longer has a single owning screen.

export function AppHeader() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, refreshUser } = useUser()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.family_id)

  const [familyName, setFamilyName] = useState('Kinnect')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // active_family_id drives RLS; family_id is the legacy first-family column.
  const familyId = user?.active_family_id ?? user?.family_id

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    getFamily(familyId)
      .then((f) => { if (!cancelled && f?.name) setFamilyName(f.name) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [familyId])

  return (
    <>
      <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSwitcherOpen(true)}
          style={styles.family}
          accessibilityLabel="Switch family"
        >
          <View style={styles.mark}>
            <KinnectMark size={18} />
          </View>
          <Text style={styles.familyName} numberOfLines={1}>{familyName}</Text>
          <Ionicons name="chevron-down" size={15} color={DS.inkFaint} />
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setNotifOpen(true)}
            style={styles.bell}
            accessibilityLabel={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            }
          >
            <Ionicons name="notifications-outline" size={18} color={DS.inkMuted} />
            {unreadCount > 0 && <View style={styles.unread} />}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Your profile"
          >
            {user && <Avatar name={user.name} role={user.role} size={34} borderWidth={0} />}
          </TouchableOpacity>
        </View>
      </View>

      <FamilySwitcherSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onSwitched={refreshUser}
      />
      <NotificationsPanel
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
      />
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DS.border,
  },
  family: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: DS.radius.chip,
    backgroundColor: DS.indigo600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.15,
    color: DS.indigo600,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: DS.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.coral,
    borderWidth: 2,
    borderColor: '#fff',
  },
})
