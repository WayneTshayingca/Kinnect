import { useState } from 'react'
import { View, Text } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashboardIcon, TasksIcon, ShoppingIcon, CalendarIcon, MenuIcon } from '@/components/TabIcons'
import { AppHeader } from '@/components/AppHeader'
import { MenuSheet } from '@/components/MenuSheet'
import { DS } from '@/lib/theme'

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

const ACTIVE_COLOR = DS.indigo600
const INACTIVE_COLOR = DS.inkFaint

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <View style={{ flex: 1, backgroundColor: DS.screen }}>
      {/* One header for every tab, rather than each screen rendering its own. */}
      <AppHeader />

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
            borderTopColor: DS.border,
            elevation: 0,
            shadowOpacity: 0,
            height: 64 + bottom,
            paddingBottom: bottom > 0 ? bottom : 8,
            paddingTop: 8,
          },
          tabBarIcon: ({ focused }) => {
            const Icon = TAB_ICON_COMPONENTS[route.name]
            // The Menu tab opens a sheet, so it stays lit while that sheet is up.
            const active = route.name === 'menu' ? menuOpen : focused
            const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
            return (
              <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 2, gap: 3 }}>
                {Icon && <Icon color={color} focused={active} size={22} />}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontSize: 10, fontWeight: active ? '700' : '500', color, letterSpacing: 0.1 }}
                >
                  {TAB_LABELS[route.name]}
                </Text>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 9999,
                    marginTop: 1,
                    backgroundColor: active ? DS.coral : 'transparent',
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
        <Tabs.Screen
          name="menu"
          listeners={{
            // Not a destination — the design opens an anchored sheet instead.
            tabPress: (e) => {
              e.preventDefault()
              setMenuOpen(true)
            },
          }}
        />
      </Tabs>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  )
}
