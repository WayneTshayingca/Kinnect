import { getSupabase } from './client'
import type { ResponsibilityTemplate, ResponsibilityFlow, ResponsibilityOccurrence } from '../types/database'

export type { ResponsibilityTemplate, ResponsibilityFlow, ResponsibilityOccurrence }

// ── Joined type returned by getTodaysResponsibilities / getWeekResponsibilities ─

export interface ResponsibilityOccurrenceWithFlow extends ResponsibilityOccurrence {
  flow_title: string
  category: string
  icon: string | null
  assignee_name: string
  assignee_role: string | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getResponsibilityTemplates(): Promise<ResponsibilityTemplate[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_templates')
    .select('*')
    .eq('is_system', true)
    .order('name')
  if (error) throw error
  return data || []
}

export interface CreateResponsibilityFlowInput {
  family_id: string
  title: string
  category: string
  template_id?: string | null
  recurrence_rule: string
  default_assignee_id: string
  backup_assignee_ids?: string[]
  start_time?: string | null
  created_by: string
}

export async function createResponsibilityFlow(
  input: CreateResponsibilityFlowInput
): Promise<ResponsibilityFlow> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_flows')
    .insert({
      family_id:           input.family_id,
      title:               input.title,
      category:            input.category,
      template_id:         input.template_id ?? null,
      recurrence_rule:     input.recurrence_rule,
      default_assignee_id: input.default_assignee_id,
      backup_assignee_ids: input.backup_assignee_ids ?? [],
      start_time:          input.start_time ?? null,
      created_by:          input.created_by,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getTodaysResponsibilities(
  familyId: string
): Promise<ResponsibilityOccurrenceWithFlow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_occurrences')
    .select(`
      *,
      responsibility_flows!inner (
        title,
        category,
        active,
        responsibility_templates ( icon )
      ),
      users!responsibility_occurrences_assigned_to_fkey ( name, role )
    `)
    .eq('family_id', familyId)
    .eq('scheduled_for', todayStr())
    .eq('responsibility_flows.active', true)
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (error) throw error

  return (data || []).map((row) => {
    const flow = row.responsibility_flows as {
      title: string
      category: string
      responsibility_templates: { icon: string } | null
    }
    const user = row.users as { name: string; role: string | null } | null
    return {
      id:              row.id,
      flow_id:         row.flow_id,
      family_id:       row.family_id,
      scheduled_for:   row.scheduled_for,
      scheduled_time:  row.scheduled_time,
      assigned_to:     row.assigned_to,
      status:          row.status,
      override_reason: row.override_reason,
      completed_at:    row.completed_at,
      completed_by:    row.completed_by,
      created_at:      row.created_at,
      flow_title:      flow.title,
      category:        flow.category,
      icon:            flow.responsibility_templates?.icon ?? null,
      assignee_name:   user?.name ?? '?',
      assignee_role:   user?.role ?? null,
    }
  })
}

export async function getWeekResponsibilities(
  familyId: string
): Promise<ResponsibilityOccurrenceWithFlow[]> {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_occurrences')
    .select(`
      *,
      responsibility_flows!inner (
        title,
        category,
        active,
        responsibility_templates ( icon )
      ),
      users!responsibility_occurrences_assigned_to_fkey ( name, role )
    `)
    .eq('family_id', familyId)
    .gte('scheduled_for', fmt(weekStart))
    .lte('scheduled_for', fmt(weekEnd))
    .eq('responsibility_flows.active', true)
    .order('scheduled_for', { ascending: true })
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (error) throw error

  return (data || []).map((row) => {
    const flow = row.responsibility_flows as {
      title: string
      category: string
      responsibility_templates: { icon: string } | null
    }
    const user = row.users as { name: string; role: string | null } | null
    return {
      id:              row.id,
      flow_id:         row.flow_id,
      family_id:       row.family_id,
      scheduled_for:   row.scheduled_for,
      scheduled_time:  row.scheduled_time,
      assigned_to:     row.assigned_to,
      status:          row.status,
      override_reason: row.override_reason,
      completed_at:    row.completed_at,
      completed_by:    row.completed_by,
      created_at:      row.created_at,
      flow_title:      flow.title,
      category:        flow.category,
      icon:            flow.responsibility_templates?.icon ?? null,
      assignee_name:   user?.name ?? '?',
      assignee_role:   user?.role ?? null,
    }
  })
}

export async function reassignOccurrence(
  occurrenceId: string,
  newAssigneeId: string,
  reason?: string
): Promise<ResponsibilityOccurrence> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_occurrences')
    .update({
      assigned_to:     newAssigneeId,
      status:          'reassigned',
      override_reason: reason ?? null,
    })
    .eq('id', occurrenceId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeOccurrence(
  occurrenceId: string,
  userId: string
): Promise<ResponsibilityOccurrence> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_occurrences')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq('id', occurrenceId)
    .select()
    .single()
  if (error) throw error
  return data
}

export interface UpdateResponsibilityFlowInput {
  title:               string
  category:            string
  recurrence_rule:     string
  default_assignee_id: string
  start_time:          string | null
}

export async function updateResponsibilityFlow(
  flowId: string,
  input: UpdateResponsibilityFlowInput
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('update_responsibility_flow', {
    p_flow_id:             flowId,
    p_title:               input.title,
    p_category:            input.category,
    p_recurrence_rule:     input.recurrence_rule,
    p_default_assignee_id: input.default_assignee_id,
    p_start_time:          input.start_time,
  })
  if (error) throw error
}

export async function uncompleteOccurrence(
  occurrenceId: string
): Promise<ResponsibilityOccurrence> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_occurrences')
    .update({
      status:       'pending',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', occurrenceId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Flow joined type ────────────────────────────────────────────────────────

export interface ResponsibilityFlowWithDetails extends ResponsibilityFlow {
  icon: string | null
  assignee_name: string
  assignee_role: string | null
}

export async function getResponsibilityFlows(
  familyId: string
): Promise<ResponsibilityFlowWithDetails[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('responsibility_flows')
    .select(`
      *,
      responsibility_templates ( icon ),
      users!responsibility_flows_default_assignee_id_fkey ( name, role )
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((row) => {
    const template = row.responsibility_templates as { icon: string } | null
    const user = row.users as { name: string; role: string | null } | null
    return {
      id:                  row.id,
      family_id:           row.family_id,
      title:               row.title,
      category:            row.category,
      template_id:         row.template_id,
      recurrence_rule:     row.recurrence_rule,
      default_assignee_id: row.default_assignee_id,
      backup_assignee_ids: row.backup_assignee_ids,
      start_time:          row.start_time,
      active:              row.active,
      created_by:          row.created_by,
      created_at:          row.created_at,
      icon:                template?.icon ?? null,
      assignee_name:       user?.name ?? '?',
      assignee_role:       user?.role ?? null,
    }
  })
}

export async function deactivateFlow(flowId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('responsibility_flows')
    .update({ active: false })
    .eq('id', flowId)
  if (error) throw error
}