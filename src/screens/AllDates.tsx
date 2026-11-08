// v0.8 F-OV-04 (O2e-alldates): every date of one class + subject + type, newest first, by month and week, on a timeline.
// Today is blue, older dates with copies still to come in are amber, dates ahead are hollow. Tap a row to open it.
import { useApp } from '../store/store'
import { allDates, type Card, type OvDate } from '../data/overview'
import { dateLabel, dayLabel } from '../data/model'
import { GLYPH, Icon } from '../ui/icons'

type Props = { card: Card; today: string; onBack: () => void; onOpen: (sessionId: string) => void; onAdd: () => void; onShare: () => void }
const count = (d: OvDate, total: number) => (d.when === 'future' ? '—' : d.left === 0 ? `${total} ${GLYPH.tick}` : `${d.done}/${total}`)
const said = (d: OvDate, total: number) => `${dateLabel(d.date)}${d.when === 'today' ? ', today' : ''}, ${d.when === 'future' ? 'still ahead' : `${d.done} of ${total} in`}`

export function AllDates({ card, today, onBack, onOpen, onAdd, onShare }: Props) {
  const data = useApp((s) => s.data); const months = allDates(data, card.subjectKey, today)
  return (<div className="sow-ad">
    <header className="sow-ad__head">
      <button className="sow-ib sow-bare" aria-label="Back to Overview" onClick={onBack}>{GLYPH.back}</button>
      <div className="sow-ad__titles"><h1 className="sow-ad__title">{card.label} · {card.subject} {card.kind}</h1><span className="sow-ad__sub">All dates · newest first</span></div>
      <button className="sow-ad__add" onClick={onAdd}>{GLYPH.plus} Add date</button>
      {card.open && <button className="sow-ib sow-bare" aria-label="Share" onClick={onShare}><Icon name="share" /></button>}
    </header>
    <div className="dl-card sow-ad__list">{months.map((m) => <section key={m.key} aria-label={m.title}>
      <h2 className="sow-ad__month">{m.title}</h2>
      {m.weeks.map((w) => <div key={w.start}><div className="sow-ad__week">{w.title}</div>
        {w.rows.map((d) => <button key={d.sessionId} className={`sow-ad__row ${d.when}${d.when === 'past' && d.left > 0 ? ' open' : ''}`} aria-label={said(d, card.total)} onClick={() => onOpen(d.sessionId)}>
          <i className="sow-ad__dot" aria-hidden /><span className="sow-ad__txt"><b>{dayLabel(d.date)}{d.when === 'today' && <span className="sow-ad__today">Today</span>}</b><small>{d.topic || 'No topic'}</small></span>
          <span className="sow-ad__n dl-num">{count(d, card.total)}</span><span className="sow-ad__go" aria-hidden>{GLYPH.next}</span></button>)}</div>)}
    </section>)}{!months.length && <p className="dl-muted">No dates yet.</p>}</div>
  </div>)
}
