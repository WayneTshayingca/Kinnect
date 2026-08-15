/**
 * Applies pending optimistic patches (keyed by row id) on top of freshly
 * fetched rows — avoids a visible flicker back to the pre-optimistic state
 * when a realtime/reload race lands before the write it's tracking settles.
 */
export function mergeInflight<T extends { id: string }>(
  rows: T[],
  inflight: Map<string, Partial<T>>
): T[] {
  if (inflight.size === 0) return rows
  return rows.map((row) => (inflight.has(row.id) ? { ...row, ...inflight.get(row.id) } : row))
}
