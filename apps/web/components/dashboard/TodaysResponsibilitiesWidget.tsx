'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  completeOccurrence,
  uncompleteOccurrence,
  reassignOccurrence,
  type ResponsibilityOccurrenceWithFlow,
  type User,
} from '@kinnect/core'
import { CheckCircle2, Repeat2, Plus, RotateCcw, Circle } from 'lucide-react'
import logger from '@/lib/logger'
import { ROLE_COLORS } from '@/lib/constants'

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  household: 'Household',
  care:      'Care',
  errand:    'Errand',
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-50 text-blue-600',
  household: 'bg-amber-50 text-amber-600',
  care:      'bg-purple-50 text-purple-600',
  errand:    'bg-green-50 text-green-600',
}

interface TodaysResponsibilitiesWidgetProps {
  responsibilities: ResponsibilityOccurrenceWithFlow[]
  members: User[]
  userId: string
  onChanged: () => void
  onCreateRoutine: () => void
}

export default function TodaysResponsibilitiesWidget({
  responsibilities,
  members,
  userId,
  onChanged,
  onCreateRoutine,
}: TodaysResponsibilitiesWidgetProps) {
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [uncompletingId, setUncompletingId] = useState<string | null>(null)

  function formatTime(time: string | null) {
    if (!time) return null
    const [h, m] = time.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour % 12 || 12}:${m} ${ampm}`
  }

  async function handleComplete(occurrence: ResponsibilityOccurrenceWithFlow) {
    if (completingId) return
    setCompletingId(occurrence.id)
    try {
      await completeOccurrence(occurrence.id, userId)
      onChanged()
    } catch (err) {
      logger.error('Failed to complete occurrence', err)
      toast.error('Failed to mark as done')
    } finally {
      setCompletingId(null)
    }
  }

  async function handleUncomplete(occurrence: ResponsibilityOccurrenceWithFlow) {
    if (uncompletingId) return
    setUncompletingId(occurrence.id)
    try {
      await uncompleteOccurrence(occurrence.id)
      onChanged()
    } catch (err) {
      logger.error('Failed to undo completion', err)
      toast.error('Failed to undo')
    } finally {
      setUncompletingId(null)
    }
  }

  async function handleReassign(occurrenceId: string, newAssigneeId: string) {
    setReassigningId(null)
    try {
      await reassignOccurrence(occurrenceId, newAssigneeId)
      onChanged()
    } catch (err) {
      logger.error('Failed to reassign occurrence', err)
      toast.error('Failed to reassign')
    }
  }

  const pending = responsibilities.filter((r) => r.status !== 'completed')
  const done    = responsibilities.filter((r) => r.status === 'completed')

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
            <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Repeat2 className="h-4 w-4 text-violet-500" />
            </div>
            Today&apos;s Routines
          </h2>
          <Link
            href="/dashboard/routines"
            className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="px-6 py-4">
        {responsibilities.length === 0 ? (
          <div className="text-center py-5">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <Repeat2 className="h-5 w-5 text-violet-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium mb-4">
              No routines scheduled today.
            </p>
            <button
              onClick={onCreateRoutine}
              className="px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              New Routine
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Pending occurrences */}
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50/80 rounded-xl transition-colors group"
              >
                {/* Complete button */}
                <button
                  onClick={() => handleComplete(r)}
                  disabled={completingId === r.id}
                  className="shrink-0 text-gray-300 hover:text-violet-500 transition-colors disabled:opacity-40"
                  title="Mark as done"
                >
                  <Circle className="w-5 h-5" />
                </button>

                {/* Icon + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.icon && <span className="text-base leading-none">{r.icon}</span>}
                    <span className="text-sm font-bold text-brand-primary truncate">
                      {r.flow_title}
                    </span>
                    <span
                      className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        CATEGORY_COLORS[r.category] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0 ${
                        ROLE_COLORS[r.assignee_role || ''] || 'bg-gray-400'
                      }`}
                    >
                      {r.assignee_name.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-400">{r.assignee_name.split(' ')[0]}</span>
                    {r.scheduled_time && !r.end_time && (
                      <span className="text-xs text-gray-300">· {formatTime(r.scheduled_time)}</span>
                    )}
                    {r.scheduled_time && r.end_time && (
                      <span className="text-xs text-gray-300">
                        · {r.category === 'transport' ? 'Drop-off' : 'Start'} {formatTime(r.scheduled_time)}
                        {' · '}{r.category === 'transport' ? 'Pick-up' : 'End'} {formatTime(r.end_time)}
                      </span>
                    )}
                    {!r.scheduled_time && r.end_time && (
                      <span className="text-xs text-gray-300">
                        · {r.category === 'transport' ? 'Pick-up' : 'End'} {formatTime(r.end_time)}
                      </span>
                    )}
                    {r.status === 'reassigned' && (
                      <span className="text-[10px] text-violet-500 font-bold">reassigned</span>
                    )}
                  </div>
                </div>

                {/* Reassign */}
                <div className="relative shrink-0">
                  {reassigningId === r.id ? (
                    <select
                      autoFocus
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleReassign(r.id, e.target.value)
                      }}
                      onBlur={() => setReassigningId(null)}
                    >
                      <option value="" disabled>Pick person…</option>
                      {members
                        .filter((m) => m.id !== r.assigned_to)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>
                        ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setReassigningId(r.id)}
                      className="text-xs px-2.5 py-1 border border-gray-100 text-gray-400 rounded-lg hover:border-violet-300 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Reassign
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Completed today */}
            {done.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100/70">
                {done.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-success-50/40 group animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-brand-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-400 line-through">
                        {r.icon && <span className="mr-1">{r.icon}</span>}
                        {r.flow_title}
                      </span>
                      <div className="text-xs text-brand-success font-bold mt-0.5">Done!</div>
                    </div>
                    <button
                      onClick={() => handleUncomplete(r)}
                      disabled={uncompletingId === r.id}
                      title="Undo completion"
                      className="shrink-0 p-1.5 text-gray-300 hover:text-violet-500 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer CTA */}
        {responsibilities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100/70">
            <button
              onClick={onCreateRoutine}
              className="flex items-center gap-1 text-sm font-bold text-brand-accent hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Routine
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
