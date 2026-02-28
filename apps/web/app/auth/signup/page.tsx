'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { signUp } from '@kinnect/core'
import { Eye, EyeOff, MailCheck } from 'lucide-react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, name)
      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <main className="min-h-screen flex flex-col md:flex-row">
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

        <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-accent-500" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-3 text-gray-600">
                We sent a verification link to <span className="font-semibold text-gray-900">{email}</span>.
                Click the link in that email to activate your account.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Didn&#39;t receive it? Check your spam folder, or{' '}
              <button
                onClick={() => { setEmailSent(false); setPassword(''); setConfirmPassword('') }}
                className="text-accent-600 hover:text-accent-700 font-medium"
              >
                try again
              </button>
              .
            </p>
            <div className="pt-4 border-t border-gray-100">
              <Link href="/" className="text-sm text-accent-600 hover:text-accent-700 font-medium">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
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

      {/* Right sign-up panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-gray-600">Start coordinating with your family</p>
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
                  Full name
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white"
                  placeholder="you@example.com"
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
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <div className="relative mt-1">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full px-4 py-3 pr-12 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-gray-900 bg-white ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/" className="text-accent-600 hover:text-accent-700 font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
