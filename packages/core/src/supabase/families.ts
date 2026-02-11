import { getSupabase } from './client'
import type { Family, User } from '../types/database'

export async function createFamily(name: string, userId: string, primaryLanguage = 'en') {
  const supabase = getSupabase()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')

  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name,
      primary_language: primaryLanguage
    })  // Remove "as any"
    .select()
    .single()

  if (familyError) throw familyError
  if (!family) throw new Error('Failed to create family')

  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      auth_user_id: authUser.id,
      family_id: family.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      role: 'parent'
    }, {  // Remove "as any"
      onConflict: 'id'
    })

  if (userError) throw userError

  return family
}

// Also fix addFamilyMember
export async function addFamilyMember(
  familyId: string,
  name: string,
  role: 'parent' | 'grandparent' | 'child' | 'domestic_worker'
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      family_id: familyId,
      name,
      role,
    })  // Remove "as any"
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single()

  if (error) throw error
  return data
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function updateFamily(
  familyId: string,
  updates: { name?: string; primary_language?: string }
) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', familyId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFamilyMember(
  memberId: string,
  updates: { name?: string; role?: string; phone?: string | null }
) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeFamilyMember(memberId: string) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}