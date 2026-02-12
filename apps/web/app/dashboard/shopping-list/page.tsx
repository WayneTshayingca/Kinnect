'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  getFamilyMembers,
  getFullShoppingList,
  addShoppingListItem,
  toggleShoppingListItem,
  deleteShoppingListItem,
  clearCompletedItems,
  ensureShoppingList,
  type User,
  type ListItem,
} from '@kinnect/core'
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

// ── helpers ──────────────────────────────────────────────

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

// ── component ────────────────────────────────────────────

export default function ShoppingListPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [incompleteItems, setIncompleteItems] = useState<ListItem[]>([])
  const [completedItems, setCompletedItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  // Add form
  const [newTitle, setNewTitle] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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

      await ensureShoppingList(currentUser.family_id)

      const [membersData, listData] = await Promise.all([
        getFamilyMembers(currentUser.family_id),
        getFullShoppingList(currentUser.family_id),
      ])

      setMembers(membersData)
      setIncompleteItems(listData.incompleteItems)
      setCompletedItems(listData.completedItems)
    } catch (error) {
      console.error('Error loading shopping list:', error)
    } finally {
      setLoading(false)
    }
  }

  async function reloadList() {
    if (!user?.family_id) return
    try {
      const listData = await getFullShoppingList(user.family_id)
      setIncompleteItems(listData.incompleteItems)
      setCompletedItems(listData.completedItems)
    } catch (error) {
      console.error('Error reloading list:', error)
    }
  }

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name || 'Someone'
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || isAdding || !user?.family_id) return

    setIsAdding(true)
    try {
      await addShoppingListItem(user.family_id, user.id, {
        title: newTitle.trim(),
        quantity: newQuantity.trim() || undefined,
      })
      setNewTitle('')
      setNewQuantity('')
      await reloadList()
    } catch (error) {
      console.error('Failed to add item:', error)
      alert('Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleToggleItem(itemId: string, completed: boolean) {
    if (!user) return
    try {
      await toggleShoppingListItem(itemId, !completed, user.id)
      await reloadList()
    } catch (error) {
      console.error('Failed to toggle item:', error)
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteShoppingListItem(itemId)
      await reloadList()
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item')
    }
  }

  async function handleClearCompleted() {
    if (!user?.family_id) return
    if (!confirm('Clear all completed items?')) return
    try {
      await clearCompletedItems(user.family_id)
      await reloadList()
    } catch (error) {
      console.error('Failed to clear completed:', error)
      alert('Failed to clear completed items')
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading shopping list...</div>
  }

  if (!user?.family_id) return null

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-bg p-2.5 rounded-xl">
            <ShoppingCart className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p className="text-sm text-gray-500">
              {incompleteItems.length} item{incompleteItems.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-2xl shadow-sm p-4 mb-6"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add an item..."
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            disabled={isAdding}
          />
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Qty"
            className="w-20 px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isAdding}
            className="px-5 py-3 bg-brand-accent text-white text-sm font-bold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>

      {/* Incomplete Items */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {incompleteItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-8 w-8 text-gray-200" />
            </div>
            <p className="text-gray-400 font-bold">Your list is empty</p>
            <p className="text-gray-400 text-sm mt-1">
              Add items above to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {incompleteItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors group"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggleItem(item.id, item.completed)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-accent-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {item.title}
                    </span>
                    {item.quantity && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Added by {getMemberName(item.added_by)} &middot;{' '}
                    {timeAgo(item.created_at)}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-bold text-gray-500">
              Completed ({completedItems.length})
            </span>
            <div className="flex items-center gap-2">
              {showCompleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearCompleted()
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
              {showCompleted ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {showCompleted && (
            <div className="divide-y divide-gray-50 border-t border-gray-50">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleItem(item.id, item.completed)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-accent-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-400 line-through">
                        {item.title}
                      </span>
                      {item.quantity && (
                        <span className="text-xs text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      Completed by {getMemberName(item.completed_by || item.added_by)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
