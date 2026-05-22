'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  deactivateFlow,
  deleteFlow,
  getResponsibilityFlows,
  type ResponsibilityFlowWithDetails,
  type User,
  getFamilyMembers,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import ConfirmDialog from '@/components/ConfirmDialog'
import { RefreshCw, Plus, Power, Pencil, Trash2, Clock } from 'lucide-react'
import logger from '@/lib/logger'
import toast from 'react-hot-toast'
import { ROLE_COLORS } from '@/lib/constants'

const CreateRoutineModal = dynamic(() => import('@/components/CreateRoutineModal'), { ssr: false })

const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-50 text-blue-700',
  household: 'bg-amber-50 text-amber-700',
  care:      'bg-purple-50 text-purple-700',
  errand:    'bg-green-50 text-green-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  household: 'Household',
  care:      'Care',
  errand:    'Errand',
}

function recurrenceLabel(rule: string): string {
  if (rule === 'daily') return 'Every day'
  if (rule === 'weekdays') return 'Weekdays'
  if (rule === 'weekends') return 'Weekends'
  if (rule.startsWith('weekly:')) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const days = rule
      .slice(7)
      .split(',')
      .map((d) => dayNames[parseInt(d, 10) - 1])
      .join(', ')
    return `Weekly: ${days}`
  }
  return rule
}

function formatTime(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

export default function RoutinesPage() {
  const router = useRouter()
  const { user } = useUser()
  const [flows, setFlows] = useState<ResponsibilityFlowWithDetails[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [editingFlow, setEditingFlow] = useState<ResponsibilityFlowWithDetails | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [deletingId,     setDeletingId]     = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    loadData(user.family_id)
  }, [user?.family_id])

  async function loadData(familyId: string) {
    try {
      const [flowsData, membersData] = await Promise.all([
        getResponsibilityFlows(familyId),
        getFamilyMembers(familyId),
      ])
      setFlows(flowsData)
      setMembers(membersData)
    } catch (err) {
      logger.error('Failed to load routines', err)
      toast.error('Failed to load routines')
    } finally {
      setLoading(false)
    }
  }

  const reload = useCallback(async () => {
    if (user?.family_id) {
      const data = await getResponsibilityFlows(user.family_id)
      setFlows(data)
    }
  }, [user?.family_id])

  const broadcast = useRealtimeSync(user?.family_id, {
    responsibility_flows: reload,
  })

  async function handleDeactivate(flowId: string) {
    setDeactivatingId(null)
    try {
      await deactivateFlow(flowId)
      setFlows((prev) => prev.map((f) => f.id === flowId ? { ...f, active: false } : f))
      broadcast('responsibility_flows')
    } catch (err) {
      logger.error('Failed to deactivate routine', err)
      toast.error('Failed to deactivate routine')
    }
  }

  async function handleDelete(flowId: string) {
    setDeletingId(null)
    setFlows((prev) => prev.filter((f) => f.id !== flowId))
    try {
      await deleteFlow(flowId)
      broadcast('responsibility_flows')
    } catch (err) {
      logger.error('Failed to delete routine', err)
      toast.error('Failed to delete routine')
      // Reload to restore state on failure
      if (user?.family_id) {
        const data = await getResponsibilityFlows(user.family_id)
        setFlows(data)
      }
    }
  }

  const displayed = filter === 'active'
    ? flows.filter((f) => f.active)
    : flows

  const activeCount = flows.filter((f) => f.active).length

  if (loading) {
    return (
      <div className="px-4 sm:px-0 animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[1.25rem] shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user?.family_id) return null

  return (
    <div className="px-4 sm:px-0">
      {/* Gradient banner */}
      <div
        className="rounded-2xl mb-8 px-6 py-6 flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #3730a3 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Routines</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(199,195,255,0.85)' }}>
              {activeCount} active &middot; {flows.length} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
        >
          <Plus className="w-4 h-4" />
          New Routine
        </button>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {(['active', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                filter === f
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {f === 'active' ? `Active (${activeCount})` : `All (${flows.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Flows list */}
      {displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[1.5rem] shadow-sm">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-500 font-medium mb-1">
            {filter === 'active' ? 'No active routines yet' : 'No routines yet'}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Create a routine to start tracking recurring responsibilities
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Routine
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((flow) => (
            <div
              key={flow.id}
              className={`bg-white rounded-[1.25rem] shadow-sm p-5 flex items-center gap-4 transition-opacity ${
                !flow.active ? 'opacity-50' : ''
              }`}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                {flow.icon ?? '🔄'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-brand-primary text-sm">{flow.title}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      CATEGORY_COLORS[flow.category] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {CATEGORY_LABELS[flow.category] ?? flow.category}
                  </span>
                  {!flow.active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {/* Recurrence */}
                  <span className="text-xs text-gray-500">{recurrenceLabel(flow.recurrence_rule)}</span>
                  {flow.start_time && (
                    <span className="text-xs text-gray-400">· {formatTime(flow.start_time)}</span>
                  )}
                  {/* Assignee */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] text-white font-bold shrink-0 ${
                        ROLE_COLORS[flow.assignee_role || ''] || 'bg-gray-400'
                      }`}
                    >
                      {flow.assignee_name.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-500">{flow.assignee_name}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {flow.active && (
                  <>
                    <button
                      onClick={() => setEditingFlow(flow)}
                      title="Edit routine"
                      className="p-2 text-gray-300 hover:text-brand-accent hover:bg-brand-bg rounded-xl transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeactivatingId(flow.id)}
                      title="Deactivate routine"
                      className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDeletingId(flow.id)}
                  title="Delete routine permanently"
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateRoutineModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        onRoutineCreated={() => { reload(); broadcast('responsibility_flows') }}
      />
      <CreateRoutineModal
        isOpen={!!editingFlow}
        onClose={() => setEditingFlow(null)}
        familyId={user.family_id}
        userId={user.id}
        members={members}
        flow={editingFlow}
        onRoutineCreated={() => { reload(); broadcast('responsibility_flows') }}
      />

      <ConfirmDialog
        isOpen={!!deactivatingId}
        onClose={() => setDeactivatingId(null)}
        onConfirm={() => { if (deactivatingId) handleDeactivate(deactivatingId) }}
        title="Deactivate routine"
        message="This routine will stop appearing on the dashboard. Past occurrences are kept. You can't reactivate it yet."
        confirmLabel="Deactivate"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) handleDelete(deletingId) }}
        title="Delete routine"
        message="This will permanently delete the routine and all its scheduled occurrences. This cannot be undone."
        confirmLabel="Delete permanently"
        variant="danger"
      />
    </div>
  )
}
