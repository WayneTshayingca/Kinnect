import '../lib/supabase'
import '../global.css'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { UserProvider } from '@/components/providers/user-provider'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
