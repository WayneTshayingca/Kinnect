'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFamily, getCurrentUser } from '@kinnect/core'

export default function OnboardingPage() {
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    console.log('=== Starting family creation ===')
    console.log('Family name:', familyName)
    
    console.log('Getting current user...')
    const user = await getCurrentUser()
    console.log('Current user:', user)
    
    if (!user) {
      setError('User not found')
      return
    }


    console.log('Creating family for user:', user.id)
    const family = await createFamily(familyName, user.id, 'en')
    console.log('Family created:', family)
    
    console.log('Redirecting to dashboard...')
    router.push('/dashboard')
  } catch (err: any) {
    console.error('Family creation error:', err)
    console.error('Error message:', err?.message)
    console.error('Error code:', err?.code)
    console.error('Error details:', err?.details)
    console.error('Full error:', JSON.stringify(err))
    setError(err?.message || err?.code || 'Failed to create family')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Kinnect!</h2>
          <p className="mt-2 text-gray-600">Let's create your family</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">
              Family Name
            </label>
            <input
              id="familyName"
              type="text"
              required
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="The Smiths"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              This could be your family name, a fun nickname, or anything you like!
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating family...' : 'Create Family'}
          </button>

          <div className="text-center text-xs text-gray-500">
            <p>You can add family members later from the dashboard</p>
          </div>
        </form>
      </div>
    </div>
  )
}