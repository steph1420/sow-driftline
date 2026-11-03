// Share as quick overview — same text as /sow/ v0.47 "Pending" template: '{class} • {date} • not set/found ({count}):\n{names}'
import { fmtDay } from './model'
export function shareText(o: { label: string; date: string; names: string[] }): string {
  const f = fmtDay(o.date)
  return `${o.label} • ${f.dow} ${f.dm} • not set/found (${o.names.length}):\n${o.names.join('\n')}`
}
