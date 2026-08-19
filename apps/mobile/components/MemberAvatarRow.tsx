import { View, Text } from 'react-native'
import { Avatar } from '@/components/Avatar'
import type { User } from '@kinnect/core'

interface MemberAvatarRowProps {
  members: User[]
  size?: number
  maxVisible?: number
  ringColor?: string
  overflowBg?: string
}

export function MemberAvatarRow({
  members,
  size = 44,
  maxVisible,
  ringColor = '#f0eff8',
  overflowBg = '#312E81',
}: MemberAvatarRowProps) {
  const visible = maxVisible ? members.slice(0, maxVisible) : members
  const overflow = maxVisible ? members.length - visible.length : 0
  const overlap = -(size * 0.32)

  return (
    <View className="flex-row items-center">
      {visible.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i > 0 ? overlap : 0, zIndex: visible.length - i }}>
          <Avatar name={m.name} role={m.role} size={size} borderColor={ringColor} borderWidth={2.5} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: overlap,
            zIndex: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: overflowBg,
            borderColor: ringColor,
            borderWidth: 2.5,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800', fontSize: size * 0.32 }}>+{overflow}</Text>
        </View>
      )}
    </View>
  )
}
