import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { createFamily } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'

export default function OnboardingScreen() {
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshUser } = useUser()
  const router = useRouter()

  async function handleCreate() {
    if (!familyName.trim()) {
      setError('Please enter a family name')
      return
    }
    setError('')
    setLoading(true)
    try {
      await createFamily(familyName.trim())
      await refreshUser()
      router.replace('/(tabs)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create family')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary-800"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-8 pt-20 pb-12">
        {/* Brand */}
        <Text className="text-white text-3xl font-bold tracking-tight mb-1">kinnect</Text>
        <Text className="text-white/60 text-base mb-12">Let's set up your family</Text>

        {/* Card */}
        <View className="bg-white rounded-3xl px-7 py-8">
          <Text className="text-gray-900 text-xl font-bold mb-2">Welcome! 👋</Text>
          <Text className="text-gray-500 text-sm mb-8">
            Create your family to get started. You can invite members later.
          </Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="mb-6">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">Family name</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-base"
              placeholder="The Dlaminis"
              placeholderTextColor="#9CA3AF"
              value={familyName}
              onChangeText={setFamilyName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Text className="text-gray-400 text-xs mt-1.5">
              A family name, nickname, or anything you like
            </Text>
          </View>

          <TouchableOpacity
            className="bg-accent-500 rounded-xl py-4 items-center"
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create family</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
