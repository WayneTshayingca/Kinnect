/** Human-readable display labels for family member roles. */
export const ROLE_LABELS: Record<string, string> = {
  admin:     'Admin',
  member:    'Member',
  dependent: 'Dependent',
  observer:  'Observer',
}

/**
 * Hex colour values for each role.
 * Platform-agnostic — use these in React Native or anywhere Tailwind classes aren't available.
 * Web: prefer ROLE_COLORS (Tailwind classes) in apps/web/lib/constants.ts for className usage.
 */
export const ROLE_HEX_COLORS: Record<string, string> = {
  admin:     '#4F46E5', // indigo-500
  member:    '#7C3AED', // violet-600
  dependent: '#10B981', // emerald-600
  observer:  '#D97706', // amber-600
}
