import { View, Text } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashboardIcon, TasksIcon, ShoppingIcon, CalendarIcon, MenuIcon } from '@/components/TabIcons'

const TAB_ICON_COMPONENTS: Record<string, typeof DashboardIcon> = {
  index: DashboardIcon,
  tasks: TasksIcon,
  shopping: ShoppingIcon,
  calendar: CalendarIcon,
  menu: MenuIcon,
}

const TAB_LABELS: Record<string, string> = {
  index:    'Dashboard',
  tasks:    'Tasks',
  shopping: 'Shopping',
  calendar: 'Calendar',
  menu:     'Menu',
}

const ACTIVE_COLOR = '#4F46E5'
const INACTIVE_COLOR = '#9a9ab0'

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.06)',
          elevation: 0,
          shadowOpacity: 0,
          height: 64 + bottom,
          paddingBottom: bottom > 0 ? bottom : 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused }) => {
          const Icon = TAB_ICON_COMPONENTS[route.name]
          const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR
          return (
            <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 2, gap: 3 }}>
              {Icon && <Icon color={color} focused={focused} size={22} />}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color, letterSpacing: 0.1 }}
              >
                {TAB_LABELS[route.name]}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 9999,
                  marginTop: 1,
                  backgroundColor: focused ? '#FB7185' : 'transparent',
                }}
              />
            </View>
          )
        },
        title: TAB_LABELS[route.name] ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="shopping" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="menu" />
    </Tabs>
  )
}
