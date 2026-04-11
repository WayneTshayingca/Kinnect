import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'

const schema = z.object({
  authUserId: z.string().uuid(),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Verify the caller is the Google user they claim to be
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user: authUser }, error: authError } = await callerClient.auth.getUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { authUserId, email } = parsed.data

  // Ensure the token belongs to the auth user ID in the request body
  if (authUser.id !== authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check if a profile already exists for this Google auth user
  const { data: existingProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (existingProfile) {
    // Already fully set up — returning user
    return NextResponse.json({ merged: false, isNewUser: false })
  }

  // Look for another auth user with this email — i.e. a pending invite account
  const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })

  if (!listRes.ok) {
    logger.error('Failed to list auth users for Google merge check', { email })
    // Non-fatal: treat as new user so they still get in
    return NextResponse.json({ merged: false, isNewUser: true })
  }

  const { users: allAuthUsers } = await listRes.json()
  const inviteAuthUser = allAuthUsers?.find(
    (u: { id: string; email: string }) => u.email === email && u.id !== authUserId
  )

  if (!inviteAuthUser) {
    // No invite account found — genuinely new user
    return NextResponse.json({ merged: false, isNewUser: true })
  }

  // Check if that invite auth user has a profile row
  const { data: inviteProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('auth_user_id', inviteAuthUser.id)
    .maybeSingle()

  if (!inviteProfile) {
    // Invite auth user exists in auth.users but has no profile — treat as new user
    return NextResponse.json({ merged: false, isNewUser: true })
  }

  // Merge: point the existing profile at the new Google auth user
  const { error: updateError } = await adminClient
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('auth_user_id', inviteAuthUser.id)

  if (updateError) {
    logger.error('Failed to merge invite profile to Google auth user', updateError, { email })
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 })
  }

  // Clean up the now-orphaned invite auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(inviteAuthUser.id)
  if (deleteError) {
    // Non-fatal — profile is already re-linked, orphaned auth user is harmless
    logger.error('Failed to delete orphaned invite auth user', deleteError, { id: inviteAuthUser.id })
  }

  return NextResponse.json({ merged: true, isNewUser: false })
}
