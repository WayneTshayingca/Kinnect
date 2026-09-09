import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { signOut } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { Avatar } from '@/components/Avatar'
import { T } from '@/lib/theme'

type MenuRoute = '/profile' | '/routines' | '/account-security'

const MENU_ITEMS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: MenuRoute }[] = [
  { key: 'profile', label: 'Family & profile', icon: 'people-outline', route: '/profile' },
  { key: 'routines', label: 'Routines', icon: 'repeat-outline', route: '/routines' },
  { key: 'security', label: 'Security', icon: 'lock-closed-outline', route: '/account-security' },
]

export default function MenuScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          try {
            await signOut()
            router.replace('/(auth)/login')
          } catch {
            setSigningOut(false)
            Alert.alert('Error', 'Could not sign out. Please try again.')
          }
        },
      },
    ])
  }

  return (
    <View className="flex-1 bg-[#f0eff8]" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-extrabold text-primary-600 tracking-tight">Menu</Text>
      </View>

      <View className="px-4 pt-2">
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 bg-white rounded-3xl p-4 mb-4 shadow-sm"
        >
          {user && <Avatar name={user.name} role={user.role} size={48} borderWidth={2} />}
          <View className="flex-1">
            <Text className="text-base font-extrabold text-primary-600">{user?.name ?? '—'}</Text>
            <Text className="text-xs text-ink-muted mt-0.5 capitalize">{user?.role ?? ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.mutedInk} />
        </TouchableOpacity>

        <View className="bg-white rounded-3xl overflow-hidden shadow-sm">
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
              className={`flex-row items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}
            >
              <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center">
                <Ionicons name={item.icon} size={18} color="#312E81" />
              </View>
              <Text className="flex-1 text-[15px] font-bold text-primary-600">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={T.mutedInk} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
          className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center justify-center mt-4"
        >
          {signingOut
            ? <ActivityIndicator color="#EF4444" size="small" />
            : <Text className="text-[15px] font-bold text-red-500">Sign out</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}
