'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatedLogo } from '@/components/AnimatedLogo'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    // Supabase invite uses implicit flow: tokens are in the hash fragment
    const hash = window.location.hash.substring(1) // remove the #
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    // Also check query params for PKCE flow fallback
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')

    if (code) {
      // PKCE flow — exchange code server-side
      const res = await fetch(`/auth/callback/exchange?code=${encodeURIComponent(code)}`)
      if (res.ok) {
        const data = await res.json()
        redirectToSetPassword(data)
        return
      }
    }

    if (accessToken && refreshToken) {
      // Implicit flow — we have the tokens directly
      // Decode the JWT to get user metadata
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const email = payload.email || ''
      const name = payload.user_metadata?.name || ''
      const userId = payload.user_metadata?.user_id || ''
      const familyId = payload.user_metadata?.family_id || ''

      // Email verification after signup — tokens are present but it's not an invite
      if (type === 'signup' || type === 'email_change') {
        router.replace('/onboarding')
        return
      }

      redirectToSetPassword({
        email,
        name,
        userId,
        familyId,
        accessToken,
        refreshToken,
      })
      return
    }

    // No valid tokens found
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
      <p className="text-sm text-gray-500 animate-pulse">Verifying invite...</p>
    </div>
  )
}
