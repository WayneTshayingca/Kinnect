// Palette for the dark auth screens (login, signup, forgot-password).
// Previously redeclared identically in login.tsx and signup.tsx.
//
// Contrast note: text colours are tuned against the #1A1830 ground.
// `muted` was 0.45 (~4.4:1) and `mutedDim` 0.25 (~2.2:1) — both under
// WCAG AA — before the contrast pass.
export const C = {
  bg:          '#1A1830',
  bgDeep:      '#0F0D24',
  coral:       '#FB7185',
  coralDim:    'rgba(251,113,133,0.15)',
  white:       '#FFFFFF',
  glass:       'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.11)',
  muted:       'rgba(255,255,255,0.62)',
  mutedDim:    'rgba(255,255,255,0.55)',
  placeholder: 'rgba(255,255,255,0.5)',
  indigo:      'rgba(99,102,241,0.14)',
}
