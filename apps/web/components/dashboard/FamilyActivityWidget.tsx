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

    // Pre-filter completed tasks with valid dates once
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
    <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
          <span className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <Users className="h-4 w-4 text-amber-500" />
          </span>
          Family Members
        </h2>
        <button
          onClick={onAddMember}
          className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Member
        </button>
      </div>

      {/* Avatar Strip */}
      {membersWithCounts.length > 0 && (
        <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-50 overflow-x-auto">
          {membersWithCounts.map((member) => (
            <Link
              key={member.id}
              href="/dashboard/profile"
              className="flex flex-col items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div
                  className={`h-12 w-12 rounded-full shadow-sm flex items-center justify-center text-white font-bold text-base ${
                    ROLE_COLORS[member.role || ''] || 'bg-gray-500'
                  }`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                {member.completedThisWeek > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-brand-success text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
                    {member.completedThisWeek}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-600 truncate max-w-[52px] text-center">
                {member.isCurrentUser ? 'You' : member.name.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {membersWithCounts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">No family members yet</p>
            <button
              onClick={onAddMember}
              className="text-brand-accent text-sm font-bold mt-2 inline-block hover:underline"
            >
              Add your first member
            </button>
          </div>
        ) : null}
        {membersWithCounts.map((member) => (
          <Link
            key={member.id}
            href="/dashboard/profile"
            className="flex items-center justify-between p-4 hover:bg-primary-50/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-10 w-10 rounded-full shadow-sm flex items-center justify-center text-white font-bold ${
                  ROLE_COLORS[member.role || ''] || 'bg-gray-500'
                }`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-brand-primary">
                  {member.name}
                  {member.isCurrentUser && (
                    <span className="text-xs text-primary-400 font-medium ml-1.5">
                      (You)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                  {ROLE_LABELS[member.role || ''] || member.role || 'Member'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-brand-primary">
                {member.completedThisWeek}
              </div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                this week
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
