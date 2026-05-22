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
import { ShoppingBasket, Plus, ShoppingBag } from 'lucide-react'
import logger from '@/lib/logger'
import { timeAgo } from '@/lib/formatters'

interface ShoppingListWidgetProps {
  items: ListItem[]
  totalCount: number
  familyId: string
  userId: string
  members: User[]
  onItemAdded: () => void
  onItemToggled: (itemId: string) => void
  variant?: 'bento'
}

export default function ShoppingListWidget({
  items,
  totalCount,
  familyId,
  userId,
  members,
  onItemAdded,
  onItemToggled,
  variant,
}: ShoppingListWidgetProps) {
  const [newItem, setNewItem] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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
    onItemToggled(itemId)
    try {
      await toggleShoppingListItem(itemId, !completed, userId)
    } catch (error) {
      logger.error('Failed to toggle item', error)
    }
  }

  const previewItems = items.slice(0, 4)

  if (variant === 'bento') {
    return (
      <div className="rounded-[1.5rem] overflow-hidden h-full" style={{ background: 'white', boxShadow: '0 2px 12px rgb(49 46 129/0.07)' }}>
        {/* Header */}
        <div style={{ background: 'rgba(251,113,133,0.07)', padding: '12px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-1.5">
            <ShoppingBasket className="w-3.5 h-3.5" style={{ color: '#FB7185' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#FB7185' }}>Shopping</span>
          </div>
          <Link
            href="/dashboard/shopping-list?mode=shopping"
            className="text-white font-bold rounded-lg transition-colors"
            style={{ fontSize: 10, background: '#FB7185', padding: '4px 10px', borderRadius: 7 }}
          >
            Shop
          </Link>
        </div>
        <div style={{ padding: '8px 16px 12px' }}>
          {items.length === 0 ? (
            <p style={{ fontSize: 12, color: '#a5a5b8', textAlign: 'center', padding: '10px 0' }}>Nothing on the list</p>
          ) : (
            <>
              {items.slice(0, 3).map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < Math.min(items.length, 3) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: 13, height: 13, border: '1.5px solid #d1d5db', borderRadius: 4, flexShrink: 0 }} />
                  <span className="truncate" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{item.title}</span>
                </div>
              ))}
              {totalCount > 3 && (
                <div style={{ fontSize: 11, color: '#a5a5b8', marginTop: 7, fontWeight: 600 }}>+{totalCount - 3} more</div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-card-hover animate-slide-up flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-brand-primary">
            <div className="w-7 h-7 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <ShoppingBasket className="h-4 w-4 text-primary-500" />
            </div>
            Shopping List
          </h2>
          <div className="flex items-center gap-1.5">
            {totalCount > 4 && (
              <Link
                href="/dashboard/shopping-list"
                className="text-brand-accent text-sm font-bold hover:bg-brand-bg px-3 py-1.5 rounded-lg transition-colors"
              >
                {totalCount} items
              </Link>
            )}
            <Link
              href="/dashboard/shopping-list?mode=shopping"
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-accent-500 hover:bg-accent-600 px-3 py-1.5 rounded-lg transition-colors"
              title="Start shopping mode"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex-1 flex flex-col">
        {/* Items List */}
        <div className="flex-1 space-y-1">
          {previewItems.length === 0 ? (
            <p className="text-gray-400 text-sm font-medium py-3 text-center">
              List is empty — add something below!
            </p>
          ) : (
            previewItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 group hover:bg-gray-50/80 p-2.5 -mx-1 rounded-xl transition-colors"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleItem(item.id, item.completed)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-success-500 focus:ring-success-400 cursor-pointer"
                />
                <Link href="/dashboard/shopping-list" className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      item.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-900 group-hover:text-primary-600 transition-colors'
                    }`}
                  >
                    {item.title}
                  </span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {getMemberName(item.added_by)} &middot; {timeAgo(item.created_at)}
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddItem} className="flex gap-2 mt-auto pt-3 border-t border-gray-100/70">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item…"
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent placeholder:text-gray-400 transition-shadow"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newItem.trim() || isAdding}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>
    </div>
  )
}