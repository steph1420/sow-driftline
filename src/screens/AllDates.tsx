// v0.8 F-OV-04 (O2e-alldates): every date of one class + subject + type, newest first, by month and week, on a timeline.
// Today is blue, older dates with copies still to come in are amber, dates ahead are hollow. Tap a row to open it.
// beta.9 (t221u, 2C): every row has a share icon for that date. Moments: rows stagger in and the timeline draws down
// ("alldates"), rows glide to new places ("reflow").
import { useApp } from '../store/store'
import { allDates, type Card, type OvDate } from '../data/overview'
import { dateLabel, dayLabel } from '../data/model'
import { GLYPH, Icon } from '../ui/icons'
import { PageHead } from '../ui/PageHead'
import { motion } from 'framer-motion'
import { STAGGER } from '../config/motion'
import { useMoment } from '../ui/useMotionOn'
import { FloatIn } from '../ui/Life'

type Props = { card: Card; today: string; onBack: () => void; onOpen: (sessionId: string) => void; onAdd: () => void; onShare: (sessionId?: string) => void }
const count = (d: OvDate, total: number) => (d.when === 'future' ? '—' : d.left === 0 ? `${total} ${GLYPH.tick}` : `${d.done}/${total}`)
const said = (d: OvDate, total: number) => `${dateLabel(d.date)}${d.when === 'today' ? ', today' : ''}, ${d.when === 'future' ? 'still ahead' : `${d.done} of ${total} in`}`

export function AllDates({ card, today, onBack, onOpen, onAdd, onShare }: Props) {
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
          <button className={`sow-ad__row ${d.when}${d.when === 'past' && d.left > 0 ? ' open' : ''}`} aria-label={said(d, card.total)} onClick={() => onOpen(d.sessionId)}>
          <i className="sow-ad__dot" aria-hidden /><span className="sow-ad__txt"><b>{dayLabel(d.date)}{d.when === 'today' && <span className="sow-ad__today">Today</span>}</b><small>{d.topic || 'No topic'}</small></span>
          <span className="sow-ad__n dl-num">{count(d, card.total)}</span><span className="sow-ad__go" aria-hidden>{GLYPH.next}</span></button>
          <button className="sow-ib sow-bare sow-ad__share" aria-label={`Share ${dateLabel(d.date)}`} onClick={() => onShare(d.sessionId)}><Icon name="share" /></button></motion.div> })}</div>)}
    </section>)}{!months.length && <FloatIn>No dates yet.</FloatIn>}</div>
  </div>)
}
