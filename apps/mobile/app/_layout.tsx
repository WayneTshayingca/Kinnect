import '../lib/supabase'
import '../global.css'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { UserProvider } from '@/components/providers/user-provider'
import { SubscriptionProvider } from '@/components/providers/subscription-provider'

// Declaring children on <Stack> also declares screen order, and the first one
// becomes the initial route — so `index` must be listed first and pinned here,
// or the app boots into whichever screen happens to lead the list.
export const unstable_settings = {
  initialRouteName: 'index',
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <UserProvider>
          <SubscriptionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
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
