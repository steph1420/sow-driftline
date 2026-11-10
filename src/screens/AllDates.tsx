// v0.8 F-OV-04 (O2e-alldates): every date of one class + subject + type, newest first, by month and week, on a timeline.
// Today is blue, older dates with copies still to come in are amber, dates ahead are hollow. Tap a row to open it.
// beta.9 (t221u, 2C): every row has a share icon for that date. Moments: rows stagger in and the timeline draws down
// ("alldates"), rows glide to new places ("reflow").
// beta.12 (t240u): the row share icon is gone; press and hold a row for the same date menu as an Overview date pill
// (Share, Open, Reschedule). A tap still opens the date.
import { useApp } from '../store/store'
import { allDates, type Card, type OvDate } from '../data/overview'
import { dateLabel, dayLabel } from '../data/model'
import { GLYPH, Icon } from '../ui/icons'
import { PageHead } from '../ui/PageHead'
import { motion } from 'framer-motion'
import { STAGGER } from '../config/motion'
import { useMoment } from '../ui/useMotionOn'
import { FloatIn } from '../ui/Life'
import { useHold } from '../ui/useHold'

type Props = { card: Card; today: string; onBack: () => void; onOpen: (sessionId: string) => void; onAdd: () => void; onShare: (sessionId?: string) => void
  onHold?: (d: OvDate, el: HTMLElement) => void; held?: string | null }
const count = (d: OvDate, total: number) => (d.when === 'future' ? '—' : d.left === 0 ? `${total} ${GLYPH.tick}` : `${d.done}/${total}`)
const said = (d: OvDate, total: number) => `${dateLabel(d.date)}${d.when === 'today' ? ', today' : ''}, ${d.when === 'future' ? 'still ahead' : `${d.done} of ${total} in`}`

export function AllDates({ card, today, onBack, onOpen, onAdd, onShare, onHold, held = null }: Props) {
  const data = useApp((s) => s.data); const months = allDates(data, card.subjectKey, today); const st = useMoment('alldates'); const reflow = useMoment('reflow'); let n = 0
  return (<div className="sow-ad">
    <PageHead title={`${card.label} · ${card.subject} ${card.kind}`} sub="All dates · newest first" backLabel="Back to Overview" onBack={onBack}>
      <button className="sow-page__action" onClick={onAdd}>{GLYPH.plus} Add date</button>
      {card.open && <button className="sow-ib sow-bare" aria-label="Share" onClick={() => onShare()}><Icon name="share" /></button>}
    </PageHead>
    <div className="dl-card sow-ad__list">{months.map((m) => <section key={m.key} aria-label={m.title}>
      <h2 className="sow-ad__month">{m.title}</h2>
      {m.weeks.map((w) => <div key={w.start}><div className="sow-ad__week">{w.title}</div>
        {w.rows.map((d) => { const i = n++; return <motion.div key={d.sessionId} className="sow-ad__item" style={{ '--i': Math.min(i, STAGGER.rowsMax) } as React.CSSProperties} layout={reflow.on ? 'position' : false}
          initial={st.on && i < STAGGER.rowsMax ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ ...st.spring('settle', i * STAGGER.rows), layout: reflow.spring('settle') }}>
          <Row d={d} total={card.total} held={held === d.sessionId} onOpen={() => onOpen(d.sessionId)} onHold={onHold && ((el) => onHold(d, el))} /></motion.div> })}</div>)}
    </section>)}{!months.length && <FloatIn>No dates yet.</FloatIn>}</div>
  </div>)
}

type RowProps = { d: OvDate; total: number; held: boolean; onOpen: () => void; onHold?: (el: HTMLElement) => void }
/** One date row: tap opens it, press and hold (or right-click) opens its date menu. */
function Row({ d, total, held, onOpen, onHold }: RowProps) {
  const hold = useHold((el) => onHold?.(el))
  return <button className={`sow-ad__row ${d.when}${d.when === 'past' && d.left > 0 ? ' open' : ''}${held ? ' held' : ''}`} aria-label={said(d, total)} {...(onHold ? hold : {})} onClick={onOpen}>
    <i className="sow-ad__dot" aria-hidden /><span className="sow-ad__txt"><b>{dayLabel(d.date)}{d.when === 'today' && <span className="sow-ad__today">Today</span>}</b><small>{d.topic || 'No topic'}</small></span>
    <span className="sow-ad__n dl-num">{count(d, total)}</span><span className="sow-ad__go" aria-hidden>{GLYPH.next}</span></button>
}
