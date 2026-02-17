import { getSupabase } from './client'
import type { Task } from '../types/database'

// Add this interface at the top of tasks.ts
export interface CreateTaskInput {
  family_id: string
  title: string
  created_by: string
  description?: string
  assigned_to?: string[]
  points?: number
  due_date?: string
  category?: string
}

export async function getTasks(familyId: string): Promise<Task[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTodaysTasks(familyId: string): Promise<Task[]> {
  const supabase = getSupabase()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .or(`due_date.is.null,due_date.lte.${todayStr}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTask(input: CreateTaskInput) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: input.family_id,
      title: input.title,
      description: input.description || null,
      assigned_to: input.assigned_to || [],
      points: input.points || 10,
      due_date: input.due_date || null,
      category: input.category || null,
      created_by: input.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string
    description?: string | null
    assigned_to?: string[] | null
    due_date?: string | null
    points?: number | null
    category?: string | null
  }
) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function completeTask(taskId: string, userId: string) {
  const supabase = getSupabase()
  
  const { data: task, error: updateError } = await supabase
    .from('tasks')
    .update({ 
      completed: true,
      completed_by: userId,
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single()

  if (updateError) throw updateError

  return task
}

export async function uncompleteTask(taskId: string) {
  const supabase = getSupabase()

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      completed: false,
      completed_by: null,
      completed_at: null,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function assignTask(taskId: string, userIds: string[]) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: userIds })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}