'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { getSupabase, updateFamilyMember } from '@kinnect/core'
import { Eye, EyeOff } from 'lucide-react'

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordContent />
    </Suspense>
  )
}

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const email = searchParams.get('email') || ''
  const nameParam = searchParams.get('name') || ''
  const userId = searchParams.get('user_id') || ''
  const familyId = searchParams.get('family_id') || ''
  const accessToken = searchParams.get('access_token') || ''
  const refreshToken = searchParams.get('refresh_token') || ''

  const [name, setName] = useState(nameParam)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      setError('Invalid invite link. Please ask your family admin to resend the invite.')
      return
    }

    const supabase = getSupabase()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError('Failed to verify invite. Please ask your family admin to resend.')
        } else {
          setSessionReady(true)
        }
      })
  }, [accessToken, refreshToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const supabase = getSupabase()

      // Set the user's password
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Update the user's name
      if (userId) {
        await updateFamilyMember(userId, { name: name.trim() }).catch(() => {
          // Non-critical — name was already set during addFamilyMember
        })
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left branding panel */}
      <div className="md:w-1/2 bg-primary-800 text-white flex flex-col justify-between p-8 md:p-12 lg:p-16">
        <div>
          <Logo variant="full" color="white" size="md" />
        </div>

        <div className="my-auto py-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Welcome to the{' '}
            <span className="text-accent-500">Family</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-md">
            You&apos;ve been invited to join your family on Kinnect.
            Set a password to get started.
          </p>
        </div>

        <div className="hidden md:block text-sm text-white/50">
          <p>Built for South African families</p>
          <p>Supporting the whole family circle — members, dependents, and more</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Set your password</h2>
            <p className="mt-2 text-gray-600">
              Complete your account setup to join your family
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  readOnly
                  value={email}
                  className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Setting up...' : 'Join Family'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
