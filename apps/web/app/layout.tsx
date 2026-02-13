import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { Toaster } from 'react-hot-toast'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Kinnect - Family Coordination Platform',
    description: 'Africa\'s family coordination platform for multi-generational households',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <SupabaseProvider>
            {children}
        </SupabaseProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <SpeedInsights />
        <Analytics />
        </body>
        </html>
    )
}