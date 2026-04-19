import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { signUp } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { refreshUser } = useUser()
  const router = useRouter()

  async function handleSignup() {
    if (!name || !email || !password) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, name)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-16 h-16 bg-accent-50 rounded-full items-center justify-center mb-6">
          <Text className="text-3xl">✉️</Text>
        </View>
        <Text className="text-gray-900 text-2xl font-bold text-center mb-3">Check your email</Text>
        <Text className="text-gray-500 text-sm text-center mb-8">
          We sent a verification link to{' '}
          <Text className="font-semibold text-gray-900">{email}</Text>.
          Tap the link to activate your account.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="bg-accent-500 rounded-xl py-4 px-8">
            <Text className="text-white font-semibold text-base">Back to sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary-800"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand header */}
        <View className="px-8 pt-20 pb-12">
          <Text className="text-white text-3xl font-bold tracking-tight">kinnect</Text>
          <Text className="text-white/60 text-base mt-2">Join Africa's family coordination platform</Text>
        </View>

        {/* Card */}
        <View className="flex-1 bg-white rounded-t-3xl px-8 pt-10 pb-8">
          <Text className="text-gray-900 text-2xl font-bold mb-1">Create your account</Text>
          <Text className="text-gray-500 text-sm mb-8">Start coordinating with your family</Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-gray-700 text-sm font-medium mb-1.5">Full name</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View>
              <Text className="text-gray-700 text-sm font-medium mb-1.5">Email address</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View>
              <Text className="text-gray-700 text-sm font-medium mb-1.5">Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-accent-500 rounded-xl py-4 items-center mb-4"
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create account</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-500 text-sm">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-accent-600 font-semibold text-sm">Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Text className="text-center text-xs text-gray-400 mt-6">
            By signing up you agree to our Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
