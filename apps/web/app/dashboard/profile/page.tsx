'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getFamily,
  getFamilyMembers,
  updateFamily,
  updateFamilyMember,
  removeFamilyMember,
  changePassword,
  getSession,
  type User,
  type Family,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import AddMemberModal from '@/components/AddMemberModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import logger from '@/lib/logger'

// ── role helpers ──────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  admin:     { bg: 'bg-primary-100', text: 'text-primary-700', label: 'Admin' },
  member:    { bg: 'bg-purple-100',  text: 'text-purple-800',  label: 'Member' },
  dependent: { bg: 'bg-success-100', text: 'text-success-700', label: 'Dependent' },
  observer:  { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Observer' },
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

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useUser()
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // modal
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMember, setEditingMember] = useState<User | null>(null)

  // confirm dialog
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null)

  // profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState({ name: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // family name editing
  const [editingFamilyName, setEditingFamilyName] = useState(false)
  const [familyNameDraft, setFamilyNameDraft] = useState('')
  const [savingFamilyName, setSavingFamilyName] = useState(false)

  // password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ── data loading ─────────────────────────────────────

  useEffect(() => {
    if (!user) return
    if (!user.family_id) {
      router.push('/onboarding')
      return
    }
    loadData(user.family_id)
    loadEmail()
  }, [user?.family_id])

  async function loadData(familyId: string) {
    try {
      const [familyData, membersData] = await Promise.all([
        getFamily(familyId),
        getFamilyMembers(familyId),
      ])
      setFamily(familyData)
      setMembers(membersData)
    } catch (error) {
      logger.error('Error loading family', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadEmail() {
    try {
      const session = await getSession()
      setUserEmail(session?.user?.email || null)
    } catch {
      // ignore
    }
  }

  async function reloadMembers() {
    if (!user?.family_id) return
    try {
      const membersData = await getFamilyMembers(user.family_id)
      setMembers(membersData)
    } catch (error) {
      logger.error('Error reloading members', error)
      // Re-fetch from scratch as a fallback
      await refreshUser()
    }
  }

  // ── profile editing ──────────────────────────────────

  function startEditingProfile() {
    setProfileDraft({ name: user?.name || '', phone: user?.phone || '' })
    setEditingProfile(true)
  }

  async function saveProfile() {
    if (!user || !profileDraft.name.trim()) return
    setSavingProfile(true)
    try {
      await updateFamilyMember(user.id, {
        name: profileDraft.name.trim(),
        phone: profileDraft.phone || null,
      })
      await refreshUser()
      await reloadMembers()
      setEditingProfile(false)
    } catch (error) {
      logger.error('Error updating profile', error)
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── family name editing ──────────────────────────────

  function startEditingFamilyName() {
    setFamilyNameDraft(family?.name || '')
    setEditingFamilyName(true)
  }

  async function saveFamilyName() {
    if (!family || !familyNameDraft.trim()) return
    setSavingFamilyName(true)
    try {
      const updated = await updateFamily(family.id, { name: familyNameDraft.trim() })
      setFamily(updated)
      setEditingFamilyName(false)
    } catch (error) {
      logger.error('Error updating family name', error)
      toast.error('Failed to update family name')
    } finally {
      setSavingFamilyName(false)
    }
  }

  // ── password change ──────────────────────────────────

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(newPassword)
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordSuccess(false)
      }, 2000)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setSavingPassword(false)
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

  function handleRemoveMember(m: User) {
    if (m.id === user?.id) {
      toast.error('You cannot remove yourself from the family')
      return
    }
    setMemberToRemove(m)
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return
    try {
      await removeFamilyMember(memberToRemove.id)
      setMembers((prev) => prev.filter((member) => member.id !== memberToRemove.id))
      await reloadMembers()
    } catch (error) {
      logger.error('Error removing member', error)
      toast.error('Failed to remove member')
      await reloadMembers()
    }
  }

  // ── render ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-0 animate-pulse">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-200 px-6 py-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gray-300" />
                <div className="h-5 w-32 bg-gray-300 rounded mt-3" />
                <div className="h-5 w-16 bg-gray-300 rounded-full mt-2" />
              </div>
              <div className="p-6 space-y-3">
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-gray-100 rounded" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-gray-100 rounded" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-12 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
                <div className="h-10 w-full bg-gray-100 rounded-lg mt-4" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
              </div>
              <div className="divide-y divide-gray-50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-100 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (!user?.family_id) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your details and family circle</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile + Password ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-primary-600 px-6 py-8 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">{user.name}</h2>
              <div className="mt-1">
                {roleBadge(user.role)}
              </div>
            </div>

            <div className="p-6">
              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileDraft.phone}
                      onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                      placeholder="e.g., 072 123 4567"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Email</p>
                    <p className="text-sm text-gray-900 mt-0.5">{userEmail || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Phone</p>
                    <p className="text-sm text-gray-900 mt-0.5">{user.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Joined</p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={startEditingProfile}
                    className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password
              </h3>
            </div>

            {showPasswordForm ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-success-600 font-medium">Password changed successfully!</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(false); setPasswordError(''); setNewPassword(''); setConfirmPassword('') }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Change Password
              </button>
            )}
          </div>
        </div>

        {/* ── Right Column: Family Circle ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Family Circle Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingFamilyName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={familyNameDraft}
                        onChange={(e) => setFamilyNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveFamilyName()
                          if (e.key === 'Escape') setEditingFamilyName(false)
                        }}
                        className="text-lg font-semibold text-gray-900 border-b-2 border-primary-500 outline-none bg-transparent"
                      />
                      <button
                        onClick={saveFamilyName}
                        disabled={savingFamilyName}
                        className="p-1 text-success-600 hover:bg-success-50 rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingFamilyName(false)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900">{family?.name || 'Family Circle'}</h2>
                      <button
                        onClick={startEditingFamilyName}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit family name"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={openAddMember}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <span className="text-lg leading-none">+</span>
                  Add Member
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Members List */}
            {members.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No family members yet. Add someone to get started!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {members.map((m) => {
                  const isCurrentUser = m.id === user.id
                  const initials = m.name.charAt(0).toUpperCase()

                  return (
                    <div key={m.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold">
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 truncate text-sm">{m.name}</h3>
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
                          <div className="flex items-center gap-3 mt-0.5">
                            {roleBadge(m.role)}
                            {m.phone && (
                              <span className="text-xs text-gray-500">{m.phone}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
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
          </div>
        </div>
      </div>

      {/* Add/Edit Member Modal */}
      <AddMemberModal
        isOpen={showMemberModal}
        onClose={() => { setShowMemberModal(false); setEditingMember(null) }}
        familyId={user.family_id}
        onMemberAdded={reloadMembers}
        member={editingMember}
      />

      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemoveMember}
        title="Remove family member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from the family circle? They will lose access to shared lists, tasks, and events.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
