// Shared color tokens — previously redeclared identically in every screen
// (tasks.tsx, calendar.tsx, shopping.tsx, index.tsx, family.tsx).
export const T = {
  primary: '#312E81',
  p800: '#1E1B4B',
  accent: '#FB7185',
  bg: '#f7f7fa',
  success: '#34D399',
  // Muted text — tuned for 4.5:1+ contrast on white (WCAG AA).
  // Replaces #a0a0c0 (~2.9:1) and #a5a5b8 (~3.3:1), both of which failed.
  mutedInk: '#6E6E93',
}
