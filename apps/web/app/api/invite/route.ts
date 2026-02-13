import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').optional().default(''),
  userId: z.string().uuid('Invalid user ID'),
  familyId: z.string().uuid('Invalid family ID'),
})

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'Server not configured for invites. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { email, name, userId, familyId } = parsed.data

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Send the invite — Supabase creates an auth user and emails them
  const origin = request.nextUrl.origin
  const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: { name, user_id: userId, family_id: familyId },
      redirectTo: `${origin}/auth/callback`,
    }
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
