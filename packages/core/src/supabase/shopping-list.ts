import { getSupabase } from './client'
import type { List, ListItem } from '../types/database'

export interface ShoppingListData {
  list: List
  items: ListItem[]
  totalCount: number
}

async function getOrCreateList(familyId: string): Promise<List> {
  const supabase = getSupabase()

  // Use .limit(1) instead of .single()/.maybeSingle() to avoid errors
  // when there are 0 or multiple lists for the same family
  const { data: rows } = await supabase
    .from('lists')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .order('created_at', { ascending: true })
    .limit(1)

  if (rows && rows.length > 0) return rows[0]

  const { data: created, error } = await supabase
    .from('lists')
    .insert({
      family_id: familyId,
      type: 'grocery',
      name: 'Shopping List',
    })
    .select()
    .single()

  if (error) throw error
  return created
}

export async function getShoppingList(familyId: string): Promise<ShoppingListData> {
  const supabase = getSupabase()
  const list = await getOrCreateList(familyId)

  const { data: items, error: itemsError } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', list.id)
    .eq('completed', false)
    .order('created_at', { ascending: false })

  if (itemsError) throw itemsError

  return {
    list,
    items: items || [],
    totalCount: items?.length || 0,
  }
}

export async function getShoppingListPreview(familyId: string, limit = 4): Promise<ShoppingListData> {
  const supabase = getSupabase()
  const list = await getOrCreateList(familyId)

  // Single query: get items + total count together
  const { data: items, count, error: itemsError } = await supabase
    .from('list_items')
    .select('*', { count: 'exact' })
    .eq('list_id', list.id)
    .eq('completed', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (itemsError) throw itemsError

  return {
    list,
    items: items || [],
    totalCount: count || 0,
  }
}

export async function getFullShoppingList(familyId: string): Promise<{
  list: List
  incompleteItems: ListItem[]
  completedItems: ListItem[]
}> {
  const supabase = getSupabase()
  const list = await getOrCreateList(familyId)

  const [incompleteResult, completedResult] = await Promise.all([
    supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .eq('completed', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(20),
  ])

  if (incompleteResult.error) throw incompleteResult.error
  if (completedResult.error) throw completedResult.error

  return {
    list,
    incompleteItems: incompleteResult.data || [],
    completedItems: completedResult.data || [],
  }
}

export async function addShoppingListItem(
  familyId: string,
  userId: string,
  data: { title: string; quantity?: string; notes?: string }
): Promise<ListItem> {
  const supabase = getSupabase()
  const list = await getOrCreateList(familyId)

  const { data: maxPosRows } = await supabase
    .from('list_items')
    .select('position')
    .eq('list_id', list.id)
    .order('position', { ascending: false })
    .limit(1)

  const newPosition = (maxPosRows?.[0]?.position || 0) + 1

  const { data: item, error } = await supabase
    .from('list_items')
    .insert({
      list_id: list.id,
      title: data.title,
      quantity: data.quantity || null,
      notes: data.notes || null,
      added_by: userId,
      position: newPosition,
    })
    .select()
    .single()

  if (error) throw error
  return item
}

export async function toggleShoppingListItem(
  itemId: string,
  completed: boolean,
  userId: string
): Promise<ListItem> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {
    completed,
    updated_at: new Date().toISOString(),
  }

  if (completed) {
    updateData.completed_by = userId
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_by = null
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('list_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateShoppingListItem(
  itemId: string,
  data: { title: string }
): Promise<ListItem> {
  const supabase = getSupabase()

  const { data: item, error } = await supabase
    .from('list_items')
    .update({
      title: data.title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return item
}

export async function deleteShoppingListItem(itemId: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

export async function clearCompletedItems(familyId: string): Promise<void> {
  const supabase = getSupabase()
  const list = await getOrCreateList(familyId)

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', list.id)
    .eq('completed', true)

  if (error) throw error
}

export async function ensureShoppingList(familyId: string): Promise<List> {
  return getOrCreateList(familyId)
}
