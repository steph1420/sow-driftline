// v0.9.0-beta.3 (t150u, dev-only): the five Quick overview day-card styles. One shared model (data/qoCard.ts) and
// shared parts (count, "+N since", the 3-state window switcher, share); each style only arranges them.
import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import { animate, motion, useAnimate, useMotionValue } from 'framer-motion'
import { DUR, EASE, SHIFT, SPRING, STAGGER } from '../../config/motion'
import { useMotionOn } from '../../ui/useMotionOn'
import { RollNumber } from '../../ui/RollNumber'
import { SINCE_MODES, SINCE_NAME, nextSince, type SinceMode } from '../../data/since'
import type { QoCard, QoStyle } from '../../data/qoCard'
import { Icon } from '../../ui/icons'

export type CardProps = { card: QoCard; mode: SinceMode; words: string; onNext: () => void; onShare: () => void; index?: number; pulse?: number }
type Sw = 'pager' | 'top' | 'bar' | 'arc' | 'edge'

const Count = ({ card, className = '' }: { card: QoCard; className?: string }) => <b className={`sow-qc__n dl-num ${className}`.trim()}><RollNumber value={card.done} /><small>/{card.total}</small></b>
const Pill = ({ card }: { card: QoCard }) => <span className="sow-qc__pill">{card.day}</span>
const Since = ({ card, words, mode, onNext }: CardProps) =>
  <button className="sow-qc__since" aria-label={`+${card.since} ${words}, tap for ${SINCE_NAME[nextSince(mode)]}`} onClick={onNext}><span><b>+<RollNumber value={card.since} /></b> {words}</span></button>
const Share = ({ card, onShare }: CardProps) => <button className="sow-qc__share" aria-label={`Share ${card.label}`} onClick={onShare}><Icon name="share" /></button>
/** The window switcher (since open · this hour · today), drawn per style; a tap moves to the next window. */
const Switch = ({ kind, mode, onNext }: { kind: Sw; mode: SinceMode; onNext: () => void }) => {
  const at = SINCE_MODES.indexOf(mode)
  return <button className={`sow-qc__sw sow-qc__sw--${kind} on-${at}`} aria-label={`Window: ${SINCE_NAME[mode]} (${at + 1} of ${SINCE_MODES.length}), tap for ${SINCE_NAME[nextSince(mode)]}`} onClick={onNext}>
    {kind !== 'arc' && SINCE_MODES.map((m) => <i key={m} className={m === mode ? 'on' : undefined} />)}</button>
}

/** D4 Edge pager: pill and share on top, the count, "+N since"; the switcher is a vertical pager on the right edge. */
function EdgePager(p: CardProps) {
  return <><Pill card={p.card} /><Share {...p} /><Count card={p.card} /><Since {...p} /><Switch kind="pager" mode={p.mode} onNext={p.onNext} /></>
}
/** E1 Tide: the card fills to the share done; the switcher is lit on the top edge. */
function Tide(p: CardProps) {
  return <><TideFill pct={p.card.pct} delay={STAGGER.cardsDelay + (p.index ?? 0) * STAGGER.cards} />{p.pulse ? <Glint key={p.pulse} /> : null}<Switch kind="top" mode={p.mode} onNext={p.onNext} /><Pill card={p.card} /><Share {...p} /><Count card={p.card} /><Since {...p} /></>
}
/** E2 Roll grid: one cell per pupil (filled = in, bright = new in this window); a segmented switcher. */
function RollGrid(p: CardProps) {
  return <><div className="sow-qc__hd"><span className="sow-qc__day">{p.card.day}</span><Count card={p.card} /></div>
    <div className="sow-qc__grid" role="img" aria-label={`${p.card.done} of ${p.card.total} in, ${p.card.since} new`}>{p.card.roll.map((r) =>
      <i key={r.roll} className={r.fresh ? 'on new' : r.done ? 'on' : undefined} title={`${r.roll}`} />)}</div>
    <Since {...p} /><Share {...p} /><Switch kind="bar" mode={p.mode} onNext={p.onNext} /></>
}
/** E3 Ghost numeral: a big fading count, the date down the left edge, share at its foot, an arc switcher in the corner. */
function GhostNumeral(p: CardProps) {
  return <><div className="sow-qc__vdate" aria-hidden><span>{p.card.day}</span></div>
    <div className="sow-qc__ghost"><b className="dl-num" aria-label={`${p.card.done} of ${p.card.total}`}>{p.card.done}</b><small>/{p.card.total}</small></div>
    <Since {...p} /><Share {...p} /><Switch kind="arc" mode={p.mode} onNext={p.onNext} /></>
}
/** E4 Recent days: mini bars for the last dates of this subject (this one lit); the switcher glows on the bottom edge. */
function RecentDays(p: CardProps) {
  return <><Pill card={p.card} /><Count card={p.card} />
    <div className="sow-qc__bars" role="img" aria-label={p.card.recent.map((d) => `${d.day} ${d.done}/${d.total}`).join(', ')}>{p.card.recent.map((d) =>
      <i key={d.sessionId} className={d.current ? 'on' : undefined} style={{ '--h': d.total ? Math.round((d.done / d.total) * 100) : 0 } as CSSProperties} />)}</div>
    <Since {...p} /><Share {...p} /><Switch kind="edge" mode={p.mode} onNext={p.onNext} /></>
}

