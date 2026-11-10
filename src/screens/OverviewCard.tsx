// v0.8 F-OV-01/02/05/06 (O2g): one class + subject + type. Big done/total for today (a dash when the date is still ahead),
// topic, today and this week's dates (first one current), ＋ and All ›. Press and hold for the card menu.
// beta.9 (t221u): press and hold one date for that date's menu (2A). Moments: cards settle in a stagger ("cards"), glide
// to new places ("reflow"), the done count rolls ("count"), the underline slides to a tapped date before the Checklist
// opens ("underline", 3b), and the overdue dot breathes until the card is opened ("dot", CSS).
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Card, OvDate } from '../data/overview'
import { dateLabel, dayLabel } from '../data/model'
import { BEAT, SHIFT, STAGGER } from '../config/motion'
import { GLYPH } from '../ui/icons'
import { useHold } from '../ui/useHold'
import { useMoment } from '../ui/useMotionOn'
import { RollNumber } from '../ui/RollNumber'

type Props = { card: Card; index?: number; viewOnly?: boolean; held: boolean; heldDate?: string | null; onOpen: (sessionId: string) => void; onAdd: () => void; onAll: () => void
  onHold: (el: HTMLElement) => void; onDateHold?: (d: OvDate, el: HTMLElement) => void }
export const cardName = (c: Card) => `${c.label} ${c.subject} ${c.kind}`
/** Cards whose overdue dot has been seen (opened) this visit: the dot stops breathing. */
const calmDots = new Set<string>()

type DateProps = { d: OvDate; on: boolean; to: boolean; held: boolean; onTap: (el: HTMLElement) => void; onHold?: (el: HTMLElement) => void }
/** One date of the strip. Its own hold stops the card's hold from starting underneath it. */
function DateBtn({ d, on, to, held, onTap, onHold }: DateProps) {
  const hold = useHold((el) => onHold?.(el))
  const stop = (f: (e: never) => void) => (e: React.SyntheticEvent<HTMLElement>) => { if (!onHold) return; e.stopPropagation(); (f as (x: typeof e) => void)(e) }
  return <button className={`${on ? 'on' : ''}${to ? ' to' : ''}${held ? ' held' : ''}`.trim()} aria-current={on ? 'date' : undefined} aria-label={`Open ${dateLabel(d.date)}`}
    onPointerDown={stop(hold.onPointerDown)} onPointerMove={stop(hold.onPointerMove)} onPointerUp={stop(hold.onPointerUp)} onPointerCancel={stop(hold.onPointerCancel)}
    onContextMenu={stop(hold.onContextMenu)} onClickCapture={hold.onClickCapture} onClick={(e) => onTap(e.currentTarget)}>{d.when === 'past' ? dateLabel(d.date) : dayLabel(d.date)}</button>
}

export function OverviewCard({ card: c, index = 0, viewOnly = false, held, heldDate = null, onOpen, onAdd, onAll, onHold, onDateHold }: Props) {
  const hold = useHold(onHold); const first = c.dates[0]; const name = cardName(c)
  const settle = useMoment('cards'); const reflow = useMoment('reflow'); const ul = useMoment('underline')
  const strip = useRef<HTMLDivElement>(null); const [slide, setSlide] = useState<{ from: number; to: number; sid: string } | null>(null)
  const topic = !first ? 'No dates ahead' : first.when === 'future' ? `Next: ${first.topic || 'no topic yet'}` : first.topic || 'No topic yet'
  const open = (sid: string) => { calmDots.add(c.subjectKey); onOpen(sid) }
  const tapDate = (i: number, sid: string, el: HTMLElement) => {
    const box = strip.current?.getBoundingClientRect(); const cur = strip.current?.querySelector<HTMLElement>('button.on')
    if (i === 0 || !ul.on || !box || !cur || slide) return open(sid)
    const mid = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2 - box.left }
    setSlide({ from: mid(cur), to: mid(el), sid }); setTimeout(() => open(sid), ul.secs(BEAT.underline) * 1000)
  }
  return (
    <motion.div className="sow-ocw" layout={reflow.on ? 'position' : false} initial={settle.on ? { opacity: 0, y: SHIFT.card } : false} animate={{ opacity: 1, y: 0 }}
      transition={{ ...settle.spring('settle', STAGGER.cardsDelay + index * STAGGER.cards), layout: reflow.spring('settle') }}>
    <div className={`dl-card sow-oc${held ? ' held' : ''}${viewOnly ? ' sow-oc--past' : ''}`} {...hold}>
      <button className="sow-oc__main" aria-label={`Open ${name} on Checklist`} disabled={!c.open} onClick={() => c.open && open(c.open)}>
        <span className="sow-oc__head"><b className="sow-oc__title">{c.label} · {c.subject} {c.kind}</b>
          {c.pastOpen && <i className={`sow-oc__dot${calmDots.has(c.subjectKey) ? ' calm' : ''}`} role="img" aria-label="An older date still has copies to come in" />}</span>
        <b className="sow-oc__n dl-num">{first && first.when !== 'future' ? <><RollNumber value={first.done} /><small>/{c.total}</small></> : '—'}</b>
        <span className="sow-oc__topic">{topic}</span>
      </button>
      <div ref={strip} className={`sow-oc__dates${slide ? ' sliding' : ''}`}>
        {c.dates.map((d, i) => <DateBtn key={d.sessionId} d={d} on={i === 0} to={slide?.sid === d.sessionId} held={heldDate === d.sessionId}
          onTap={(el) => tapDate(i, d.sessionId, el)} onHold={onDateHold && ((el) => onDateHold(d, el))} />)}
        {!viewOnly && <button className="sow-oc__add" aria-label={`Add date, ${name}`} onClick={onAdd}>{GLYPH.plus}</button>}
        <span className="sow-sp" />
        <button className="sow-oc__all" aria-label={`All dates, ${name}`} onClick={onAll}>All {GLYPH.next}</button>
        {slide && <motion.i className="sow-oc__ul" aria-hidden style={{ left: slide.from }} initial={{ x: 0, scaleX: 1 }} animate={{ x: slide.to - slide.from, scaleX: [1, 2.4, 1] }}
          transition={{ x: ul.spring('snappy'), scaleX: ul.tween(BEAT.underline, { times: [0, 0.45, 1], ease: 'easeOut' }) }} />}
      </div>
    </div></motion.div>)
}
