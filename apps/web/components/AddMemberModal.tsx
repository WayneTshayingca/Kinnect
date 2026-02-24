'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { addFamilyMember, updateFamilyMember, type User } from '@kinnect/core'
import logger from '@/lib/logger'

type Role = 'admin' | 'member' | 'dependent' | 'observer'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
  onMemberAdded: () => void
  member?: User | null
}

export default function AddMemberModal({
  isOpen,
  onClose,
  familyId,
  onMemberAdded,
  member,
}: AddMemberModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')

  const isEditing = !!member
  const needsAccount = isEditing && !member.auth_user_id

  useEffect(() => {
    if (!isOpen) return

    if (member) {
      setName(member.name)
      setRole((member.role as Role) || 'member')
      setPhone(member.phone || '')
      setEmail('')
    } else {
      setName('')
      setRole('member')
      setPhone('')
      setEmail('')
    }
    setInviteStatus('idle')
    setSubmitError('')
  }, [isOpen, member])

  async function sendInvite(userId: string) {
    setInviteStatus('sending')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, userId, familyId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }
      setInviteStatus('sent')
    } catch (error) {
      logger.error('Invite error', error)
      setInviteStatus('error')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError('')

    try {
      if (isEditing) {
        await updateFamilyMember(member.id, {
          name,
          role,
          phone: phone || null,
        })

        // Send invite if editing a member without an account and email was provided
        if (needsAccount && email) {
          await sendInvite(member.id)
        }
      } else {
        const newMember = await addFamilyMember(familyId, name, role)

        // Update phone if provided
        if (phone) {
          await updateFamilyMember(newMember.id, { phone })
        }

        // Send invite if email provided
        if (email) {
          await sendInvite(newMember.id)
        }
      }

      onMemberAdded()
      onClose()
    } catch (error) {
      logger.error(`Error ${isEditing ? 'updating' : 'adding'} family member`, error)
      const message = error instanceof Error ? error.message : ''
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists')) {
        setSubmitError('A member with this name already exists in your family.')
      } else if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('not allowed')) {
        setSubmitError('You don\'t have permission to perform this action.')
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setSubmitError('Network error. Please check your connection and try again.')
      } else {
        setSubmitError(`Failed to ${isEditing ? 'update' : 'add'} family member. Please try again.`)
      }
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} family member`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Member' : 'Add Family Member'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-md text-sm">
              {submitError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="e.g., John"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <div className="space-y-2">
              {([
                { value: 'admin', label: 'Admin', description: 'Full access — can manage members, tasks, events, and settings.' },
                { value: 'member', label: 'Member', description: 'Can create and manage tasks and events. Cannot manage family settings.' },
                { value: 'dependent', label: 'Dependent', description: 'Limited access — can view and complete assigned tasks (e.g. children).' },
                { value: 'observer', label: 'Observer', description: 'Read-only access — can view family activity but cannot make changes.' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-0.5 text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="e.g., 072 123 4567"
            />
          </div>

          {/* Email invite — show when creating OR editing a member without an account */}
          {(!isEditing || needsAccount) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                placeholder="e.g., john@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                {needsAccount
                  ? 'Enter their email to send an invite so they can log in'
                  : 'Optional — sends an invite so they can log in to Kinnect'}
              </p>
            </div>
          )}

          {/* Info Note */}
          {!isEditing && !email && (
            <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
              <p className="text-xs text-primary-700">
                This creates a profile without login credentials. Perfect for dependents or observers who don&apos;t need their own account yet.
              </p>
            </div>
          )}

          {/* Invite status */}
          {inviteStatus === 'sent' && (
            <div className="bg-success-50 border border-success-200 rounded-md p-3">
              <p className="text-xs text-success-700">Invite sent to {email}!</p>
            </div>
          )}
          {inviteStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-xs text-red-800">Failed to send invite. You can try again from the family page later.</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
            >
              {loading
                ? (isEditing ? 'Saving...' : 'Adding...')
                : (isEditing ? 'Save Changes' : 'Add Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
