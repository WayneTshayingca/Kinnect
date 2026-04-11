'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  createResponsibilityFlow,
  updateResponsibilityFlow,
  getResponsibilityTemplates,
  type ResponsibilityFlowWithDetails,
  type ResponsibilityTemplate,
  type User,
} from '@kinnect/core'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import logger from '@/lib/logger'

interface CreateRoutineModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
  userId: string
  members: User[]
  onRoutineCreated: () => void
  /** When provided the modal operates in edit mode */
  flow?: ResponsibilityFlowWithDetails | null
}

type Step = 1 | 2 | 3

const RECURRENCE_OPTIONS = [
  { value: 'daily',    label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekends', label: 'Weekends (Sat–Sun)' },
  { value: 'weekly',   label: 'Specific days…' },
]

const WEEKDAYS = [
  { iso: 1, short: 'Mon' },
  { iso: 2, short: 'Tue' },
  { iso: 3, short: 'Wed' },
  { iso: 4, short: 'Thu' },
  { iso: 5, short: 'Fri' },
  { iso: 6, short: 'Sat' },
  { iso: 7, short: 'Sun' },
]

function parseRecurrenceRule(rule: string): { base: string; days: number[] } {
  if (rule.startsWith('weekly:')) {
    return {
      base: 'weekly',
      days: rule.slice(7).split(',').map(Number),
    }
  }
  return { base: rule, days: [1] }
}

export default function CreateRoutineModal({
  isOpen,
  onClose,
  familyId,
  userId,
  members,
  onRoutineCreated,
  flow,
}: CreateRoutineModalProps) {
  const isEditing = !!flow
  const [step, setStep] = useState<Step>(1)
  const [templates, setTemplates] = useState<ResponsibilityTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Step 1 — template selection
  const [selectedTemplate, setSelectedTemplate] = useState<ResponsibilityTemplate | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customCategory, setCustomCategory] = useState<string>('household')

  // Step 2 — recurrence + time
  const [recurrenceBase, setRecurrenceBase] = useState<string>('weekdays')
  const [selectedDays, setSelectedDays] = useState<number[]>([1])
  const [startTime, setStartTime] = useState('07:15')

  // Step 3 — assignee
  const [assigneeId, setAssigneeId] = useState<string>('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    resetState()
    if (!flow) loadTemplates()
  }, [isOpen, flow])

  function resetState() {
    setStep(1)
    if (flow) {
      const { base, days } = parseRecurrenceRule(flow.recurrence_rule)
      setSelectedTemplate(null)
      setCustomTitle(flow.title)
      setCustomCategory(flow.category)
      setRecurrenceBase(base)
      setSelectedDays(days)
      setStartTime(flow.start_time?.slice(0, 5) ?? '')
      setAssigneeId(flow.default_assignee_id)
    } else {
      setSelectedTemplate(null)
      setCustomTitle('')
      setCustomCategory('household')
      setRecurrenceBase('weekdays')
      setSelectedDays([1])
      setStartTime('07:15')
      setAssigneeId(userId)
    }
    setSaving(false)
  }

  async function loadTemplates() {
    setLoadingTemplates(true)
    try {
      const data = await getResponsibilityTemplates()
      setTemplates(data)
    } catch (err) {
      logger.error('Failed to load templates', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  function handleSelectTemplate(t: ResponsibilityTemplate) {
    setSelectedTemplate(t)
    setCustomTitle(t.name)
    setCustomCategory(t.category)
    if (t.default_start_time) setStartTime(t.default_start_time.slice(0, 5))
  }

  function handleSelectCustom() {
    setSelectedTemplate(null)
    setCustomTitle('')
    setCustomCategory('household')
  }

  function canAdvanceStep1() {
    return selectedTemplate !== null || customTitle.trim().length > 0
  }

  function buildRecurrenceRule(): string {
    if (recurrenceBase === 'weekly') {
      const days = selectedDays.sort().join(',')
      return `weekly:${days}`
    }
    return recurrenceBase
  }

  function toggleDay(iso: number) {
    setSelectedDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]
    )
  }

  async function handleSave() {
    if (!assigneeId) return
    setSaving(true)
    const title = customTitle.trim() || (selectedTemplate?.name ?? '')
    const recurrenceRule = buildRecurrenceRule()
    try {
      if (isEditing && flow) {
        await updateResponsibilityFlow(flow.id, {
          title,
          category:            customCategory,
          recurrence_rule:     recurrenceRule,
          default_assignee_id: assigneeId,
          start_time:          startTime || null,
        })
      } else {
        await createResponsibilityFlow({
          family_id:           familyId,
          title,
          category:            customCategory,
          template_id:         selectedTemplate?.id ?? null,
          recurrence_rule:     recurrenceRule,
          default_assignee_id: assigneeId,
          start_time:          startTime || null,
          created_by:          userId,
        })
      }
      onRoutineCreated()
      onClose()
    } catch (err) {
      logger.error(`Failed to ${isEditing ? 'update' : 'create'} routine`, err)
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} routine`)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-[1.5rem] sm:rounded-[1.5rem] w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-brand-primary">
              {isEditing ? 'Edit Routine' : 'New Routine'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {([1, 2, 3] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-brand-accent' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── Step 1: Pick Template / Edit name ────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {isEditing ? (
                /* Edit mode: just show name + category fields */
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600">Routine details</p>
                  <input
                    type="text"
                    placeholder="Routine name…"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 text-gray-900 placeholder:text-gray-400"
                    autoFocus
                  />
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 text-gray-900"
                  >
                    <option value="household">Household</option>
                    <option value="transport">Transport</option>
                    <option value="care">Care</option>
                    <option value="errand">Errand</option>
                  </select>
                </div>
              ) : (
                /* Create mode: template grid + optional custom fields */
                <>
                  <p className="text-sm font-medium text-gray-600">
                    Choose a template or create your own
                  </p>

                  {loadingTemplates ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTemplate(t)}
                          className={`p-3 rounded-xl text-left border-2 transition-all ${
                            selectedTemplate?.id === t.id
                              ? 'border-brand-accent bg-accent-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="text-2xl mb-1">{t.icon}</div>
                          <div className="text-xs font-bold text-brand-primary leading-tight">{t.name}</div>
                        </button>
                      ))}

                      {/* Custom option */}
                      <button
                        onClick={handleSelectCustom}
                        className={`p-3 rounded-xl text-left border-2 transition-all ${
                          selectedTemplate === null && customTitle
                            ? 'border-brand-accent bg-accent-50'
                            : 'border-dashed border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">✏️</div>
                        <div className="text-xs font-bold text-brand-primary">Custom</div>
                      </button>
                    </div>
                  )}

                  {selectedTemplate === null && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Routine name…"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 text-gray-900 placeholder:text-gray-400"
                        autoFocus
                      />
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 text-gray-900"
                      >
                        <option value="household">Household</option>
                        <option value="transport">Transport</option>
                        <option value="care">Care</option>
                        <option value="errand">Errand</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1()}
                className="w-full py-3 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Recurrence + Time ─────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm font-medium text-gray-600">When does this happen?</p>

              <div className="space-y-2">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRecurrenceBase(opt.value)}
                    className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium border-2 transition-all ${
                      recurrenceBase === opt.value
                        ? 'border-brand-accent bg-accent-50 text-brand-accent'
                        : 'border-gray-100 text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Day picker for 'weekly' */}
              {recurrenceBase === 'weekly' && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Select days</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => toggleDay(d.iso)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                          selectedDays.includes(d.iso)
                            ? 'border-brand-accent bg-accent-50 text-brand-accent'
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Start time (optional)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 text-gray-900"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={recurrenceBase === 'weekly' && selectedDays.length === 0}
                  className="flex-1 py-3 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Assign ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm font-medium text-gray-600">Who is responsible?</p>

              <div className="space-y-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAssigneeId(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                      assigneeId === m.id
                        ? 'border-brand-accent bg-accent-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-sm font-bold text-brand-accent shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {m.id === userId && (
                      <span className="ml-auto text-xs text-gray-400">You</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!assigneeId || saving}
                  className="flex-1 py-3 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? (isEditing ? 'Saving…' : 'Creating…')
                    : (isEditing ? 'Save Changes' : 'Create Routine')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}