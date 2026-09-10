import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Text, StyleSheet, View } from 'react-native'
import { DS, DS_SHADOW } from '@/lib/theme'

// Non-blocking confirmation, per the design: a dark indigo pill above the tab
// bar with a status dot. Use for "it worked" feedback where the app currently
// reaches for Alert.alert — Alert is a modal and is the wrong weight for
// something the user does not need to acknowledge.
//
// Destructive confirmations and real errors should still use Alert.

type ToastTone = 'success' | 'accent' | 'error'

const TONE_COLOR: Record<ToastTone, string> = {
  success: DS.success,
  accent: DS.coral,
  error: '#d4183d',
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    // @ts-ignore - React 19 Context type compatibility (same as user-provider)
    <ToastContext.Provider value={{ showToast }}>
      {children as any}
      {toast && <ToastPill message={toast.message} tone={toast.tone} />}
    </ToastContext.Provider>
  )
}

function ToastPill({ message, tone }: { message: string; tone: ToastTone }) {
  const slide = useRef(new Animated.Value(10)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [slide, fade])

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      <View style={[styles.dot, { backgroundColor: TONE_COLOR[tone] }]} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: DS.indigo900,
    borderRadius: DS.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...DS_SHADOW.banner,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
})
