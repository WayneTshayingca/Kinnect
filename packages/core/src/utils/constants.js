/** Human-readable display labels for family member roles. */
export const ROLE_LABELS = {
    admin: 'Admin',
    member: 'Member',
    dependent: 'Dependent',
    observer: 'Observer',
};
/**
 * Hex colour values for each role.
 * Platform-agnostic — use these in React Native or anywhere Tailwind classes aren't available.
 * Web: prefer ROLE_COLORS (Tailwind classes) in apps/web/lib/constants.ts for className usage.
 */
export const ROLE_HEX_COLORS = {
    admin: '#6366f1', // indigo  (primary-500)
    member: '#a855f7', // purple  (purple-500)
    dependent: '#fb7185', // coral   (accent-500)
    observer: '#f59e0b', // amber   (amber-500)
};
