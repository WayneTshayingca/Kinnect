import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index:    { active: 'home',              inactive: 'home-outline' },
  tasks:    { active: 'checkmark-circle',  inactive: 'checkmark-circle-outline' },
  shopping: { active: 'cart',              inactive: 'cart-outline' },
  calendar: { active: 'calendar',          inactive: 'calendar-outline' },
  family:   { active: 'people',            inactive: 'people-outline' },
}

const TAB_LABELS: Record<string, string> = {
  index:    'Home',
  tasks:    'Tasks',
  shopping: 'Shopping',
  calendar: 'Calendar',
  family:   'Family',
}

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1B4B',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 56 + bottom,
          paddingBottom: bottom > 0 ? bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#FB7185',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name]
          const name = focused ? icons?.active : icons?.inactive
          return name ? <Ionicons name={name} size={22} color={color} /> : null
        },
        title: TAB_LABELS[route.name] ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="shopping" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="family" />
    </Tabs>
  )
}
