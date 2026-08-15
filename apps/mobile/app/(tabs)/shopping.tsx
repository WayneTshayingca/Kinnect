import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Keyboard,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getFullShoppingList,
  addShoppingListItem,
  toggleShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearCompletedItems,
  type ListItem,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useShoppingPresence } from '@kinnect/hooks'

// ── Item row ───────────────────────────────────────────────────────────────

function ItemRow({
  item,
  shoppingMode,
  editingId,
  editText,
  onToggle,
  onDelete,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditBlur,
  isLast,
}: {
  item: ListItem
  shoppingMode: boolean
  editingId: string | null
  editText: string
  onToggle: (item: ListItem) => void
  onDelete: (item: ListItem) => void
  onEditStart: (item: ListItem) => void
  onEditChange: (text: string) => void
  onEditSubmit: () => void
  onEditBlur: () => void
  isLast: boolean
}) {
  const isEditing = editingId === item.id
  const checkSize = shoppingMode ? 32 : 24
  const checkRadius = checkSize / 2

  return (
    <View style={[
      styles.itemRow,
      shoppingMode && styles.itemRowShop,
      !isLast && styles.itemRowBorder,
      item.completed && styles.itemRowDone,
    ]}>
      {/* Checkbox */}
      <TouchableOpacity
        onPress={() => onToggle(item)}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.checkWrap}
      >
        <View style={[
          styles.checkBox,
          { width: checkSize, height: checkSize, borderRadius: checkRadius },
          item.completed && styles.checkBoxDone,
        ]}>
          {item.completed && (
            <Text style={[styles.checkMark, shoppingMode && { fontSize: 14 }]}>✓</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Title / edit input */}
      <View style={styles.itemBody}>
        {isEditing ? (
          <TextInput
            style={styles.itemEditInput}
            value={editText}
            onChangeText={onEditChange}
            onSubmitEditing={onEditSubmit}
            onBlur={onEditBlur}
            autoFocus
            returnKeyType="done"
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity
            onPress={() => !shoppingMode && !item.completed && onEditStart(item)}
            activeOpacity={shoppingMode || item.completed ? 1 : 0.6}
            disabled={shoppingMode || item.completed}
          >
            <Text style={[
              styles.itemTitle,
              shoppingMode && styles.itemTitleShop,
              item.completed && styles.itemTitleDone,
            ]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.quantity ? (
              <Text style={styles.itemQty}>{item.quantity}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>

      {/* Delete (normal mode only, incomplete items) */}
      {!shoppingMode && !item.completed && (
        <TouchableOpacity
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()

  const [incompleteItems, setIncompleteItems] = useState<ListItem[]>([])
  const [completedItems, setCompletedItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [shoppingMode, setShoppingMode] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  // Add form
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const addInputRef = useRef<TextInput>(null)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const shoppingModeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(shoppingModeAnim, {
      toValue: shoppingMode ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start()
  }, [shoppingMode])

  const load = useCallback(async (quiet = false) => {
    if (!user?.family_id) return
    if (!quiet) setLoading(true)
    try {
      const { incompleteItems: inc, completedItems: done } = await getFullShoppingList(user.family_id)
      setIncompleteItems(inc)
      setCompletedItems(done)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.family_id])

  useEffect(() => { load() }, [load])

  useRealtimeSync(user?.family_id, {
    list_items: () => load(true),
  })

  const otherShoppers = useShoppingPresence(user?.family_id, user?.id, user?.name, shoppingMode)

  // ── Add item ─────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!newTitle.trim() || !user?.family_id || !user?.id) return
    const title = newTitle.trim()
    setNewTitle('')

    // Optimistic
    const tempItem: ListItem = {
      id: `temp-${Date.now()}`,
      list_id: '',
      title,
      quantity: null,
      notes: null,
      completed: false,
      completed_by: null,
      completed_at: null,
      added_by: user.id,
      assigned_shopper: null,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setIncompleteItems((prev) => [tempItem, ...prev])

    try {
      const real = await addShoppingListItem(user.family_id, user.id, { title })
      setIncompleteItems((prev) => prev.map((i) => i.id === tempItem.id ? real : i))
    } catch {
      setIncompleteItems((prev) => prev.filter((i) => i.id !== tempItem.id))
    }
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  function handleToggle(item: ListItem) {
    if (!user?.id) return
    const completing = !item.completed
    if (completing) {
      setIncompleteItems((prev) => prev.filter((i) => i.id !== item.id))
      setCompletedItems((prev) => [{ ...item, completed: true }, ...prev])
    } else {
      setCompletedItems((prev) => prev.filter((i) => i.id !== item.id))
      setIncompleteItems((prev) => [{ ...item, completed: false, completed_at: null }, ...prev])
    }
    toggleShoppingListItem(item.id, completing, user.id).catch(() => load(true))
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(item: ListItem) {
    Alert.alert('Remove item', `Remove "${item.title}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setIncompleteItems((prev) => prev.filter((i) => i.id !== item.id))
          deleteShoppingListItem(item.id).catch(() => load(true))
        },
      },
    ])
  }

  // ── Clear completed ───────────────────────────────────────────────────────

  function handleClearCompleted() {
    if (!user?.family_id) return
    Alert.alert('Clear done items', 'Remove all completed items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          setCompletedItems([])
          clearCompletedItems(user.family_id!).catch(() => load(true))
        },
      },
    ])
  }

  // ── Inline edit ───────────────────────────────────────────────────────────

  function handleEditStart(item: ListItem) {
    setEditingId(item.id)
    setEditText(item.title)
  }

  async function handleEditSubmit() {
    if (!editingId || !editText.trim()) { setEditingId(null); return }
    const id = editingId
    const text = editText.trim()
    setEditingId(null)
    setIncompleteItems((prev) => prev.map((i) => i.id === id ? { ...i, title: text } : i))
    updateShoppingListItem(id, { title: text }).catch(() => load(true))
  }

  const doneCount = completedItems.length
  const pendingCount = incompleteItems.length

  const headerBg = shoppingModeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['white', '#065F46'],
  })

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ───────────────────────────────────── */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: shoppingMode ? 'white' : T.primary }]}>
              {shoppingMode ? '🛒 Shopping' : 'Shopping'}
            </Text>
            {pendingCount > 0 && (
              <Text style={[styles.headerSub, { color: shoppingMode ? 'rgba(255,255,255,0.7)' : 'rgba(49,46,129,0.5)' }]}>
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} left
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => { setShoppingMode((v) => !v); Keyboard.dismiss() }}
            style={[styles.modeBtn, shoppingMode && styles.modeBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, { color: shoppingMode ? 'white' : T.accent }]}>
              {shoppingMode ? 'Done shopping' : 'Start shopping'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Presence banner ─────────────────────────────── */}
      {otherShoppers.length > 0 && (
        <View style={styles.presenceBanner}>
          <View style={styles.presenceAvatars}>
            {otherShoppers.slice(0, 4).map((name, i) => (
              <View key={i} style={[styles.presenceAvatar, i > 0 && styles.presenceAvatarOverlap]}>
                <Text style={styles.presenceAvatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.presenceText}>
            <Text style={styles.presenceTextBold}>
              {otherShoppers.length === 1
                ? otherShoppers[0]
                : `${otherShoppers.slice(0, -1).join(', ')} & ${otherShoppers[otherShoppers.length - 1]}`}
            </Text>
            {' '}{otherShoppers.length === 1 ? 'is' : 'are'} shopping right now
          </Text>
        </View>
      )}

      {/* ── List ─────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={incompleteItems}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            incompleteItems.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={T.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyTitle}>List is empty</Text>
              <Text style={styles.emptyHint}>Add items below</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ItemRow
              item={item}
              shoppingMode={shoppingMode}
              editingId={editingId}
              editText={editText}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditChange={setEditText}
              onEditSubmit={handleEditSubmit}
              onEditBlur={handleEditSubmit}
              isLast={index === incompleteItems.length - 1 && doneCount === 0}
            />
          )}
          ListFooterComponent={
            doneCount > 0 ? (
              <View style={styles.completedSection}>
                {/* Completed header */}
                <TouchableOpacity
                  onPress={() => setShowCompleted((v) => !v)}
                  activeOpacity={0.7}
                  style={styles.completedHeader}
                >
                  <Text style={styles.completedLabel}>
                    {showCompleted ? '▾' : '▸'} Done ({doneCount})
                  </Text>
                  {showCompleted && (
                    <TouchableOpacity onPress={handleClearCompleted} activeOpacity={0.7}>
                      <Text style={styles.clearText}>Clear all</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showCompleted && (
                  <View style={styles.card}>
                    {completedItems.map((item, i) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        shoppingMode={shoppingMode}
                        editingId={editingId}
                        editText={editText}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onEditStart={handleEditStart}
                        onEditChange={setEditText}
                        onEditSubmit={handleEditSubmit}
                        onEditBlur={handleEditSubmit}
                        isLast={i === completedItems.length - 1}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null
          }
        />
      )}

      {/* ── Add item bar ─────────────────────────────── */}
      {!shoppingMode && (
        <View style={[styles.addBar, { paddingBottom: insets.bottom + 72 }]}>
          <TextInput
            ref={addInputRef}
            style={styles.addInput}
            placeholder="Add an item…"
            placeholderTextColor="#9CA3AF"
            value={newTitle}
            onChangeText={setNewTitle}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!newTitle.trim()}
            style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const T = {
  primary: '#312E81',
  p800: '#1E1B4B',
  accent: '#FB7185',
  bg: '#f0eff8',
  success: '#34D399',
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Presence banner
  presenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.25)',
    borderRadius: 16,
  },
  presenceAvatars: {
    flexDirection: 'row',
  },
  presenceAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF1F2',
  },
  presenceAvatarOverlap: {
    marginLeft: -8,
  },
  presenceAvatarText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  presenceText: {
    flex: 1,
    fontSize: 13,
    color: '#9F1239',
  },
  presenceTextBold: {
    fontWeight: '700',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(49,46,129,0.06)',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(251,113,133,0.08)',
    borderWidth: 1,
    borderColor: T.accent,
  },
  modeBtnActive: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 8,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: T.primary,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: '#a5a5b8',
    fontWeight: '500',
  },

  // Card wrapper for incomplete items (rendered via FlatList, each card is standalone)
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRowShop: {
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 10,
  },
  itemRowBorder: {},
  itemRowDone: {
    shadowOpacity: 0.03,
    elevation: 1,
  },
  checkWrap: {
    flexShrink: 0,
  },
  checkBox: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkBoxDone: {
    borderColor: T.success,
    backgroundColor: T.success,
  },
  checkMark: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: T.primary,
    lineHeight: 20,
  },
  itemTitleShop: {
    fontSize: 17,
    fontWeight: '700',
  },
  itemTitleDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  itemQty: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  itemEditInput: {
    fontSize: 15,
    fontWeight: '600',
    color: T.primary,
    borderBottomWidth: 2,
    borderBottomColor: T.accent,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deleteIcon: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },

  // Completed section
  completedSection: {
    marginTop: 4,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  completedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5a5b8',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.accent,
  },

  // Add bar
  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  addBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
})
