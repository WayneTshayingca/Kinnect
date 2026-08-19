import Svg, { Rect, Circle, Polyline, Path, Line } from 'react-native-svg'

interface IconProps {
  color: string
  focused?: boolean
  size?: number
}

// Exact Lucide paths pulled from the Kinnect design system's mobile nav spec —
// strokeWidth 1.75 inactive / 2.2 active per the design's iconography rule.

export function DashboardIcon({ color, focused, size = 22 }: IconProps) {
  const sw = focused ? 2.2 : 1.75
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={8} height={8} rx={2} />
      <Rect x={13} y={3} width={8} height={5} rx={2} />
      <Rect x={13} y={10} width={8} height={11} rx={2} />
      <Rect x={3} y={13} width={8} height={8} rx={2} />
    </Svg>
  )
}

export function TasksIcon({ color, focused, size = 22 }: IconProps) {
  const sw = focused ? 2.2 : 1.75
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Polyline points="16 10 11 15 8 12.5" />
    </Svg>
  )
}

export function ShoppingIcon({ color, focused, size = 22 }: IconProps) {
  const sw = focused ? 2.2 : 1.75
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m5 11 4-7" />
      <Path d="m19 11-4-7" />
      <Path d="M2 11h20" />
      <Path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" />
      <Path d="m9 11 1 9" />
      <Path d="M4.5 15.5h15" />
      <Path d="m15 11-1 9" />
    </Svg>
  )
}

export function CalendarIcon({ color, focused, size = 22 }: IconProps) {
  const sw = focused ? 2.2 : 1.75
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Line x1={3} y1={10} x2={21} y2={10} />
      <Line x1={8} y1={3} x2={8} y2={6} />
      <Line x1={16} y1={3} x2={16} y2={6} />
    </Svg>
  )
}

export function MenuIcon({ color, focused, size = 22 }: IconProps) {
  const sw = focused ? 2.2 : 1.75
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <Line x1={4} y1={7} x2={20} y2={7} />
      <Line x1={4} y1={12} x2={20} y2={12} />
      <Line x1={4} y1={17} x2={20} y2={17} />
    </Svg>
  )
}
