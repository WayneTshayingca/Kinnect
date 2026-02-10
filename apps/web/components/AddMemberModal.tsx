'use client'

import { useState } from 'react'
import { addFamilyMember } from '@kinnect/core'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string
  onMemberAdded: () => void
}

export default function AddMemberModal({ 
  isOpen, 
  onClose, 
  familyId,
  onMemberAdded 
}: AddMemberModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'parent' | 'grandparent' | 'child' | 'domestic_worker'>('child')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await addFamilyMember(familyId, name, role)
      
      // Reset form
      setName('')
      setRole('child')
      
      onMemberAdded()
      onClose()
    } catch (error) {
      console.error('Error adding family member:', error)
      alert('Failed to add family member')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Family Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g., John"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="child"
                  checked={role === 'child'}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Child</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="parent"
                  checked={role === 'parent'}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Parent</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="grandparent"
                  checked={role === 'grandparent'}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Grandparent</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="domestic_worker"
                  checked={role === 'domestic_worker'}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Helper / Domestic Worker</span>
              </label>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              💡 This creates a profile without login credentials. Perfect for kids or helpers who don't need their own account yet.
            </p>
          </div>

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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}