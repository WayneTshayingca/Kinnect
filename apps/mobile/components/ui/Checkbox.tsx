import { useEffect, useRef } from 'react'
import { Animated, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DS } from '@/lib/theme'

// Circular completion control. The design gives it a spring overshoot on
// completion — cubic-bezier(0.34,1.56,0.64,1) in CSS, which is a spring here.
// index/tasks/shopping/routines each had their own version at a different size.

export function Checkbox({
  checked,
  onPress,
  size = 24,
  label,
}: {
  checked: boolean
  onPress: () => void
  size?: number
  /** Accessibility label — what completing this actually means. */
  label?: string
}) {
  const scale = useRef(new Animated.Value(checked ? 1.06 : 1)).current
  const fade = useRef(new Animated.Value(checked ? 1 : 0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: checked ? 1.06 : 1,
        useNativeDriver: true,
        ...DS.motion.completion,
      }),
      Animated.timing(fade, {
        toValue: checked ? 1 : 0,
        duration: DS.motion.fast,
        useNativeDriver: true,
      }),
    ]).start()
  }, [checked, scale, fade])

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: checked ? DS.success : '#fff',
            borderColor: checked ? DS.success : DS.checkboxBorder,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View style={{ opacity: fade }}>
          <Ionicons name="checkmark" size={size * 0.58} color="#fff" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
