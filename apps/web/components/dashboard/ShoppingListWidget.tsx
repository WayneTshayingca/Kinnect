'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  addShoppingListItem,
  toggleShoppingListItem,
  type ListItem,
  type User,
} from '@kinnect/core'
import { ShoppingCart, Plus } from 'lucide-react'
import logger from '@/lib/logger'

interface ShoppingListWidgetProps {
  items: ListItem[]
  totalCount: number
  familyId: string
  userId: string
  members: User[]
  onItemAdded: () => void
  onItemToggled: (itemId: string) => void
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ShoppingListWidget({
  items,
  totalCount,
  familyId,
  userId,
  members,
  onItemAdded,
  onItemToggled,
}: ShoppingListWidgetProps) {
  const [newItem, setNewItem] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Pre-compute member lookup map for O(1) access
  const membersMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of members) map[m.id] = m.name
    return map
  }, [members])

  function getMemberName(id: string | null | undefined) {
    if (!id) return 'Someone'
    return membersMap[id] || 'Someone'
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim() || isAdding) return

    setIsAdding(true)
    try {
      await addShoppingListItem(familyId, userId, { title: newItem.trim() })
      setNewItem('')
      onItemAdded()
    } catch (error) {
      logger.error('Failed to add item', error)
      toast.error('Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleToggleItem(itemId: string, completed: boolean) {
    // Optimistic — notify parent immediately for instant UI update
    onItemToggled(itemId)
    try {
      await toggleShoppingListItem(itemId, !completed, userId)
    } catch (error) {
      logger.error('Failed to toggle item', error)
    }
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-brand-primary">
            <ShoppingCart className="h-5 w-5 text-brand-success" />
            Shopping List
          </h2>
          {totalCount > 3 && (
            <Link
              href="/dashboard/shopping-list"
              className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
            >
              All {totalCount} items
            </Link>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Items List */}
        <div className="space-y-2 mb-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm font-medium py-2">
              No items yet. Add your first item below!
            </p>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 group hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors${index >= 3 ? ' hidden md:flex' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleItem(item.id, item.completed)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-accent focus:ring-accent-500 cursor-pointer"
                />
                <Link
                  href="/dashboard/shopping-list"
                  className="flex-1 min-w-0"
                >
                  <span
                    className={`text-sm font-medium ${
                      item.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-900 group-hover:text-brand-accent transition-colors'
                    }`}
                  >
                    {item.title}
                  </span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {getMemberName(item.added_by)} &middot;{' '}
                    {timeAgo(item.created_at)}
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-gray-400"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newItem.trim() || isAdding}
            className="px-4 py-2 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
