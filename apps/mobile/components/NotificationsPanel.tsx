import { Modal, View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native'
import { type Notification } from '@kinnect/core'

interface NotificationsPanelProps {
  visible: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function NotificationsPanel({ visible, onClose, notifications, onMarkRead, onMarkAllRead }: NotificationsPanelProps) {
  const hasUnread = notifications.some((n) => !n.read_at)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl pb-8 pt-2 px-4 max-h-[75%]" onPress={(e) => e.stopPropagation()}>
          <View className="w-10 h-1.5 rounded-full bg-primary-100 self-center my-3" />
          <View className="flex-row items-center justify-between px-2 mb-2">
            <Text className="text-xs font-bold uppercase tracking-wide text-primary-300">
              Notifications
            </Text>
            {hasUnread && (
              <TouchableOpacity onPress={onMarkAllRead} activeOpacity={0.7}>
                <Text className="text-xs font-bold text-accent-500">Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {notifications.length === 0 ? (
            <View className="py-12 items-center gap-2">
              <Text className="text-3xl">🔔</Text>
              <Text className="text-sm font-bold text-primary-600">You're all caught up</Text>
              <Text className="text-xs text-primary-300">Nothing new to see here.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.7}
                  onPress={() => !n.read_at && onMarkRead(n.id)}
                  className="flex-row items-start gap-3 px-2 py-3 border-b border-black/5"
                >
                  <View className={`w-2 h-2 rounded-full mt-1.5 ${n.read_at ? 'bg-transparent' : 'bg-accent-500'}`} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-primary-600">{n.title}</Text>
                    {n.body && <Text className="text-xs text-primary-300 mt-0.5">{n.body}</Text>}
                  </View>
                  <Text className="text-[10px] text-primary-300">{timeAgo(n.created_at)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
