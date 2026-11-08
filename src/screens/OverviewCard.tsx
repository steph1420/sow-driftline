// v0.8 F-OV-01/02/05/06 (O2g): one class + subject + type. Big done/total for today (a dash when the date is still ahead),
// topic, today and this week's dates (first one current), ＋ and All ›. Press and hold for the card menu.
import type { Card } from '../data/overview'
import { dateLabel, dayLabel } from '../data/model'
import { GLYPH } from '../ui/icons'
import { useHold } from '../ui/useHold'

type Props = { card: Card; held: boolean; onOpen: (sessionId: string) => void; onAdd: () => void; onAll: () => void; onHold: (el: HTMLElement) => void }
export const cardName = (c: Card) => `${c.label} ${c.subject} ${c.kind}`

export function OverviewCard({ card: c, held, onOpen, onAdd, onAll, onHold }: Props) {
  const hold = useHold(onHold); const first = c.dates[0]; const name = cardName(c)
  const topic = !first ? 'No dates ahead' : first.when === 'future' ? `Next: ${first.topic || 'no topic yet'}` : first.topic || 'No topic yet'
  return (
    <div className={`dl-card sow-oc${held ? ' held' : ''}`} {...hold}>
      <button className="sow-oc__main" aria-label={`Open ${name} on Checklist`} disabled={!c.open} onClick={() => c.open && onOpen(c.open)}>
        <span className="sow-oc__head"><b className="sow-oc__title">{c.label} · {c.subject} {c.kind}</b>
          {c.pastOpen && <i className="sow-oc__dot" role="img" aria-label="An older date still has copies to come in" />}</span>
        <b className="sow-oc__n dl-num">{first?.when === 'today' ? <>{first.done}<small>/{c.total}</small></> : '—'}</b>
        <span className="sow-oc__topic">{topic}</span>
      </button>
      <div className="sow-oc__dates">
        {c.dates.map((d, i) => <button key={d.sessionId} className={i === 0 ? 'on' : ''} aria-current={i === 0 ? 'date' : undefined} aria-label={`Open ${dateLabel(d.date)}`} onClick={() => onOpen(d.sessionId)}>{dayLabel(d.date)}</button>)}
        <button className="sow-oc__add" aria-label={`Add date, ${name}`} onClick={onAdd}>{GLYPH.plus}</button>
        <span className="sow-sp" />
        <button className="sow-oc__all" aria-label={`All dates, ${name}`} onClick={onAll}>All {GLYPH.next}</button>
      </div>
    </div>)
}
