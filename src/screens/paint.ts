// Swipe-to-tick geometry, ported from /sow/ paintPhysics (extendTarget hesitancy, rollsBetween fill).
type R = { roll: number; top: number; bottom: number }
export function rollAtY(y: number, rows: R[], slop = 6): number | null { for (const r of rows) if (y >= r.top - slop && y <= r.bottom + slop) return r.roll; return null }
export function extendTarget(y: number, rows: R[], start: number, armed: boolean, minBeyond: number, frac: number): { roll: number | null; armed: boolean } {
  if (armed) return { roll: rollAtY(y, rows, 0), armed }
  const i = rows.findIndex((r) => r.roll === start); if (i < 0) return { roll: null, armed: false }
  const s = rows[i]!
  if (y > s.bottom) { const n = rows[i + 1]; if (n && y - s.bottom >= minBeyond && y - n.top >= (n.bottom - n.top) * frac) return { roll: rollAtY(y, rows, 0), armed: true } }
  else if (y < s.top) { const n = rows[i - 1]; if (n && s.top - y >= minBeyond && n.bottom - y >= (n.bottom - n.top) * frac) return { roll: rollAtY(y, rows, 0), armed: true } }
  return { roll: null, armed: false }
}
export function rollsBetween(order: number[], a: number, b: number): number[] { const i = order.indexOf(a), j = order.indexOf(b); return i < 0 || j < 0 ? [] : order.slice(Math.min(i, j), Math.max(i, j) + 1) }
