import { useCallback, useEffect, useState } from 'react'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@kinnect/core'
import { useRealtimeSubscription } from './useRealtimeSubscription'

/**
 * Portable notification feed: list + unread count + read actions, kept in
 * sync via postgres_changes. Each platform still wraps this in their own
 * useRealtimeSync (BroadcastChannel/visibilitychange on web, AppState on
 * mobile) for background refetch, same as every other data hook.
 */
export function useNotifications(familyId: string | null | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refetch = useCallback(async () => {
    if (!familyId) return
    const [list, count] = await Promise.all([
      getNotifications(),
      getUnreadNotificationCount(),
    ])
    setNotifications(list)
    setUnreadCount(count)
  }, [familyId])

  useEffect(() => { refetch() }, [refetch])

  useRealtimeSubscription(familyId, { notifications: refetch })

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await markNotificationRead(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
    await markAllNotificationsRead()
  }, [])

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch }
}
