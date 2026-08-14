import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  getFamily,
  getFamilyMembers,
  updateFamily,
  signOut,
  getSupabase,
  ROLE_HEX_COLORS,
  type User,
  type Family,
} from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'

// ── Constants ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  dependent: 'Dependent',
  observer: 'Observer',
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ name, role, size = 44 }: { name: string; role: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const bg = ROLE_HEX_COLORS[role ?? ''] ?? '#6B7280'
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  )
}

// ── Member card ───────────────────────────────────────────────────────────

function MemberCard({ member, isMe }: { member: User; isMe: boolean }) {
  const roleColor = ROLE_HEX_COLORS[member.role ?? ''] ?? '#6B7280'
  return (
    <View style={[styles.memberCard, isMe && styles.memberCardMe]}>
      <Avatar name={member.name} role={member.role} size={44} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isMe && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '18' }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>
            {ROLE_LABELS[member.role ?? ''] ?? member.role}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const insets = useSafeAreaInsets()
  const { user, refreshUser } = useUser()
  const router = useRouter()

  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Inline family name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Auth user email (from Supabase session, not DB)
  const [email, setEmail] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const load = useCallback(async (quiet = false) => {
    if (!user?.family_id) return
    if (!quiet) setLoading(true)
    try {
      const [familyData, membersData] = await Promise.all([
        getFamily(user.family_id),
        getFamilyMembers(user.family_id),
      ])
      setFamily(familyData)
      setMembers(membersData)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.family_id])

  useEffect(() => { load() }, [load])

  // Load email from Supabase session
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
      <View style={[styles.root, { paddingTop: insets.top }, styles.center]}>
        <ActivityIndicator color={T.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ───────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family</Text>
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.signOutBtn}
          activeOpacity={0.7}
        >
          {signingOut
            ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
            : <Text style={styles.signOutText}>Sign out</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={T.primary}
          />
        }
      >

        {/* ── Family name card ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your family</Text>
          <View style={styles.familyCard}>
            <View style={styles.familyIconWrap}>
              <Text style={styles.familyIcon}>🏠</Text>
            </View>
            <View style={styles.familyCardBody}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
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
                    style={styles.nameSaveBtn}
                    activeOpacity={0.8}
                  >
                    {savingName
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text style={styles.nameSaveText}>Save</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingName(false)}
                    style={styles.nameCancelBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nameCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameDisplayRow}>
                  <Text style={styles.familyName}>{family?.name ?? '—'}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => { setNameInput(family?.name ?? ''); setEditingName(true) }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Text style={styles.memberCount}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
            </View>
          </View>
        </View>

        {/* ── Members ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Members</Text>
          <View style={styles.membersList}>
            {members.map((m, i) => (
              <React.Fragment key={m.id}>
                <MemberCard member={m} isMe={m.id === user?.id} />
                {i < members.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Your profile ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your profile</Text>
          <View style={styles.profileCard}>
            {user && <Avatar name={user.name} role={user.role} size={52} />}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
              {email && <Text style={styles.profileEmail}>{email}</Text>}
              {user?.role && (
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_HEX_COLORS[user.role] ?? '#6B7280') + '18', marginTop: 4 }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_HEX_COLORS[user.role] ?? '#6B7280' }]}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Sign out ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutCard}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut
            ? <ActivityIndicator color="#EF4444" size="small" />
            : <Text style={styles.signOutCardText}>Sign out</Text>}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const T = {
  primary: '#312E81',
  p800: '#1E1B4B',
  accent: '#FB7185',
  bg: '#f0eff8',
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    backgroundColor: T.p800,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // Scroll
  scrollContent: {
    padding: 16,
    gap: 20,
  },

  // Section
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a5a5b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },

  // Family card
  familyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  familyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.p800,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  familyIcon: {
    fontSize: 22,
  },
  familyCardBody: {
    flex: 1,
    gap: 2,
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '800',
    color: T.primary,
    flex: 1,
  },
  editIcon: {
    fontSize: 14,
  },
  memberCount: {
    fontSize: 12,
    color: '#a5a5b8',
    fontWeight: '500',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: T.primary,
    borderBottomWidth: 2,
    borderBottomColor: T.accent,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  nameSaveBtn: {
    backgroundColor: T.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 48,
    alignItems: 'center',
  },
  nameSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  nameCancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCancelText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
  },

  // Members list
  membersList: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  memberCardMe: {
    backgroundColor: 'rgba(49,46,129,0.03)',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    flexShrink: 0,
  },
  avatarText: {
    color: 'white',
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: T.primary,
  },
  youBadge: {
    backgroundColor: T.p800,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(165,180,252,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginLeft: 72,
  },

  // Profile card
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: T.primary,
  },
  profileEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Sign out (bottom)
  signOutCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
})
