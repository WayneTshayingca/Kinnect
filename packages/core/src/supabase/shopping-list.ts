import { getSupabase } from './client'
import type { List, ListItem } from '../types/database'

export interface ShoppingListData {
  list: List
  items: ListItem[]
  totalCount: number
}

export async function getShoppingList(familyId: string): Promise<ShoppingListData> {
  const supabase = getSupabase()

  // Get the family's shopping list
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (listError) throw listError
  if (!list) throw new Error('Shopping list not found')

  // Get incomplete items ordered by creation date
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

  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (listError) throw listError
  if (!list) throw new Error('Shopping list not found')

  // Get total count of incomplete items
  const { count } = await supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', list.id)
    .eq('completed', false)

  // Get limited items for preview
  const { data: items, error: itemsError } = await supabase
    .from('list_items')
    .select('*')
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

  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (listError) throw listError
  if (!list) throw new Error('Shopping list not found')

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

  // Get the family's shopping list
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (listError) throw listError
  if (!list) throw new Error('Shopping list not found')

  // Get max position
  const { data: maxPos } = await supabase
    .from('list_items')
    .select('position')
    .eq('list_id', list.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || 0) + 1

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

  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (listError) throw listError
  if (!list) throw new Error('Shopping list not found')

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', list.id)
    .eq('completed', true)

  if (error) throw error
}

export async function ensureShoppingList(familyId: string): Promise<List> {
  const supabase = getSupabase()

  // Try to get existing list
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'grocery')
    .single()

  if (existing) return existing

  // Create one if it doesn't exist (for families created before this feature)
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
