import { View, Text, StyleSheet } from 'react-native'
import { ROLE_HEX_COLORS } from '@kinnect/core'

interface AvatarProps {
  name: string
  role: string | null
  size?: number
  borderColor?: string
  borderWidth?: number
}

// Previously redeclared near-identically in tasks.tsx, index.tsx, and
// family.tsx — border color/width vary per usage, so they stay overridable.
export function Avatar({ name, role, size = 32, borderColor = 'white', borderWidth = 1.5 }: AvatarProps) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const bg = ROLE_HEX_COLORS[role ?? ''] ?? '#6B7280'
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderColor, borderWidth },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: 'white',
    fontWeight: '800',
  },
})
