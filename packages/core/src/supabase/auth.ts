import { getSupabase } from './client'
import type { User } from '../types/database'

export async function signUp(email: string, password: string, name: string) {
  const supabase = getSupabase()
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned from signup')

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      name,
      role: 'parent', // Default role
    } as any)

  if (profileError) throw profileError

  return authData
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (error) throw error
  return userData
}

export async function getSession() {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
