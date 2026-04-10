'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@kinnect/core'
import { AnimatedLogo } from '@/components/AnimatedLogo'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')

    // Hash fragment — implicit flow (email invite tokens)
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    if (code) {
      // PKCE flow — Google OAuth or email invite
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data.user) {
        router.replace('/?error=auth_failed')
        return
      }

      const providers: string[] = data.user.app_metadata?.providers ?? []

      if (providers.includes('google')) {
        // Ask the server to check for a pending invite account with this email
        // and merge it into this Google auth user if found
        const res = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            authUserId: data.user.id,
            email: data.user.email,
          }),
        })

        if (!res.ok) {
          router.replace('/?error=auth_failed')
          return
        }

        const { merged, isNewUser } = await res.json()

        if (!isNewUser || merged) {
          // Returning user or successfully merged invite account
          router.replace('/dashboard')
          return
        }

        // Genuinely new user — create profile and send to onboarding
        const name =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'User'

        await supabase.from('users').insert({
          auth_user_id: data.user.id,
          name,
          role: 'admin',
        })

        router.replace('/onboarding')
        return
      }

      // Email invite PKCE — redirect to set-password
      redirectToSetPassword({
        email: data.user.email || '',
        name: data.user.user_metadata?.name || '',
        userId: data.user.user_metadata?.user_id || '',
        familyId: data.user.user_metadata?.family_id || '',
        accessToken: data.session?.access_token || '',
        refreshToken: data.session?.refresh_token || '',
      })
      return
    }

    if (accessToken && refreshToken) {
      // Implicit flow — tokens in hash
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const providers: string[] = payload.app_metadata?.providers ?? []

      if (providers.includes('google')) {
        // Establish the session so subsequent calls are authenticated
        const supabase = getSupabase()
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

        const res = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            authUserId: payload.sub,
            email: payload.email,
          }),
        })

        if (!res.ok) {
          router.replace('/?error=auth_failed')
          return
        }

        const { merged, isNewUser } = await res.json()

        if (!isNewUser || merged) {
          router.replace('/dashboard')
          return
        }

        // Genuinely new Google user — create profile and send to onboarding
        const name =
          payload.user_metadata?.full_name ||
          payload.user_metadata?.name ||
          payload.email?.split('@')[0] ||
          'User'

        await supabase.from('users').insert({
          auth_user_id: payload.sub,
          name,
          role: 'admin',
        })

        router.replace('/onboarding')
        return
      }

      // Email invite / verification implicit flow
      const email = payload.email || ''
      const name = payload.user_metadata?.name || ''
      const userId = payload.user_metadata?.user_id || ''
      const familyId = payload.user_metadata?.family_id || ''

      if (type === 'signup' || type === 'email_change') {
        router.replace('/onboarding')
        return
      }

      redirectToSetPassword({ email, name, userId, familyId, accessToken, refreshToken })
      return
    }

    router.replace('/?error=invalid_invite')
  }

  function redirectToSetPassword(data: {
    email: string
    name: string
    userId: string
    familyId: string
    accessToken: string
    refreshToken: string
  }) {
    const params = new URLSearchParams({
      email: data.email,
      name: data.name,
      user_id: data.userId,
      family_id: data.familyId,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    })
    router.replace(`/auth/set-password?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <AnimatedLogo size="xl" color="primary" />
      <p className="text-sm text-gray-500 animate-pulse">Signing you in...</p>
    </div>
  )
}
