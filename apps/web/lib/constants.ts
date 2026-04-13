/**
 * ROLE_LABELS and ROLE_HEX_COLORS live in @kinnect/core — import from there in new code.
 * This shim keeps all existing `@/lib/constants` imports working.
 */
export { ROLE_LABELS, ROLE_HEX_COLORS } from '@kinnect/core'

/**
 * Tailwind background-colour classes for each role.
 * Web-only — React Native uses ROLE_HEX_COLORS from @kinnect/core instead.
 */
export const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-primary-500',
  member:    'bg-purple-500',
  dependent: 'bg-accent-500',
  observer:  'bg-amber-500',
}
