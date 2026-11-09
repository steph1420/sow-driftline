// RDs2 Settings › Date format and Date subtext for the column headers (t134u/t135u). Pure.
export type DateFmt = 'dm' | 'dow' | 'dmon'
export type DateSub = 'count' | 'topic'
export const DATE_FMTS: readonly { id: DateFmt; label: string }[] = [{ id: 'dm', label: '10/11' }, { id: 'dow', label: 'Tue 10' }, { id: 'dmon', label: '10 Nov' }]
export const DATE_SUBS: readonly { id: DateSub; label: string }[] = [{ id: 'count', label: 'Count' }, { id: 'topic', label: 'Topic' }]
/** '10/11' (default), 'Tue 10' or '10 Nov' for an ISO date. */
export function fmtDate(iso: string, fmt: DateFmt): string {
  const d = new Date(iso + 'T00:00:00')
  if (fmt === 'dow') return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()}`
  if (fmt === 'dmon') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${d.getDate()}/${d.getMonth() + 1}`
}
