import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@/components/providers/user-provider'
import { useNotifications } from '@kinnect/hooks'
import { Avatar } from '@/components/Avatar'
import { KinnectMark } from '@/components/KinnectMark'
import { FamilySwitcherSheet } from '@/components/FamilySwitcherSheet'
import { NotificationsPanel } from '@/components/NotificationsPanel'

interface DashboardHeaderProps {
  familyName: string
  paddingTop: number
}

export function DashboardHeader({ familyName, paddingTop }: DashboardHeaderProps) {
  const router = useRouter()
  const { user, refreshUser } = useUser()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.family_id)

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <View
        style={{ paddingTop: paddingTop + 12 }}
        className="flex-row items-center justify-between px-4 pb-3 bg-white border-b border-black/[0.06]"
      >
        {/* Family switcher */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSwitcherOpen(true)}
          className="flex-row items-center gap-2 min-w-0"
        >
          <View className="w-8 h-8 rounded-[10px] bg-primary-800 items-center justify-center">
            <KinnectMark size={18} />
          </View>
          <Text className="text-[17px] font-extrabold text-primary-600" numberOfLines={1}>
            {familyName}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Bell + avatar */}
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setNotifOpen(true)}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="notifications-outline" size={18} color="#6B7280" />
            {unreadCount > 0 && (
              <View className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-500" />
            )}
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
            {user && <Avatar name={user.name} role={user.role} size={36} borderWidth={0} />}
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
