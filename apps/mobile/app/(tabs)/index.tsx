import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@/components/providers/user-provider'
import { signOut } from '@kinnect/core'

export default function HomeScreen() {
  const { user, refreshUser } = useUser()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    await refreshUser()
    router.replace('/(auth)/login')
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-800 pt-16 pb-8 px-6">
        <Text className="text-white/60 text-sm">Good day,</Text>
        <Text className="text-white text-2xl font-bold mt-0.5">{firstName}</Text>
      </View>

      {/* Content */}
      <View className="px-6 pt-6 space-y-4">
        {/* Placeholder cards — these will be replaced with real widgets */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-900 font-semibold text-base mb-1">Today's Tasks</Text>
          <Text className="text-gray-500 text-sm">No tasks scheduled for today</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-900 font-semibold text-base mb-1">Upcoming Events</Text>
          <Text className="text-gray-500 text-sm">No events this week</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-900 font-semibold text-base mb-1">Shopping List</Text>
          <Text className="text-gray-500 text-sm">Nothing on the list yet</Text>
        </View>
      </View>

      {/* Sign out (dev convenience) */}
      <View className="px-6 pt-8 pb-12">
        <TouchableOpacity
          className="border border-gray-200 rounded-xl py-3.5 items-center"
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text className="text-gray-500 text-sm font-medium">Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
