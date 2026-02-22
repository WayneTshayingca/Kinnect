'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getFamilyMembers,
  getFullShoppingList,
  addShoppingListItem,
  toggleShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearCompletedItems,
  type User,
  type ListItem,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import logger from '@/lib/logger'

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
  const { user } = useUser()
  const [members, setMembers] = useState<User[]>([])
  const [incompleteItems, setIncompleteItems] = useState<ListItem[]>([])
  const [completedItems, setCompletedItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  // Add form
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Confirm dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

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
      const [membersData, listData] = await Promise.all([
        getFamilyMembers(familyId),
        getFullShoppingList(familyId),
      ])

      setMembers(membersData)
      setIncompleteItems(listData.incompleteItems)
      setCompletedItems(listData.completedItems)
    } catch (error) {
      logger.error('Error loading shopping list', error)
    } finally {
      setLoading(false)
    }
  }

  const reloadList = useCallback(async () => {
    if (!user?.family_id) return
    try {
      const listData = await getFullShoppingList(user.family_id)
      setIncompleteItems(listData.incompleteItems)
      setCompletedItems(listData.completedItems)
    } catch (error) {
      logger.error('Error reloading list', error)
    }
  }, [user?.family_id])

  const broadcast = useRealtimeSync(user?.family_id, { list_items: reloadList })

  function getMemberName(id: string | null | undefined) {
    if (!id) return 'Someone'
    return members.find((m) => m.id === id)?.name || 'Someone'
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || isAdding || !user?.family_id) return

    setIsAdding(true)
    try {
      await addShoppingListItem(user.family_id, user.id, {
        title: newTitle.trim(),
      })
      setNewTitle('')
      await reloadList()
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to add item', error)
      toast.error('Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleToggleItem(itemId: string, completed: boolean) {
    if (!user) return

    // Optimistic update — move item between lists instantly
    if (!completed) {
      const item = incompleteItems.find((i) => i.id === itemId)
      if (item) {
        setIncompleteItems((prev) => prev.filter((i) => i.id !== itemId))
        setCompletedItems((prev) => [{ ...item, completed: true, completed_by: user.id, completed_at: new Date().toISOString() }, ...prev])
      }
    } else {
      const item = completedItems.find((i) => i.id === itemId)
      if (item) {
        setCompletedItems((prev) => prev.filter((i) => i.id !== itemId))
        setIncompleteItems((prev) => [...prev, { ...item, completed: false, completed_by: null, completed_at: null }])
      }
    }

    try {
      await toggleShoppingListItem(itemId, !completed, user.id)
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to toggle item', error)
      await reloadList()
    }
  }

  async function handleDeleteItem(itemId: string) {
    // Optimistic update — remove from both lists instantly
    setIncompleteItems((prev) => prev.filter((i) => i.id !== itemId))
    setCompletedItems((prev) => prev.filter((i) => i.id !== itemId))

    try {
      await deleteShoppingListItem(itemId)
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to delete item', error)
      await reloadList()
    }
  }

  async function handleClearCompleted() {
    if (!user?.family_id) return
    try {
      await clearCompletedItems(user.family_id)
      await reloadList()
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to clear completed', error)
      toast.error('Failed to clear completed items')
    }
  }

  function startEditing(item: ListItem) {
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditTitle('')
  }

  async function handleSaveEdit(itemId: string) {
    if (!editTitle.trim()) return
    try {
      await updateShoppingListItem(itemId, { title: editTitle.trim() })
      setEditingId(null)
      setEditTitle('')
      await reloadList()
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to update item', error)
      toast.error('Failed to update item')
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-0 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gray-200 p-2.5 rounded-xl w-11 h-11" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="w-5 h-5 rounded bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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
            className="flex-1 px-4 py-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-gray-400"
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
                {editingId === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveEdit(item.id)
                    }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-gray-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEditing()
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!editTitle.trim()}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-gray-900">
                        {item.title}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Added by {getMemberName(item.added_by)} &middot;{' '}
                        {timeAgo(item.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => startEditing(item)}
                      className="p-1.5 text-gray-300 hover:text-brand-accent hover:bg-brand-bg rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit item"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
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
                    setShowClearConfirm(true)
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
                  {editingId === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSaveEdit(item.id)
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder:text-gray-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEditing()
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!editTitle.trim()}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-400 line-through">
                          {item.title}
                        </span>
                        <div className="text-xs text-gray-300 mt-0.5">
                          Completed by {getMemberName(item.completed_by || item.added_by)}
                        </div>
                      </div>
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1.5 text-gray-300 hover:text-brand-accent hover:bg-brand-bg rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit item"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearCompleted}
        title="Clear completed items"
        message="This will permanently remove all completed items from the list. This action cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
      />
    </div>
  )
}
