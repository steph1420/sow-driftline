// v0.7f/g date wheels: Month | Date | Day + year pill (Steve t74u, t75u). Pure. Spec: FEATURES.md F-DT-02/03.
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number]
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m is 1-based
const fmt = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const fromUtc = (t: number) => { const x = new Date(t); return fmt(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()) }
export function spinMonth(iso: string, delta: number): string {
  const [y, m, d] = parts(iso); const k = y * 12 + (m - 1) + delta; const ny = Math.floor(k / 12), nm = (k % 12 + 12) % 12 + 1
  return fmt(ny, nm, Math.min(d, dim(ny, nm)))
}
export function spinDate(iso: string, delta: number): string {
  const [y, m, d] = parts(iso); const n = dim(y, m); return fmt(y, m, ((d - 1 + delta) % n + n) % n + 1)
}
/** 0 = Monday … 6 = Sunday. */
export const dowOf = (iso: string) => { const [y, m, d] = parts(iso); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 }
/** Moves to that weekday in the same Mon–Sun week. */
export function spinDay(iso: string, dow: number): string {
  const [y, m, d] = parts(iso); return fromUtc(Date.UTC(y, m - 1, d) + (dow - dowOf(iso)) * 864e5)
}
export function setYear(iso: string, year: number): string { const [, m, d] = parts(iso); return fmt(year, m, Math.min(d, dim(year, m))) }
export const addDays = (iso: string, n: number) => { const [y, m, d] = parts(iso); return fromUtc(Date.UTC(y, m - 1, d) + n * 864e5) }
