import Svg, { Path, Circle } from 'react-native-svg'

// Exact mark from the Kinnect design system: an "I" stroke + curved "K" leg
// in coral, with three coral joint dots. Sits in the primary-800 rounded square
// next to the family switcher.
export function KinnectMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path d="M12 8V32" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <Path d="M28 8C28 8 18 14 18 20C18 26 28 32 28 32" stroke="#FB7185" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={3} fill="#FB7185" />
      <Circle cx={28} cy={8} r={3} fill="#FB7185" />
      <Circle cx={28} cy={32} r={3} fill="#FB7185" />
    </Svg>
  )
}
