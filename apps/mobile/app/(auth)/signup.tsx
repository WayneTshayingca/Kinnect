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
import { signUp } from '@kinnect/core'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const insets = useSafeAreaInsets()
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
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.glowTop} pointerEvents="none" />
        <View style={styles.glowBottom} pointerEvents="none" />
        <View style={styles.verifyContainer}>
          <View style={styles.verifyIconWrap}>
            <Text style={styles.verifyEmoji}>✉️</Text>
          </View>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifyBody}>
            We sent a verification link to{' '}
            <Text style={styles.verifyEmail}>{email}</Text>.
            {'\n'}Tap the link to activate your account.
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backBtn} activeOpacity={0.88}>
              <Text style={styles.backBtnText}>Back to sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    )
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
        {/* Wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Kinnect</Text>
          <View style={styles.dot} />
        </View>

        {/* Headline */}
        <View style={styles.headlineBlock}>
          <Text style={styles.headlineWhite}>Join your</Text>
          <Text style={styles.headlineCoral}>family.</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Create your account and start coordinating with the people who matter most.
        </Text>

        {/* Form */}
        <View style={styles.formBlock}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              selectionColor="#FB7185"
            />
          </View>

          <View>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              selectionColor="#FB7185"
            />
          </View>

          <View style={styles.fieldLast}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              selectionColor="#FB7185"
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnLoading]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.createBtnText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <Text style={styles.signInPrompt}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Text style={styles.legal}>By signing up you agree to our Privacy Policy</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const C = {
  bg:          '#1A1830',
  coral:       '#FB7185',
  coralDim:    'rgba(251,113,133,0.15)',
  white:       '#FFFFFF',
  glass:       'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.11)',
  muted:       'rgba(255,255,255,0.45)',
  mutedDim:    'rgba(255,255,255,0.25)',
  indigo:      'rgba(99,102,241,0.14)',
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

  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.coral,
    marginLeft: 6,
    marginBottom: 8,
  },

  headlineBlock: {
    marginBottom: 14,
  },
  headlineWhite: {
    fontSize: 38,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headlineCoral: {
    fontSize: 38,
    fontWeight: '900',
    color: C.coral,
    letterSpacing: -1.2,
    lineHeight: 44,
  },

  subtitle: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 40,
    maxWidth: 300,
  },

  formBlock: {
    gap: 16,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.mutedDim,
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
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

  fieldLast: {
    marginBottom: 4,
  },

  createBtn: {
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
  createBtnLoading: {
    opacity: 0.75,
  },
  createBtnText: {
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

  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Verification screen
  verifyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  verifyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251,113,133,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  verifyEmoji: {
    fontSize: 32,
  },
  verifyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  verifyBody: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 36,
  },
  verifyEmail: {
    color: C.white,
    fontWeight: '600',
  },
  backBtn: {
    backgroundColor: C.coral,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    shadowColor: C.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.2,
  },
})
