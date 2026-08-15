'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getFamilyMembers,
  getFullShoppingList,
  addShoppingListItem,
  toggleShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearCompletedItems,
  timeAgo,
  type User,
  type ListItem,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useShoppingPresence } from '@/hooks/useShoppingPresence'
import toast from 'react-hot-toast'
import { ShoppingBasket, ShoppingBag, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import logger from '@/lib/logger'

// ── Checkbox: normal mode ─────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
        checked
          ? 'bg-success-500 border-success-500 scale-95'
          : 'border-primary-200 bg-white hover:border-success-400 active:scale-95'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
    </button>
  )
}

// ── Checkbox: shopping mode (visual only — row is the button) ─────

function BigCheckVisual({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
        checked
          ? 'bg-success-500 border-success-500'
          : 'border-primary-600/30 bg-primary-800/40'
      }`}
    >
      {checked && <Check className="w-4 h-4 text-primary-900 stroke-[3]" />}
    </div>
  )
}

// ── component ────────────────────────────────────────────

export default function ShoppingListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [members, setMembers] = useState<User[]>([])
  const [incompleteItems, setIncompleteItems] = useState<ListItem[]>([])
  const [completedItems, setCompletedItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [shoppingMode, setShoppingMode] = useState(() => searchParams.get('mode') === 'shopping')

  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (!user) return
    if (!user.family_id) { router.push('/onboarding'); return }
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
      toast.error('Failed to load shopping list')
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
  const otherShoppers = useShoppingPresence(user?.family_id, user?.id, user?.name, shoppingMode)

  function getMemberName(id: string | null | undefined) {
    if (!id) return 'Someone'
    return members.find((m) => m.id === id)?.name || 'Someone'
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || isAdding || !user?.family_id) return
    setIsAdding(true)
    try {
      await addShoppingListItem(user.family_id, user.id, { title: newTitle.trim() })
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
    if (!completed) {
      const item = incompleteItems.find((i) => i.id === itemId)
      if (item) {
        setIncompleteItems((prev) => prev.filter((i) => i.id !== itemId))
        setCompletedItems((prev) => [{ ...item, completed: true, completed_by: user.id, completed_at: new Date().toISOString() }, ...prev])
      }
    } else {
      const item = completedItems.find((i) => i.id === itemId)
      if (item) {
        const restored = { ...item, completed: false, completed_by: null, completed_at: null }
        setCompletedItems((prev) => prev.filter((i) => i.id !== itemId))
        setIncompleteItems((prev) => {
          // DB orders incompleteItems by created_at DESC (newest first).
          // Insert at the matching position so the optimistic state matches the
          // Realtime reload — avoids the visible jump on re-sync.
          const t = new Date(restored.created_at).getTime()
          const idx = prev.findIndex((i) => new Date(i.created_at).getTime() < t)
          return idx === -1 ? [...prev, restored] : [...prev.slice(0, idx), restored, ...prev.slice(idx)]
        })
      }
    }
    try {
      await toggleShoppingListItem(itemId, !completed, user.id)
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to toggle item', error)
      toast.error('Failed to update item')
      await reloadList()
    }
  }

  async function handleDeleteItem(itemId: string) {
    setIncompleteItems((prev) => prev.filter((i) => i.id !== itemId))
    setCompletedItems((prev) => prev.filter((i) => i.id !== itemId))
    try {
      await deleteShoppingListItem(itemId)
      broadcast('list_items')
    } catch (error) {
      logger.error('Failed to delete item', error)
      toast.error('Failed to delete item')
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

  function startEditing(item: ListItem) { setEditingId(item.id); setEditTitle(item.title) }
  function cancelEditing() { setEditingId(null); setEditTitle('') }

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

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 sm:px-0 space-y-4 animate-pulse">
        <div className="rounded-[1.5rem] h-28 bg-primary-100" />
        <div className="bg-white rounded-[1.5rem] shadow-card p-4">
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
        <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
              <div className="w-5 h-5 rounded-md bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                <div className="h-3 w-1/3 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user?.family_id) return null

  const totalItems = incompleteItems.length + completedItems.length
  const pct = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0
  const allGot = totalItems > 0 && incompleteItems.length === 0

  // ── Shopping Mode ─────────────────────────────────────────────────

  if (shoppingMode) {
    return (
      <div className="fixed inset-0 bg-primary-800 z-40 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary-300" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Shopping</p>
              <p className="text-primary-400 text-xs tabular-nums">
                {completedItems.length}/{totalItems} got
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Other shoppers */}
            {otherShoppers.length > 0 && (
              <div className="flex -space-x-1.5">
                {otherShoppers.slice(0, 3).map((name: string, i: number) => (
                  <div
                    key={i}
                    title={`${name} is shopping`}
                    className="w-7 h-7 rounded-full bg-accent-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-primary-800"
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShoppingMode(false)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* Progress strip */}
        {totalItems > 0 && (
          <div className="h-0.5 bg-primary-700">
            <div
              className="h-full bg-success-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {incompleteItems.length === 0 && completedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
              <ShoppingBag className="w-16 h-16 text-primary-600" />
              <div>
                <p className="text-primary-200 font-bold text-xl">List is empty</p>
                <p className="text-primary-500 text-sm mt-1">Exit shopping mode to add items</p>
              </div>
            </div>
          ) : (
            <>
              {/* Pending */}
              {incompleteItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleToggleItem(item.id, item.completed)}
                  className="w-full flex items-center gap-5 px-5 py-5 border-b border-primary-700 hover:bg-primary-700/50 active:bg-primary-700 transition-colors text-left"
                >
                  <BigCheckVisual checked={false} />
                  <span className="text-white text-lg font-semibold flex-1 leading-snug">
                    {item.title}
                  </span>
                </button>
              ))}

              {/* Got */}
              {completedItems.length > 0 && (
                <div className="mt-2 pt-1 border-t border-primary-700">
                  <p className="px-5 py-2 text-[10px] uppercase tracking-widest text-primary-500 font-bold">
                    In the basket
                  </p>
                  {completedItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggleItem(item.id, item.completed)}
                      className="w-full flex items-center gap-5 px-5 py-4 hover:bg-primary-700/50 active:bg-primary-700 transition-colors text-left"
                    >
                      <BigCheckVisual checked={true} />
                      <span className="text-primary-500 text-lg line-through decoration-success-500/40 flex-1 leading-snug">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* All done celebration */}
              {allGot && (
                <div className="px-5 py-8 text-center">
                  <p className="text-success-400 font-black text-2xl">All done! 🛒</p>
                  <p className="text-primary-500 text-sm mt-1">Everything&apos;s in the basket</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Normal Mode ──────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-0 space-y-4 pb-6">

      {/* Header */}
      <div
        className="rounded-[1.5rem] px-5 py-5"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #3730a3 100%)',
          boxShadow: '0 8px 32px -4px rgb(49 46 129 / 0.35), 0 2px 8px -2px rgb(49 46 129 / 0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <ShoppingBasket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Shopping List</h1>
              <p className="text-indigo-300 text-sm">
                {incompleteItems.length === 0
                  ? completedItems.length > 0
                    ? 'Everything got!'
                    : 'Nothing on the list'
                  : `${incompleteItems.length} item${incompleteItems.length !== 1 ? 's' : ''} to get`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShoppingMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Shop
          </button>
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-indigo-300/70 font-bold uppercase tracking-widest">
                {completedItems.length} of {totalItems} got
              </span>
              <span className="text-[10px] text-indigo-300/70 font-bold">{pct}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-success-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Presence banner */}
      {otherShoppers.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-accent-50 border border-accent-200/60 rounded-2xl">
          <div className="flex -space-x-1.5 shrink-0">
            {otherShoppers.slice(0, 4).map((name: string, i: number) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-black flex items-center justify-center ring-2 ring-accent-50"
              >
                {name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <p className="text-sm text-accent-800">
            <span className="font-bold">
              {otherShoppers.length === 1
                ? otherShoppers[0]
                : `${otherShoppers.slice(0, -1).join(', ')} & ${otherShoppers.at(-1)}`}
            </span>
            {' '}
            {otherShoppers.length === 1 ? 'is' : 'are'} shopping right now
          </p>
        </div>
      )}

      {/* Add Form */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-[1.5rem] shadow-card px-5 py-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 px-4 py-2.5 text-sm text-gray-900 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent focus:bg-white placeholder:text-gray-400 transition-all"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isAdding}
            className="px-5 py-2.5 bg-accent-500 text-white text-sm font-bold rounded-xl hover:bg-accent-600 active:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>

      {/* Pending Items */}
      <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden">
        {incompleteItems.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <ShoppingBasket className="h-7 w-7 text-primary-300" />
            </div>
            <p className="text-gray-800 font-bold">
              {completedItems.length > 0 ? 'All items got!' : 'Your list is empty'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {completedItems.length > 0
                ? "Everything's in the basket"
                : 'Add something above to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {incompleteItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-primary-50/60 transition-colors group"
              >
                <Checkbox
                  checked={false}
                  onChange={() => handleToggleItem(item.id, item.completed)}
                />

                {editingId === item.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSaveEdit(item.id) }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-white border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Escape') cancelEditing() }}
                    />
                    <button
                      type="submit"
                      disabled={!editTitle.trim()}
                      className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
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
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {getMemberName(item.added_by)} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Got (Completed) Items */}
      {completedItems.length > 0 && (
        <div className="bg-white rounded-[1.5rem] shadow-card overflow-hidden">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-success-500 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
              <span className="text-sm font-bold text-gray-400">
                Got ({completedItems.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showCompleted && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowClearConfirm(true) }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-2.5 py-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
              {showCompleted
                ? <ChevronUp className="w-4 h-4 text-gray-300" />
                : <ChevronDown className="w-4 h-4 text-gray-300" />}
            </div>
          </button>

          {showCompleted && (
            <div className="divide-y divide-gray-50 border-t border-gray-50 animate-fade-in">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group"
                >
                  <Checkbox
                    checked={true}
                    onChange={() => handleToggleItem(item.id, item.completed)}
                  />
                  {editingId === item.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSaveEdit(item.id) }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-white border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEditing() }}
                      />
                      <button type="submit" disabled={!editTitle.trim()} className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg transition-colors" title="Save">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={cancelEditing} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-400 line-through decoration-success-400/60">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Got by {getMemberName(item.completed_by || item.added_by)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1.5 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
