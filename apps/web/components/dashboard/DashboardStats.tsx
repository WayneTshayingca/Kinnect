'use client'

interface DashboardStatsProps {
  doneToday: number
  dailyTasks: number
  upcomingEvents: number
}

export default function DashboardStats({
  doneToday,
  dailyTasks,
  upcomingEvents,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
      <div className="text-center">
        <div className="text-3xl font-black">{doneToday}</div>
        <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
          Done Today
        </div>
      </div>
      <div className="text-center border-x border-white/10">
        <div className="text-3xl font-black">{dailyTasks}</div>
        <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
          Daily Tasks
        </div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-black">{upcomingEvents}</div>
        <div className="text-[10px] uppercase tracking-wider text-indigo-100 font-bold">
          This Week
        </div>
      </div>
    </div>
  )
}
