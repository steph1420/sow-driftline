import { dateLabel, dayLabel } from '../data/model'
import { GLYPH } from '../ui/icons'

/** v0.8 F-CL-02 (G5d): glass tab above a date column, done/total over a day + date chip. Past dates are amber. */
type Props = { kind: string; date: string; done: number; total: number; past: boolean; onCount: () => void; onDate: () => void }

export function ColumnTab({ kind, date, done, total, past, onCount, onDate }: Props) {
  const name = [kind, dateLabel(date)].filter(Boolean).join(' ')
  return (
    <div className="sow-tab">
      <button className="sow-tab__n dl-num" aria-label={`${name}, ${done} of ${total} done`} onClick={onCount}>{done}<small>/{total}</small></button>
      <button className={`sow-tab__d${past ? ' old' : ''}`} aria-label={`Dates, ${name}`} onClick={onDate}>{dayLabel(date)} <i aria-hidden>{GLYPH.down}</i></button>
    </div>
  )
}
