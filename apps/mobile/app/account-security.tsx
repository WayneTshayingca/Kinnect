import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { changePassword } from '@kinnect/core'
import { T } from '@/lib/theme'

const MIN_LENGTH = 6

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setError('')
    setSuccess(false)

    if (newPassword.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      await changePassword(newPassword)
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f0eff8]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      <View className="bg-primary-800 px-5 pt-1.5 pb-[18px] rounded-b-3xl flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-white tracking-tight">Security</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-ink-muted uppercase tracking-wide px-1">
            Change password
          </Text>

          <View className="bg-white rounded-3xl p-4 gap-3 shadow-sm">
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <Text className="text-[13px] text-red-600 font-medium">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text className="text-[13px] text-emerald-700 font-medium">
                  Password updated
                </Text>
              </View>
            ) : null}

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-primary-600">New password</Text>
              <TextInput
                className="bg-[#f7f7fa] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[15px] text-primary-600"
                placeholder={`At least ${MIN_LENGTH} characters`}
                placeholderTextColor={T.mutedInk}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoComplete="new-password"
                selectionColor={T.accent}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-primary-600">Confirm new password</Text>
              <TextInput
                className="bg-[#f7f7fa] border border-black/[0.06] rounded-xl px-3.5 py-3 text-[15px] text-primary-600"
                placeholder="Re-enter your new password"
                placeholderTextColor={T.mutedInk}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoComplete="new-password"
                selectionColor={T.accent}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity
              onPress={() => setReveal((r) => !r)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 self-start"
              accessibilityLabel={reveal ? 'Hide passwords' : 'Show passwords'}
            >
              <Ionicons
                name={reveal ? 'eye-off-outline' : 'eye-outline'}
                size={15}
                color={T.mutedInk}
              />
              <Text className="text-xs font-medium text-ink-muted">
                {reveal ? 'Hide' : 'Show'} password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !newPassword || !confirmPassword}
              activeOpacity={0.85}
              className={`rounded-2xl py-3.5 items-center justify-center mt-1 ${
                saving || !newPassword || !confirmPassword ? 'bg-accent-500/50' : 'bg-accent-500'
              }`}
            >
              {saving
                ? <ActivityIndicator color="white" size="small" />
                : <Text className="text-[15px] font-bold text-white">Update password</Text>}
            </TouchableOpacity>
          </View>

          <Text className="text-[11px] text-ink-muted px-1 leading-4">
            You'll stay signed in on this device. If you signed up with Google, setting a
            password lets you sign in either way.
          </Text>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
