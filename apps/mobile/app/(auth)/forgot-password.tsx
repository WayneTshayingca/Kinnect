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
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { resetPasswordForEmail } from '@kinnect/core'
import { C } from '@/lib/authTheme'

// The recovery link lands on the web app — Supabase emails a single URL, and
// the web reset page already exists. Mirrors apps/web/app/auth/forgot-password.
const WEB_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://kinnect.co.za'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPasswordForEmail(email.trim(), `${WEB_URL}/auth/reset-password`)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </TouchableOpacity>

        {sent ? (
          <View style={styles.sentBlock}>
            <View style={styles.sentIcon}>
              <Ionicons name="mail-outline" size={30} color={C.coral} />
            </View>
            <Text style={styles.headline}>Check your email</Text>
            <Text style={styles.subtitle}>
              If an account exists for {email.trim()}, we've sent a link to reset your password.
              Open it on this device and you'll be signed back in.
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88}>
                <Text style={styles.primaryText}>Back to sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <>
            <Text style={styles.headline}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Enter the email address on your account and we'll send you a link to set a new password.
            </Text>

            <View style={styles.formBlock}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={C.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                selectionColor={C.coral}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnLoading]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={styles.primaryText}>Send reset link</Text>}
              </TouchableOpacity>

              <View style={styles.signInRow}>
                <Text style={styles.signInPrompt}>Remembered it? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.signInLink}>Sign in</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  glowTop: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.indigo,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 40,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: C.coralDim,
    opacity: 0.5,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 28,
  },

  headline: {
    fontSize: 30,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 36,
    maxWidth: 320,
  },

  formBlock: {
    gap: 12,
  },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '500',
  },

  input: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: C.white,
    letterSpacing: -0.1,
  },

  primaryBtn: {
    backgroundColor: C.coral,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnLoading: {
    opacity: 0.75,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.2,
  },

  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  signInPrompt: {
    fontSize: 13.5,
    color: C.mutedDim,
  },
  signInLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.coral,
  },

  // Sent confirmation
  sentBlock: {
    gap: 0,
  },
  sentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.coralDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
})