/** anim/proto: the E1 fill rises from the bottom on a slow liquid spring (scaleY, transform only) when the card
 * arrives, and again from its old level whenever the share done changes. At rest it is the static fill. */
function TideFill({ pct, delay }: { pct: number; delay: number }) {
  const on = useMotionOn(); const s = useMotionValue(on ? 0 : 1); const prev = useRef<number | null>(null)
  useEffect(() => {
    if (!on) { s.jump(1); prev.current = pct; return }
    const first = prev.current == null; const from = first ? 0 : pct ? Math.min(2, prev.current! / pct) : 1; prev.current = pct
    if (from === 1) return
    s.jump(from); const a = animate(s, 1, { ...SPRING.tide, delay: first ? delay : 0 }); return () => a.stop()
  }, [pct, on]) // eslint-disable-line react-hooks/exhaustive-deps
  return on ? <motion.i className="sow-qc__tide" aria-hidden style={{ scaleY: s, originY: 1 }} /> : <i className="sow-qc__tide" aria-hidden />
}
/** anim/proto: one soft light sweep across an E1 card when new ticks land (mounted per pulse, gone when done). */
function Glint() {
  const [done, setDone] = useState(false); if (done) return null
  return <motion.i className="sow-qc__glint" aria-hidden initial={{ x: '-100%', opacity: 0 }} animate={{ x: '100%', opacity: [0, 1, 0] }} transition={{ duration: DUR.glint, ease: EASE.out }} onAnimationComplete={() => setDone(true)} />
}

const BODY: Record<QoStyle, (p: CardProps) => JSX.Element> = { d4: EdgePager, e1: Tide, e2: RollGrid, e3: GhostNumeral, e4: RecentDays }

export function QoCardView({ style, ...p }: CardProps & { style: QoStyle }) {
  const Body = BODY[style]; const on = useMotionOn(); const [scope, run] = useAnimate<HTMLDivElement>(); const [pulse, setPulse] = useState(0); const last = useRef(p.card.done)
  // anim/proto "alive": when new ticks land on this date the card takes one breath (and E1 glints)
  useEffect(() => { const grew = p.card.done > last.current; last.current = p.card.done; if (!grew || !on || !scope.current) return
    setPulse((n) => n + 1); void run(scope.current, { scale: [1, 1.025, 1] }, { duration: DUR.breath, ease: 'easeInOut' }) }, [p.card.done]) // eslint-disable-line react-hooks/exhaustive-deps
  const cls = `sow-qc sow-qc--${style}${p.card.past ? ' old' : ''}${p.card.sel ? ' sel' : ''}`; const css = { '--p': p.card.pct } as CSSProperties
  if (!on) return <div className={cls} style={css}><Body {...p} /></div>
  return <motion.div ref={scope} className={cls} style={css} initial={{ opacity: 0, y: SHIFT.card, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ ...SPRING.settle, delay: STAGGER.cardsDelay + (p.index ?? 0) * STAGGER.cards }}><Body {...p} pulse={pulse} /></motion.div>
}
