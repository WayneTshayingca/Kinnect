import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getFamily,
  getFamilyMembers,
  updateFamily,
  removeFamilyMember,
  signOut,
  getSupabase,
  ROLE_HEX_COLORS,
  type User,
  type Family,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useScreenData } from '@/hooks/useScreenData'
import { Avatar } from '@/components/Avatar'
import { MemberSheet } from '@/components/MemberSheet'
import { T } from '@/lib/theme'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  dependent: 'Dependent',
  observer: 'Observer',
}

function MemberCard({
  member,
  isMe,
  canManage,
  onEdit,
  onRemove,
}: {
  member: User
  isMe: boolean
  canManage: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const roleColor = ROLE_HEX_COLORS[member.role ?? ''] ?? '#6B7280'
  return (
    <View className={`flex-row items-center px-4 py-3 gap-3 ${isMe ? 'bg-primary-600/[0.03]' : ''}`}>
      <Avatar name={member.name} role={member.role} size={44} borderWidth={2} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-bold text-primary-600">{member.name}</Text>
          {isMe && (
            <View className="bg-primary-800 rounded-md px-1.5 py-0.5">
              <Text className="text-[9px] font-extrabold text-primary-300 uppercase tracking-wide">You</Text>
            </View>
          )}
        </View>
        <View className="self-start rounded-md px-1.5 py-0.5" style={{ backgroundColor: roleColor + '18' }}>
          <Text className="text-[11px] font-bold" style={{ color: roleColor }}>
            {ROLE_LABELS[member.role ?? ''] ?? member.role}
          </Text>
        </View>
      </View>

      {canManage && (
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            className="w-8 h-8 items-center justify-center"
            accessibilityLabel={`Edit ${member.name}`}
          >
            <Ionicons name="create-outline" size={18} color={T.mutedInk} />
          </TouchableOpacity>
          {!isMe && (
            <TouchableOpacity
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              className="w-8 h-8 items-center justify-center"
              accessibilityLabel={`Remove ${member.name}`}
            >
              <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const router = useRouter()

  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [signingOut, setSigningOut] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [email, setEmail] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<User | null>(null)

  const isAdmin = user?.role === 'admin'

  const fetchData = useCallback(async () => {
    if (!user?.family_id) return
    const [familyData, membersData] = await Promise.all([
      getFamily(user.family_id),
      getFamilyMembers(user.family_id),
    ])
    setFamily(familyData)
    setMembers(membersData)
  }, [user?.family_id])

  const { loading, refreshing, refresh } = useScreenData(user?.family_id, fetchData, [])

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    }).catch(() => {})
  }, [])

  async function handleSaveName() {
    if (!nameInput.trim() || !family?.id) return
    setSavingName(true)
    try {
      const updated = await updateFamily(family.id, { name: nameInput.trim() })
      setFamily(updated)
      setEditingName(false)
    } catch {
      Alert.alert('Error', 'Could not update family name')
    } finally {
      setSavingName(false)
    }
  }

  function handleRemoveMember(member: User) {
    Alert.alert(
      `Remove ${member.name}?`,
      'They will lose access to this family. Their tasks and events stay in the family history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const previous = members
            setMembers((prev) => prev.filter((m) => m.id !== member.id))
            try {
              await removeFamilyMember(member.id)
            } catch (err) {
              setMembers(previous)
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove this member')
            }
          },
        },
      ]
    )
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          try {
            await signOut()
            router.replace('/(auth)/login')
          } catch {
            setSigningOut(false)
            Alert.alert('Error', 'Could not sign out. Please try again.')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#f0eff8] items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator color="#312E81" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#f0eff8]" style={{ paddingTop: insets.top }}>
      <View className="bg-primary-800 px-5 pt-1.5 pb-[18px] rounded-b-3xl flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-white tracking-tight">Profile</Text>
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="px-3 py-1.5 rounded-full bg-white/10"
          activeOpacity={0.7}
        >
          {signingOut
            ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
            : <Text className="text-[13px] font-bold text-white/90">Sign out</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#312E81" />}
      >
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">Your family</Text>
          <View className="bg-white rounded-3xl p-4 flex-row items-center gap-3.5 shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-primary-800 items-center justify-center">
              <Ionicons name="home" size={22} color="white" />
            </View>
            <View className="flex-1 gap-0.5">
              {editingName ? (
                <View className="flex-row items-center gap-1.5">
                  <TextInput
                    className="flex-1 text-[15px] font-bold text-primary-600 border-b-2 border-accent-500 py-0.5"
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                    className="bg-accent-500 rounded-lg px-2.5 py-1 min-w-[48px] items-center"
                    activeOpacity={0.8}
                  >
                    {savingName
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text className="text-xs font-bold text-white">Save</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingName(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
                    activeOpacity={0.7}
                    accessibilityLabel="Cancel editing family name"
                  >
                    <Ionicons name="close" size={14} color={T.mutedInk} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-[17px] font-extrabold text-primary-600 flex-1">{family?.name ?? '—'}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => { setNameInput(family?.name ?? ''); setEditingName(true) }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit family name"
                    >
                      <Ionicons name="pencil" size={16} color={T.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Text className="text-xs text-ink-muted font-medium">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">Members</Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => { setEditingMember(null); setSheetOpen(true) }}
                activeOpacity={0.7}
                className="flex-row items-center gap-1"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add-circle" size={16} color={T.accent} />
                <Text className="text-xs font-bold text-accent-600">Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm">
            {members.map((m, i) => (
              <React.Fragment key={m.id}>
                <MemberCard
                  member={m}
                  isMe={m.id === user?.id}
                  canManage={isAdmin}
                  onEdit={() => { setEditingMember(m); setSheetOpen(true) }}
                  onRemove={() => handleRemoveMember(m)}
                />
                {i < members.length - 1 && <View className="h-px bg-black/[0.04] ml-[72px]" />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">Your profile</Text>
          <View className="bg-white rounded-3xl p-4 flex-row items-center gap-3.5 shadow-sm">
            {user && <Avatar name={user.name} role={user.role} size={52} borderWidth={2} />}
            <View className="flex-1">
              <Text className="text-base font-extrabold text-primary-600">{user?.name ?? '—'}</Text>
              {email && <Text className="text-xs text-ink-muted mt-0.5">{email}</Text>}
              {user?.role && (
                <View className="self-start rounded-md px-1.5 py-0.5 mt-1" style={{ backgroundColor: (ROLE_HEX_COLORS[user.role] ?? '#6B7280') + '18' }}>
                  <Text className="text-[11px] font-bold" style={{ color: ROLE_HEX_COLORS[user.role] ?? '#6B7280' }}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center justify-center"
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut
            ? <ActivityIndicator color="#EF4444" size="small" />
            : <Text className="text-[15px] font-bold text-red-500">Sign out</Text>}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {family?.id && (
        <MemberSheet
          visible={sheetOpen}
          familyId={family.id}
          member={editingMember}
          onClose={() => setSheetOpen(false)}
          onSaved={refresh}
        />
      )}
    </View>
  )
}
