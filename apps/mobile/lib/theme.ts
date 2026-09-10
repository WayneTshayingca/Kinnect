// Kinnect design system tokens, from the Claude Design project
// (_ds/kinnect-design-system/colors_and_type.css + README).
//
// DS is the single source of truth. `T` below is the legacy alias kept because
// many screens still import it — its members now point at DS values so the two
// can't drift apart.
export const DS = {
  // Surfaces
  screen: '#f8f8fb',        // light app surface all screens sit on
  card: '#ffffff',
  lavender: '#EEF2FF',      // Lavender Mist — secondary buttons, icon chips
  indigo900: '#1E1B4B',
  indigo600: '#312E81',     // Deep Indigo — brand primary
  indigo500: '#4F46E5',
  indigo300: '#A5B4FC',     // subtitle on dark banners
  indigo100: '#E0E7FF',

  // Accent — Soft Coral
  coral: '#FB7185',
  coral700: '#E11D48',
  coral100: '#FFE4E6',

  // Success — Sage Green
  green700: '#059669',
  green50: '#ECFDF5',

  // Text
  ink: '#0a0a14',           // body copy on white
  inkMuted: '#717182',      // secondary copy
  inkFaint: '#9a9ab0',      // legal / footnotes
  neutral: '#f3f3f5',

  // Extra neutrals used by controls
  success: '#34D399',       // Sage Green — completed states
  hairline: 'rgba(0,0,0,0.05)',
  border: 'rgba(0,0,0,0.06)',
  checkboxBorder: '#d5d5e0',
  glass: 'rgba(255,255,255,0.10)',   // chips on dark banners
  glassCard: 'rgba(255,255,255,0.08)',

  // Banner gradient (135deg) — the dashboard/paywall hero treatment
  bannerGradient: ['#1e1b4b', '#312e81', '#3730a3'] as const,

  radius: {
    chip: 10,
    badge: 8,
    input: 10,
    pill: 12,
    button: 14,
    iconChip: 14,
    banner: 22,       // dark banner cards on non-home screens
    heroBottom: 28,   // home hero's bottom corners
    card: 24,
    sheet: 18,
    full: 9999,
  },

  // Domain tints for card-header icon chips: [background, icon]
  chipTint: {
    tasks:     ['#EEF2FF', '#4F46E5'],
    shopping:  ['#FFF5F6', '#FB7185'],
    routines:  ['#EEF2FF', '#4F46E5'],
    calendar:  ['#EEF2FF', '#4F46E5'],
    success:   ['#ECFDF5', '#059669'],
    premium:   ['#FFF5F6', '#FB7185'],
    neutral:   ['#f3f3f5', '#717182'],
  } as const,

  // Category tints for routine/responsibility chips: [background, text]
  categoryTint: {
    transport: ['#EFF6FF', '#2563EB'],
    household: ['#FFFBEB', '#D97706'],
    care:      ['#F5F3FF', '#7C3AED'],
    errand:    ['#F0FDF4', '#16A34A'],
  } as const,

  // Motion tokens — the design system's named easings.
  motion: {
    // Spring overshoot for completion. RN can't take a cubic-bezier string, so
    // this is the Animated.spring equivalent of cubic-bezier(0.34,1.56,0.64,1).
    completion: { stiffness: 260, damping: 20, mass: 1 },
    fast: 150,
    normal: 280,
    slow: 450,
  },
}

// Legacy alias. Prefer DS in new code; these forward to DS so there is one
// palette rather than two.
export const T = {
  primary: DS.indigo600,
  p800: DS.indigo900,
  accent: DS.coral,
  bg: DS.screen,
  success: DS.success,
  mutedInk: DS.inkMuted,
}

// Brand-tinted shadows (indigo undertone, never neutral grey).
export const DS_SHADOW = {
  card: {
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardRaised: {
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  banner: {
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 10,
  },
}
