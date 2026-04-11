'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { type User, type Task } from '@kinnect/core'
import { Users } from 'lucide-react'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/constants'

interface FamilyActivityWidgetProps {
  members: User[]
  tasks: Task[]
  currentUserId: string
  onAddMember: () => void
}

export default function FamilyActivityWidget({
  members,
  tasks,
  currentUserId,
  onAddMember,
}: FamilyActivityWidgetProps) {
  const membersWithCounts = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(now.getFullYear(), now.getMonth(), diff)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartTime = weekStart.getTime()

    const completedTasks = tasks.filter(
      (t) => t.completed && t.assigned_to && t.completed_at && new Date(t.completed_at).getTime() >= weekStartTime
    )

    return members
      .map((member) => ({
        ...member,
        completedThisWeek: completedTasks.filter((t) => t.assigned_to?.includes(member.id)).length,
        isCurrentUser: member.id === currentUserId,
      }))
      .sort((a, b) => b.completedThisWeek - a.completedThisWeek)
  }, [members, tasks, currentUserId])

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
          <div className="w-7 h-7 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary-500" />
          </div>
          Family
        </h2>
        <button
          onClick={onAddMember}
          className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
        >
          + Invite
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {membersWithCounts.length === 0 ? (
          <div className="text-center py-8 px-6">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Users className="h-5 w-5 text-primary-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No family members yet</p>
            <button
              onClick={onAddMember}
              className="text-brand-accent text-sm font-bold mt-2 inline-block hover:underline"
            >
              Invite your first member
            </button>
          </div>
        ) : null}

        {membersWithCounts.map((member) => (
          <Link
            key={member.id}
            href="/dashboard/profile"
            className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/70 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white group-hover:ring-brand-bg transition-all ${
                  ROLE_COLORS[member.role || ''] || 'bg-gray-500'
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-brand-primary text-sm leading-tight">
                  {member.name}
                  {member.isCurrentUser && (
                    <span className="text-[11px] text-primary-400 font-medium ml-1.5">you</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">
                  {ROLE_LABELS[member.role || ''] || member.role || 'Member'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-brand-primary tabular-nums">
                {member.completedThisWeek}
              </div>
              <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                this week
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
