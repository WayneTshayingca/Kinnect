import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@/components/providers/user-provider'

export default function Index() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/(auth)/login')
    } else if (!user.active_family_id && !user.family_id) {
      router.replace('/(onboarding)')
    } else {
      router.replace('/(tabs)')
    }
  }, [user, loading, router])

  return (
    <View className="flex-1 items-center justify-center bg-primary-800">
      <ActivityIndicator size="large" color="#FB7185" />
    </View>
  )
}
