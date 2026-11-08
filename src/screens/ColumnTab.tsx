import { fmtDay } from '../data/model'
import { GLYPH } from '../ui/icons'

/** v0.8 F-CL-02 (G5d): glass tab above a date column, done/total over a day + date chip. Past dates are amber. */
type Props = { kind: string; date: string; done: number; total: number; past: boolean; onCount: () => void; onDate: () => void }
const shortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')

export function ColumnTab({ kind, date, done, total, past, onCount, onDate }: Props) {
  const name = [kind, shortDate(date)].filter(Boolean).join(' ')
  const day = new Date(date + 'T00:00:00').getDate()
  return (
    <div className="sow-tab">
      <button className="sow-tab__n dl-num" aria-label={`${name}, ${done} of ${total} done`} onClick={onCount}>{done}<small>/{total}</small></button>
      <button className={`sow-tab__d${past ? ' old' : ''}`} aria-label={`Dates, ${name}`} onClick={onDate}>{fmtDay(date).dow} {day} <i aria-hidden>{GLYPH.down}</i></button>
    </div>
  )
}
