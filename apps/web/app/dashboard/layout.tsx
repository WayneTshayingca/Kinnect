'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { signOut } from '@kinnect/core'
import { Logo } from '@/components/Logo'
import { AnimatedLogo } from '@/components/AnimatedLogo'
import { ROLE_LABELS } from '@/lib/constants'
import { UserProvider, useUser } from '@/components/providers/user-provider'
import {
  LayoutDashboard,
  CheckCircle2,
  ShoppingBasket,
  Calendar,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────

const navItems = [
  { href: '/dashboard',               label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/tasks',         label: 'Tasks',     Icon: CheckCircle2    },
  { href: '/dashboard/shopping-list', label: 'Shopping',  Icon: ShoppingBasket  },
  { href: '/dashboard/calendar',      label: 'Calendar',  Icon: Calendar        },
  { href: '/dashboard/profile',       label: 'Profile',   Icon: User            },
]

const SIDEBAR_KEY    = 'kinnect-sidebar-collapsed'
const SIDEBAR_FULL   = 220
const SIDEBAR_NARROW = 64

// ── Hover helpers (avoids Tailwind inline-style conflict) ──────────────

function hoverDark(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'
  ;(e.currentTarget as HTMLElement).style.color = '#fff'
}
function hoverDarkLeave(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.background = 'transparent'
  ;(e.currentTarget as HTMLElement).style.color = 'rgba(165,163,220,0.75)'
}

// ── Shell ─────────────────────────────────────────────────────────────

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, loading } = useUser()

  const [collapsed, setCollapsed] = useState(false)
  const [hydrated,  setHydrated]  = useState(false)

  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_KEY) === 'true') setCollapsed(true)
    setHydrated(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [loading, user, router])

  async function handleSignOut() {
    Sentry.setUser(null)
    await signOut()
    router.push('/')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <AnimatedLogo size="xl" color="primary" repeat={true} />
      </div>
    )
  }

  if (!user) return null

  const sidebarW = hydrated ? (collapsed ? SIDEBAR_NARROW : SIDEBAR_FULL) : SIDEBAR_FULL
  const initials = user.name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      {/*
        Dynamic CSS: drives sidebar-width variable used by sidebar + content.
        Using a <style> tag ensures both elements share the exact same value
        and transition simultaneously without media-query workarounds.
      */}
      <style>{`
        :root { --sidebar-w: ${sidebarW}px; }
        @media (min-width: 768px) {
          .sidebar-offset {
            margin-left: var(--sidebar-w);
            transition: margin-left 280ms cubic-bezier(0.4,0,0.2,1);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">

        {/* ── Sidebar — md+ ────────────────────────────── */}
        <aside
          className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 overflow-hidden"
          style={{
            width: 'var(--sidebar-w)',
            transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
            background: 'linear-gradient(180deg, #1e1b4b 0%, #191640 100%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo + toggle */}
          <div
            className="flex items-center shrink-0"
            style={{
              height: 64,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: collapsed ? '0 12px' : '0 12px 0 16px',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 8,
            }}
          >
            {collapsed ? (
              <button
                onClick={toggle}
                title="Expand sidebar"
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-white/60" />
              </button>
            ) : (
              <>
                <Link href="/dashboard" className="shrink-0">
                  <Logo variant="full" color="white" size="sm" />
                </Link>
                <button
                  onClick={toggle}
                  title="Collapse sidebar"
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ color: 'rgba(255,255,255,0.35)', transition: 'background 150ms, color 150ms' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(255,255,255,0.10)'
                    el.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.color = 'rgba(255,255,255,0.35)'
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '10px 8px' }}>
            <div className="space-y-0.5">
              {navItems.map(({ href, label, Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative group flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    style={{
                      padding: collapsed ? '10px 0' : '9px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: 10,
                      color: active ? '#fff' : 'rgba(165,163,220,0.75)',
                      background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                      transition: 'background 150ms, color 150ms',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                        ;(e.currentTarget as HTMLElement).style.color = '#fff'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'rgba(165,163,220,0.75)'
                      }
                    }}
                  >
                    {/* Active bar */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                        style={{ width: 3, height: 20, background: '#fb7185' }}
                      />
                    )}

                    <Icon className="shrink-0 w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 1.75} />

                    {/* Label */}
                    {!collapsed && (
                      <span
                        className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                        style={{ opacity: hydrated ? 1 : 0, transition: 'opacity 150ms 100ms' }}
                      >
                        {label}
                      </span>
                    )}

                    {/* Tooltip (collapsed) */}
                    {collapsed && (
                      <span
                        className="absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-xl pointer-events-none opacity-0 group-hover:opacity-100"
                        style={{
                          left: 'calc(100% + 14px)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#1e1b4b',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.14)',
                          transition: 'opacity 120ms',
                        }}
                      >
                        {label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User footer */}
          <div
            className="shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: collapsed ? '12px 8px' : '12px 10px' }}
          >
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  title={user.name}
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  {initials}
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 rounded-lg"
                  style={{ color: 'rgba(165,163,220,0.75)', transition: 'background 150ms, color 150ms' }}
                  onMouseEnter={hoverDark}
                  onMouseLeave={hoverDarkLeave}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  {initials}
                </div>
                <div
                  className="flex-1 min-w-0"
                  style={{ opacity: hydrated ? 1 : 0, transition: 'opacity 150ms 100ms' }}
                >
                  <p className="text-sm font-semibold text-white truncate leading-tight">{user.name}</p>
                  <p className="text-[11px] capitalize leading-tight truncate" style={{ color: 'rgba(165,163,220,0.65)' }}>
                    {ROLE_LABELS[user.role || ''] || 'Member'}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="shrink-0 p-1.5 rounded-lg"
                  style={{ color: 'rgba(165,163,220,0.75)', transition: 'background 150ms, color 150ms' }}
                  onMouseEnter={hoverDark}
                  onMouseLeave={hoverDarkLeave}
                >
                  <LogOut className="w-[15px] h-[15px]" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────── */}
        <div className="sidebar-offset min-h-screen flex flex-col">
          {/* Mobile top bar */}
          {pathname !== '/dashboard' && (
            <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 h-14">
              <Link href="/dashboard">
                <Logo variant="full" color="primary" size="sm" />
              </Link>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </header>
          )}

          <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* ── Mobile Bottom Nav ───────────────────────── */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
          <div className="flex justify-around items-center h-16">
            {navItems.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-semibold transition-colors ${
                    active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" strokeWidth={active ? 2.5 : 1.75} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

      </div>
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <DashboardShell>{children}</DashboardShell>
    </UserProvider>
  )
}
