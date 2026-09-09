import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { updateFamilyMember, type User } from '@kinnect/core'
import { apiFetch } from '@/lib/api'
import { T } from '@/lib/theme'
import { BottomSheetModal } from './BottomSheetModal'

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Full access, can manage members' },
  { value: 'member', label: 'Member', hint: 'Can add and complete things' },
  { value: 'dependent', label: 'Dependent', hint: 'Tracked, no sign-in' },
  { value: 'observer', label: 'Observer', hint: 'View only, no sign-in' },
]

type Role = 'admin' | 'member' | 'dependent' | 'observer'

interface MemberSheetProps {
  visible: boolean
  familyId: string
  /** Passing a member switches the sheet to edit mode. */
  member?: User | null
  onClose: () => void
  onSaved: () => void
}

export function MemberSheet({ visible, familyId, member, onClose, onSaved }: MemberSheetProps) {
  const isEditing = !!member
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setName(member?.name ?? '')
    setRole((member?.role as Role) ?? 'member')
    setError('')
  }, [visible, member])

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isEditing && member) {
        await updateFamilyMember(member.id, { name: name.trim(), role })
      } else {
        // Dependents and observers have no auth_user_id, so RLS blocks a
        // client insert — always go through the service-role route.
        await apiFetch('/api/members', {
          method: 'POST',
          body: { familyId, name: name.trim(), role },
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal
      visible={visible}
      title={isEditing ? 'Edit member' : 'Add member'}
      error={error}
      submitting={saving}
      submitLabel={isEditing ? 'Save changes' : 'Add member'}
      onClose={onClose}
      onSubmit={handleSubmit}
      slideFrom={520}
    >
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Gogo Nomsa"
          placeholderTextColor={T.mutedInk}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          selectionColor={T.accent}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleList}>
          {ROLES.map((r) => {
            const active = role === r.value
            return (
              <TouchableOpacity
                key={r.value}
                onPress={() => setRole(r.value)}
                activeOpacity={0.7}
                style={[styles.roleRow, active && styles.roleRowActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
                <View style={styles.roleText}>
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleHint}>{r.hint}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {!isEditing && (
        <Text style={styles.footnote}>
          Dependents and observers don't sign in. You can invite admins and members to their
          own account from the web app.
        </Text>
      )}
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.primary,
  },
  roleList: {
    gap: 6,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: T.bg,
  },
  roleRowActive: {
    borderColor: T.accent,
    backgroundColor: '#FFF5F6',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: T.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.accent,
  },
  roleText: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: T.primary,
  },
  roleLabelActive: {
    color: T.accent,
  },
  roleHint: {
    fontSize: 11,
    color: T.mutedInk,
    marginTop: 1,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    color: T.mutedInk,
  },
})
