import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-primary-600">
          Welcome to Kinnect
        </h1>
        <p className="text-xl text-gray-600">
          Africa's family coordination platform for multi-generational households
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>Built for South African families</p>
          <p>Supporting parents, grandparents, children, and domestic workers</p>
        </div>
      </div>
    </main>
  )
}
