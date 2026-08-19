import { getSupabase } from './client'
import type { Notification } from '../types/database'

export async function getNotifications(limit = 30): Promise<Notification[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) throw error
}
