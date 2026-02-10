'use client'

import { useEffect, useState } from 'react'
import { getSupabase, getCurrentUser } from '@kinnect/core'

export default function TestPage() {
  const [results, setResults] = useState<any>({})

  useEffect(() => {
    async function runTests() {
      const tests: any = {}
      
      try {
        // Test 1: Check if Supabase is initialized
        tests.supabaseInitialized = 'Checking...'
        const supabase = getSupabase()
        tests.supabaseInitialized = 'Yes ✓'
        
        // Test 2: Check auth session
        tests.authSession = 'Checking...'
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          tests.authSession = `Error: ${sessionError.message}`
        } else if (session) {
          tests.authSession = `Yes ✓ User ID: ${session.user.id}`
        } else {
          tests.authSession = 'No session found'
        }
        
        // Test 3: Check auth user
        tests.authUser = 'Checking...'
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          tests.authUser = `Error: ${userError.message}`
        } else if (user) {
          tests.authUser = `Yes ✓ Email: ${user.email}`
        } else {
          tests.authUser = 'No user found'
        }
        
        // Test 4: Query users table directly
        tests.usersTable = 'Checking...'
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .limit(5)
        
        if (usersError) {
          tests.usersTable = `Error: ${usersError.message}`
        } else {
          tests.usersTable = `Found ${usersData?.length || 0} users`
          tests.usersData = usersData
        }
        
        // Test 5: Try getCurrentUser
        tests.getCurrentUser = 'Checking...'
        try {
          const currentUser = await getCurrentUser()
          tests.getCurrentUser = currentUser ? `Yes ✓ Name: ${currentUser.name}` : 'Returned null'
          tests.currentUserData = currentUser
        } catch (e: any) {
          tests.getCurrentUser = `Error: ${e?.message || JSON.stringify(e)}`
        }
        
      } catch (e: any) {
        tests.generalError = e?.message || JSON.stringify(e)
      }
      
      setResults(tests)
    }
    
    runTests()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Kinnect Debug Tests</h1>
      <div className="space-y-2">
        {Object.entries(results).map(([key, value]) => (
          <div key={key} className="border p-2 rounded">
            <strong>{key}:</strong> 
            <pre className="mt-1 text-sm">{JSON.stringify(value, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}