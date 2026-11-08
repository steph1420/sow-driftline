// v0.8 F-SH-08 (O3-session-open): pick the school year. This year is ticked; past years open view-only.
import { useApp } from '../store/store'
import { recentYears } from '../data/schoolYear'
import { todayIso } from '../data/today'
import { GLYPH } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

export function SessionSheet({ onClose }: { onClose: () => void }) {
  const viewing = useApp((s) => s.viewing); const viewYear = useApp((s) => s.viewYear)
  const [now, ...past] = recentYears(todayIso())
  const pick = (id: string) => { viewYear(id); onClose() }
  const row = (id: string, label: string, sub?: string) => { const on = (viewing ?? now!.id) === id
    return <button key={id} className={`dl-row dl-row--btn sow-year${on ? ' on' : ''}`} aria-label={sub ? `${label}, ${sub}` : label} aria-current={on} onClick={() => pick(id)}>
      <span className="sow-year__txt"><b>{label}</b>{sub && <small>{sub}</small>}</span><span className="sow-sp" />{on && <i aria-hidden>{GLYPH.tick}</i>}</button> }
  return (
    <Sheet label="Session" onClose={onClose} className="sow-session">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Session</h2><button className="sow-x" aria-label="Close" onClick={onClose}>{GLYPH.close}</button></div>
      <div className="dl-list">{row(now!.id, now!.label, 'This year')}{past.map((y) => row(y.id, y.label))}</div>
      <p className="sow-session__note">Past years are view-only</p>
    </Sheet>)
}
