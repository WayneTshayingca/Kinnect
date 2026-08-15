import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
} from 'react-native'
import { T } from '@/lib/theme'

interface BottomSheetModalProps {
  visible: boolean
  title: string
  error?: string
  submitting?: boolean
  submitLabel: string
  onClose: () => void
  onSubmit: () => void
  children: React.ReactNode
  /** Off-screen Y offset the sheet slides in from/out to. */
  slideFrom?: number
}

// Shared slide-up sheet chrome (overlay, handle, header, error box, action
// row) previously duplicated between CreateTaskModal and CreateEventModal.
// Field content is passed as children — only the chrome is shared.
export function BottomSheetModal({
  visible,
  title,
  error,
  submitting = false,
  submitLabel,
  onClose,
  onSubmit,
  children,
  slideFrom = 400,
}: BottomSheetModalProps) {
  const slideAnim = useRef(new Animated.Value(slideFrom)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
    } else {
      Animated.timing(slideAnim, { toValue: slideFrom, duration: 200, useNativeDriver: true }).start()
    }
  }, [visible, slideAnim, slideFrom])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Cast needed: root has @types/react 18, apps/mobile has 19 — the
              hoisted duplicate makes ReactNode's bigint arm fail to match here
              (see the same React-19-vs-18 workaround in user-provider.tsx). */}
          {children as any}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSubmit} style={styles.submitBtn} disabled={submitting} activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: T.primary,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
})
