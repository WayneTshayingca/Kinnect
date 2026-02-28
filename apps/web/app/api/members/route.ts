import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'

const addMemberSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'member', 'dependent', 'observer']),
})

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Verify the caller is authenticated
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
  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { familyId, name, role } = parsed.data

  // Verify the caller is an admin in the target family
  const { data: callerRecord } = await callerClient
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!callerRecord || callerRecord.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can add family members' }, { status: 403 })
  }

  // Use service role to bypass RLS for the insert
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: newUser, error: userError } = await adminClient
    .from('users')
    .insert({ family_id: familyId, active_family_id: familyId, name, role })
    .select()
    .single()

  if (userError) {
    logger.error('Failed to create family member', userError, { familyId, role })
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  const { error: memberError } = await adminClient
    .from('family_members')
    .insert({ family_id: familyId, user_id: newUser.id, role })

  if (memberError) {
    logger.error('Failed to add to family_members', memberError, { familyId, userId: newUser.id })
    // Clean up the orphaned user record
    await adminClient.from('users').delete().eq('id', newUser.id)
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json({ user: newUser })
}
