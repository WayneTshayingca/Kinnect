'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  getFamily,
  getFamilyMembers,
  updateFamily,
  removeFamilyMember,
  type User,
  type Family,
} from '@kinnect/core'
import AddMemberModal from '@/components/AddMemberModal'

// ── helpers ──────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  parent:          { bg: 'bg-primary-100', text: 'text-primary-700', label: 'Parent' },
  grandparent:     { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Grandparent' },
  child:           { bg: 'bg-success-100', text: 'text-success-700', label: 'Child' },
  domestic_worker: { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Helper' },
}

function roleBadge(role: string | null) {
  const style = ROLE_STYLES[role || ''] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role || 'Member' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

// ── component ────────────────────────────────────────────

export default function FamilyPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // modal state
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<User | null>(null)

  // inline family name editing
  const [editingName, setEditingName] = useState(false)
  const [familyNameDraft, setFamilyNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  // ── data loading ─────────────────────────────────────

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (!currentUser?.family_id) {
        router.push('/onboarding')
        return
      }

      const [familyData, membersData] = await Promise.all([
        getFamily(currentUser.family_id),
        getFamilyMembers(currentUser.family_id),
      ])

      setFamily(familyData)
      setMembers(membersData)
    } catch (error) {
      console.error('Error loading family:', error)
    } finally {
      setLoading(false)
    }
  }

  async function reloadMembers() {
    if (!user?.family_id) return
    const membersData = await getFamilyMembers(user.family_id)
    setMembers(membersData)
  }

  // ── family name editing ──────────────────────────────

  function startEditingName() {
    setFamilyNameDraft(family?.name || '')
    setEditingName(true)
  }

  async function saveFamilyName() {
    if (!family || !familyNameDraft.trim()) return
    setSavingName(true)
    try {
      const updated = await updateFamily(family.id, { name: familyNameDraft.trim() })
      setFamily(updated)
      setEditingName(false)
    } catch (error) {
      console.error('Error updating family name:', error)
      alert('Failed to update family name')
    } finally {
      setSavingName(false)
    }
  }

  // ── member actions ───────────────────────────────────

  function openAddMember() {
    setEditingMember(null)
    setShowMemberModal(true)
  }

  function openEditMember(m: User) {
    setEditingMember(m)
    setShowMemberModal(true)
  }

  async function handleRemoveMember(m: User) {
    if (!confirm(`Remove ${m.name} from the family?`)) return
    try {
      await removeFamilyMember(m.id)
      await reloadMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  // ── render ───────────────────────────────────────────

  if (loading) {
    return <div className="p-8">Loading family...</div>
  }
  if (!user?.family_id) return null

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={familyNameDraft}
                onChange={(e) => setFamilyNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFamilyName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                className="text-3xl font-bold text-gray-900 border-b-2 border-accent-500 outline-none bg-transparent"
              />
              <button
                onClick={saveFamilyName}
                disabled={savingName}
                className="p-1.5 text-success-600 hover:bg-success-50 rounded transition-colors"
                title="Save"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{family?.name}</h1>
              <button
                onClick={startEditingName}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Edit family name"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          )}
          <p className="text-gray-600 mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAddMember}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span>
          Add Member
        </button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No family members yet. Add someone to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const isCurrentUser = m.id === user.id
            const initials = m.name.charAt(0).toUpperCase()

            return (
              <div key={m.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-semibold">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{m.name}</h3>
                      {isCurrentUser && (
                        <span className="text-xs text-primary-600 font-medium">(You)</span>
                      )}
                      {!m.auth_user_id && !isCurrentUser && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditMember(m) }}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                        >
                          Invite
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {roleBadge(m.role)}
                      {m.phone && (
                        <span className="text-sm text-gray-500">{m.phone}</span>
                      )}
                    </div>
                    {m.created_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditMember(m)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit member"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Member Modal */}
      <AddMemberModal
        isOpen={showMemberModal}
        onClose={() => { setShowMemberModal(false); setEditingMember(null) }}
        familyId={user.family_id}
        onMemberAdded={reloadMembers}
        member={editingMember}
      />
    </div>
  )
}
