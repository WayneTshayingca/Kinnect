import { getSupabase } from './client'
import type { Family, User } from '../types/database'

export async function createFamily(name: string, primaryLanguage = 'en') {
  const supabase = getSupabase()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')

  const userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'

  const { data: familyId, error } = await supabase.rpc('create_family_with_user', {
    family_name: name,
    auth_uid: authUser.id,
    user_name: userName,
    primary_lang: primaryLanguage,
  })

  if (error) throw error
  if (!familyId) throw new Error('Failed to create family')

  // User record now exists, so RLS allows reading the family
  const { data: family, error: fetchError } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single()

  if (fetchError) throw fetchError
  return family as Family
}

// Also fix addFamilyMember
export async function addFamilyMember(
  familyId: string,
  name: string,
  role: 'admin' | 'member' | 'dependent' | 'observer'
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      family_id: familyId,
      name,
      role,
    })
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

  // Safety: prevent deleting your own user record
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const { data: selfRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
    if (selfRecord && selfRecord.id === memberId) {
      throw new Error('You cannot remove yourself from the family')
    }
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}