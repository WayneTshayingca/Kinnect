import { getSupabase } from './client'
import type { User } from '../types/database'

export async function signInWithGoogle(redirectTo: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = getSupabase()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned from signup')

  // Create user profile — if this fails, clean up the orphaned auth user
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      name,
      role: 'admin',
    })

  if (profileError) {
    await supabase.auth.signOut().catch(() => {})
    throw new Error(`Signup failed: could not create user profile. ${profileError.message}`)
  }

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

  // getUser() validates the JWT against Supabase (network call),
  // ensuring the token hasn't been tampered with or revoked
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (error) throw error
  return userData
}

export async function changePassword(newPassword: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return data
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = getSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function getSession() {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
