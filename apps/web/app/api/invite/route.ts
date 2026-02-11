import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.' },
      { status: 500 }
    )
  }

  const { email, userId, familyId } = await request.json()

  if (!email || !userId || !familyId) {
    return NextResponse.json(
      { error: 'Missing required fields: email, userId, familyId' },
      { status: 400 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Send the invite — Supabase creates an auth user and emails them
  const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    { data: { user_id: userId, family_id: familyId } }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // Link the auth user to the existing member record
  if (authData?.user?.id) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authData.user.id })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to link auth user to member:', updateError)
    }
  }

  return NextResponse.json({ success: true })
}
