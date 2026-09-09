import '../lib/supabase'
import '../global.css'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { UserProvider } from '@/components/providers/user-provider'
import { SubscriptionProvider } from '@/components/providers/subscription-provider'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <UserProvider>
          <SubscriptionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/* The paywall is a decision surface, so it arrives as a sheet
                  rather than another push onto the stack. */}
              <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            </Stack>
          </SubscriptionProvider>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
