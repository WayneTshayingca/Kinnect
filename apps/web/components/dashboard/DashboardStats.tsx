'use client'

import { useEffect, useRef, useState } from 'react'

function CountUp({ value, duration = 650 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    fromRef.current = value
    if (from === value) return

    let startTime: number
    let rafId: number
    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [value, duration])

  return <>{display}</>
}

interface DashboardStatsProps {
  doneToday: number
  dailyTasks: number
}

export default function DashboardStats({ doneToday, dailyTasks }: DashboardStatsProps) {
  const total = doneToday + dailyTasks
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0
  const allDone = total > 0 && dailyTasks === 0
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    // Slight delay so the bar animates in after mount
    const t = setTimeout(() => setAnimPct(pct), 120)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="bg-white/8 px-5 py-4 rounded-2xl backdrop-blur-sm border border-white/10 space-y-3">
      {/* Fraction + label row */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black tabular-nums leading-none">
            <CountUp value={doneToday} />
          </span>
          <span className="text-base font-bold text-white/40 tabular-nums leading-none">
            / {total}
          </span>
        </div>
        {allDone ? (
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">
            All done! 🎉
          </span>
        ) : total === 0 ? (
          <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-widest">
            No tasks today
          </span>
        ) : (
          <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-widest">
            {dailyTasks} remaining
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${animPct}%`,
            background: allDone
              ? 'linear-gradient(90deg, #6ee7b7, #34d399)'
              : 'linear-gradient(90deg, #a5b4fc, #ffffff)',
            boxShadow: allDone
              ? '0 0 8px rgb(52 211 153 / 0.6)'
              : '0 0 8px rgb(165 180 252 / 0.5)',
          }}
        />
      </div>

      {/* Sub-label */}
      <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold">
        {pct}% of today&apos;s tasks complete
      </div>
    </div>
  )
}
