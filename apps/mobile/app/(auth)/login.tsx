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
import { AntDesign } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { signIn, getSupabase } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { C } from '@/lib/authTheme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { refreshUser } = useUser()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      await refreshUser()
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const supabase = getSupabase()
      const redirectTo = Linking.createURL('auth/callback')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return  // user cancelled

      // Tokens arrive in the URL fragment: kinnect://#access_token=...&refresh_token=...
      const hashIndex = result.url.indexOf('#')
      const queryIndex = result.url.indexOf('?')
      const raw = hashIndex !== -1
        ? result.url.substring(hashIndex + 1)
        : queryIndex !== -1 ? result.url.substring(queryIndex + 1) : ''
      const params = new URLSearchParams(raw)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) throw new Error('Google sign-in failed — no tokens returned')

      const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      if (sessionError) throw sessionError

      await refreshUser()
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Atmospheric background glow */}
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
        {/* ── Wordmark ───────────────────────────────── */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Kinnect</Text>
          <View style={styles.dot} />
        </View>

        {/* ── Headline ───────────────────────────────── */}
        <View style={styles.headlineBlock}>
          <Text style={styles.headlineWhite}>Your family,</Text>
          <Text style={styles.headlineCoral}>coordinated.</Text>
        </View>

        {/* ── Subtitle ───────────────────────────────── */}
        <Text style={styles.subtitle}>
          Built for South African families. Manage tasks, events, routines and shopping — together.
        </Text>

        {/* ── Form ───────────────────────────────────── */}
        <View style={styles.formBlock}>
          {/* Google button */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogle}
            activeOpacity={0.88}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1A1830" size="small" />
            ) : (
              <>
                <AntDesign name="google" size={18} color="#4285F4" style={styles.googleIcon} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={C.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            selectionColor="#FB7185"
          />

          {/* Password */}
          <TextInput
            style={[styles.input, styles.inputLast]}
            placeholder="Password"
            placeholderTextColor={C.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            selectionColor="#FB7185"
          />

          {/* Forgot password */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity activeOpacity={0.7} style={styles.forgotRow}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Sign in */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnLoading]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>No account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.signUpLink}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Atmospheric depth
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

  // Wordmark
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

  // Headline
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

  // Subtitle
  subtitle: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 40,
    maxWidth: 300,
  },

  // Form block
  formBlock: {
    gap: 12,
  },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
    letterSpacing: -0.2,
  },

  // Or divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 12,
    color: C.mutedDim,
    fontWeight: '600',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },

  // Error
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

  // Inputs
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
  inputLast: {
    marginBottom: 4,
  },

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    marginBottom: 2,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
    color: C.mutedDim,
  },

  // Sign in button
  signInBtn: {
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
  signInBtnLoading: {
    opacity: 0.75,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.2,
  },

  // Sign up
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  signUpPrompt: {
    fontSize: 13.5,
    color: C.mutedDim,
  },
  signUpLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.coral,
  },
})
