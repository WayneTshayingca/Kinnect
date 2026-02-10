import { getSupabase } from './client'
import type { CalendarEvent } from '../types/database'

export async function getCalendarEvents(
  familyId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> {
  const supabase = getSupabase()
  
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('family_id', familyId)

  if (startDate) {
    query = query.gte('start_time', startDate)
  }
  if (endDate) {
    query = query.lte('start_time', endDate)
  }

  const { data, error } = await query.order('start_time', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCalendarEvent(
  familyId: string,
  title: string,
  startTime: string,
  endTime: string,
  createdBy: string,
  description?: string,
  allDay = false
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      family_id: familyId,
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay,
      created_by: createdBy,
    })  // Remove "as any"
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(
  eventId: string,
  updates: {
    title?: string
    description?: string
    start_time?: string
    end_time?: string
    all_day?: boolean
  }
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)  // Remove "as any"
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(eventId: string) {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}