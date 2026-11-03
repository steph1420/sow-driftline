/** Local calendar date (device zone), overridable with ?today=YYYY-MM-DD for stills. */
export function todayIso(): string {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('today') : null
  if (q && /^\d{4}-\d\d-\d\d$/.test(q)) return q
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
