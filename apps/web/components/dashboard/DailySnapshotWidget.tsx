'use client'

import { CheckCircle2, Calendar, ShoppingBasket, Repeat2 } from 'lucide-react'

interface DailySnapshotWidgetProps {
  tasksLeft: number
  eventsToday: number
  shoppingCount: number
  routinesDone: number
  routinesTotal: number
  nextEventTime?: string | null
}

export default function DailySnapshotWidget({
  tasksLeft,
  eventsToday,
  shoppingCount,
  routinesDone,
  routinesTotal,
  nextEventTime,
}: DailySnapshotWidgetProps) {
  const stats = [
    {
      icon: CheckCircle2,
      iconBg: 'rgba(79,70,229,0.12)',
      iconColor: '#4F46E5',
      value: tasksLeft,
      label: 'Tasks left',
      sub: tasksLeft === 0 ? 'All clear!' : 'Pending',
    },
    {
      icon: Calendar,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      value: eventsToday,
      label: 'Events today',
      sub: nextEventTime ? `Next: ${nextEventTime}` : eventsToday === 0 ? 'Free day' : 'Scheduled',
    },
    {
      icon: ShoppingBasket,
      iconBg: 'rgba(251,113,133,0.12)',
      iconColor: '#FB7185',
      value: shoppingCount,
      label: 'Items to buy',
      sub: shoppingCount === 0 ? 'List clear' : 'On the list',
    },
    {
      icon: Repeat2,
      iconBg: 'rgba(124,58,237,0.12)',
      iconColor: '#7C3AED',
      value: routinesTotal > 0 ? routinesDone : 0,
      label: 'Routines done',
      sub: routinesTotal > 0 ? `${routinesDone} of ${routinesTotal}` : 'None today',
    },
  ]

  const allClear = tasksLeft === 0 && (routinesTotal === 0 || routinesDone === routinesTotal)

  return (
    <div
      className="rounded-[1.5rem] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
        boxShadow: '0 4px 20px rgba(49,46,129,0.10), 0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Label row */}
      <div style={{ padding: '11px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-ink-strong)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Daily Snapshot
        </span>
        {allClear && (
          <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            You&apos;re all set today!
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4" style={{ padding: '4px 6px 12px' }}>
        {stats.map((s, i) => {
          const Icon = s.icon
          const isLast = i === stats.length - 1
          return (
            <div
              key={i}
              className="flex flex-col items-center text-center"
              style={{
                padding: '10px 6px',
                borderRight: !isLast ? '1px solid rgba(49,46,129,0.10)' : 'none',
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: s.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8, flexShrink: 0,
                }}
              >
                <Icon style={{ width: 15, height: 15, color: s.iconColor }} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-ink)', lineHeight: 1.1 }}>
                {s.value}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground)', marginTop: 3, lineHeight: 1.2 }}>
                {s.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted-ink-strong)', marginTop: 2, lineHeight: 1.2 }}>
                {s.sub}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
