'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { AnimatedLogo } from '@/components/AnimatedLogo'
import { signIn } from '@kinnect/core'
import { Eye, EyeOff } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showTransition, setShowTransition] = useState(false)

  // Prefetch dashboard for faster transition after login
  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  // If Supabase redirects here with tokens in the hash, forward appropriately
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      if (hash.includes('type=invite')) {
        router.replace(`/auth/callback${hash}`)
      } else if (hash.includes('type=recovery')) {
        router.replace(`/auth/reset-password${hash}`)
      }
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      setShowTransition(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setLoading(false)
    }
  }

  if (showTransition) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center gap-4">
        <AnimatedLogo
          size="xl"
          color="primary"
          repeat={false}
          onComplete={() => router.push('/dashboard')}
        />
      </div>
    )
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
            Coordinate Your Family,{' '}
            <span className="text-accent-500">Together</span>
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-md">
            Africa&#39;s family coordination platform for multi-generational
            households. Manage tasks, events, and stay connected.
          </p>
        </div>

        <div className="hidden md:block text-sm text-white/50">
          <p>Built for South African families</p>
          <p>Supporting the whole family circle — members, dependents, and more</p>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="md:w-1/2 flex flex-1 items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your Kinnect account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm text-accent-600 hover:text-accent-700 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don&#39;t have an account? </span>
              <Link href="/auth/signup" className="text-accent-600 hover:text-accent-700 font-medium">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
