import { useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../config'
import type { SheetState } from '../data/contract'
import { AzRail, firstRowFor } from './AzRail'
import { fmtDay, pickAnchor, toChecklist, toGo, visibleCols, type Layout } from '../data/model'
import { rankMatches } from '../data/quickSearch'
import { centreScrollTop } from './scroll'
import { gridMove, isTypingTarget } from './keyboard'
import { extendTarget, rollsBetween } from './paint'

type Side = 'right' | 'left'
import { DateSheet } from './DateSheet'
import { GLYPH, Icon } from '../ui/icons'
import { useApp, nowMs } from '../store/store'
import { isLate, pillVisible } from '../data/late'
import { cellKey } from '../sync/ops'
import { Hint } from './Hint'
const longDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')

type Props = { state: SheetState; classKey: string; today: string; layout: Layout; jump?: number
  onTick?: (sessionId: string, roll: number) => void; onTickMany?: (sessionId: string, rolls: number[], value: boolean) => void
  railSide?: Side; railBubble?: boolean; onRailSide?: (s: Side) => void; swipe?: boolean; dateCols?: number; focusSessionId?: string | null; subjectKey?: string | null; pendingOnly?: boolean; onPick?: (sessionId: string) => void; onHalf?: (half: 'done' | 'go') => void }
type Paint = { sid: string; start: number; value: boolean; y0: number; engaged: boolean; armed: boolean; rolls: number[] }
const d0 = (iso: string) => { const f = fmtDay(iso); return `${f.dow} ${f.dm}` }
export function Checklist({ state, classKey, today, layout, jump = 0, onTick, onTickMany, railSide = 'right', railBubble = true, onRailSide, swipe = true, dateCols, focusSessionId = null, subjectKey = null, pendingOnly = false, onPick, onHalf }: Props) {
  const c0 = useMemo(() => toChecklist(state, classKey, subjectKey), [state, classKey, subjectKey])
  const a0 = pickAnchor(c0.columns.map((x) => x.date), today)
  const fi = focusSessionId ? c0.columns.findIndex((x) => x.sessionId === focusSessionId) : -1 // v0.7j: opened from a class card
  const anchor = fi < 0 ? a0 : { index: fi, kind: (c0.columns[fi]!.date === today ? 'today' : c0.columns[fi]!.date > today ? 'upcoming' : 'last') as typeof a0.kind }
  const [end, setEnd] = useState(anchor.index)
  // S4b "Pending only": rows still to come in for the focused date. The set is fixed when switched on (or the date changes), so a row doesn't vanish mid-tap.
  const fsid = c0.columns[anchor.index]?.sessionId ?? ''
  const [keep, setKeep] = useState<Set<number> | null>(null)
  useEffect(() => { setKeep(pendingOnly && fsid ? new Set(c0.pupils.filter((p) => !c0.ticked(fsid, p.roll)).map((p) => p.roll)) : null) }, [pendingOnly, fsid, classKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const c = useMemo(() => (keep ? { ...c0, pupils: c0.pupils.filter((p) => keep.has(p.roll)) } : c0), [c0, keep])
  const [sel, setSel] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [dates, setDates] = useState(false)
  const marks = useApp((s) => s.marks); const markMode = useApp((s) => s.markMode); const lateToast = useApp((s) => s.lateToast)
  const [late, setLate] = useState(false); const lx = useRef<number | null>(null)
  useEffect(() => { if (lateToast) setLate(true) }, [lateToast])
  useEffect(() => { if (!late) return; const t = setTimeout(() => setLate(false), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [late, lateToast])
  const [pill, setPill] = useState<string | null>(null)
  const [painted, setPainted] = useState<{ sid: string; rolls: number[]; value: boolean } | null>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const paint = useRef<Paint | null>(null); const eatClick = useRef(false)
  const names = c.pupils.map((p) => p.name)
  useEffect(() => { setEnd(anchor.index) }, [anchor.index, classKey, jump])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(0), CONFIG.timing.jumpFlashMs); return () => clearTimeout(t) }, [flash])
  // Quick search: "/" anywhere; on desktop any letter/digit typed anywhere opens the pill with it.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.shiftKey && e.key === 'O') || pill != null || isTypingTarget(e.target as Element)) return
      if (e.key === '/') { e.preventDefault(); setPill('') }
      else if (layout === 'desktop' && /^[a-z0-9]$/i.test(e.key)) { e.preventDefault(); setPill(e.key); find(e.key) }
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  })
  if (!c.columns.length) return (
    <div className="dl-card sow-empty"><div className="sow-ico" aria-hidden>＋</div><h2 className="dl-title2">No dates yet</h2>
      <p className="dl-muted">This class has no dates on the sheet yet. Ticks appear here.</p></div>)
  const cols = visibleCols(c.columns.length, end, layout, dateCols)
  const wide = cols.length > CONFIG.layout.desktopCalmDateCols
  const weekStart = (i: number) => { if (!wide || i === cols[0]) return false; const a = new Date(c.columns[i]!.date + 'T00:00:00'), b = new Date(c.columns[i - 1]!.date + 'T00:00:00'); return a.getDay() < b.getDay() || (+a - +b) / 864e5 >= 7 }
  const focus = c.columns[anchor.index]!
  const old = focus.date < today; const one = cols.length === 1
  /** Jump: centre the name in the list viewport (near the top it stays where it lands) and highlight it. */
  function go(i: number) {
    if (i < 0) return; setSel(i); setFlash((x) => x + 1)
    const el = rows.current[i]; if (!el) return
    const r = el.getBoundingClientRect(); const head = el.closest('table')?.querySelector('thead')?.getBoundingClientRect().height ?? 0
    const top = centreScrollTop({ rowPageTop: r.top + (window.scrollY || 0), rowH: r.height, viewTop: CONFIG.layout.headerHeightPx + head, viewBottom: window.innerHeight - CONFIG.layout.dockReservePx })
    window.scrollTo?.({ top, behavior: 'auto' })
  }
  function find(q: string) {
    if (/^[a-z]$/i.test(q)) return go(firstRowFor(q.toUpperCase(), names)) // single letter = A–Z jump
    const m = rankMatches(q, c.pupils.map((p) => ({ roll: p.roll, name: p.name })))[0]
    if (m) go(c.pupils.findIndex((p) => p.roll === m.roll))
  }
  const dup = new Set(names.filter((n, i) => names.indexOf(n) !== i)) // Q-DUP-1: roll tells twins apart
  const left = toGo(c0, focus.sessionId); const done = c0.pupils.length - left
  const f = fmtDay(focus.date)
  const order = c.pupils.map((p) => p.roll)
  const rects = () => c.pupils.map((p, i) => { const b = rows.current[i]!.getBoundingClientRect(); return { roll: p.roll, top: b.top, bottom: b.bottom } })
  const down = (e: React.PointerEvent, sid: string, roll: number, on: boolean) => {
    if (!swipe || !onTickMany) return
    paint.current = { sid, start: roll, value: !on, y0: e.clientY, engaged: false, armed: false, rolls: [roll] }
  }
  const move = (e: React.PointerEvent) => {
    const p = paint.current; if (!p) return
    if (!p.engaged) { if (Math.abs(e.clientY - p.y0) < CONFIG.timing.swipeEngagePx) return; p.engaged = true; (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) }
    const t = extendTarget(e.clientY, rects(), p.start, p.armed, CONFIG.timing.swipeExtendPx, CONFIG.timing.swipeExtendFrac); p.armed = t.armed
    if (t.roll != null) { p.rolls = rollsBetween(order, p.start, t.roll); setPainted({ sid: p.sid, rolls: p.rolls, value: p.value }) }
  }
  const up = () => {
    const p = paint.current; paint.current = null; setPainted(null)
    if (p?.engaged && p.rolls.length > 1) { eatClick.current = true; setTimeout(() => { eatClick.current = false }, 0); onTickMany!(p.sid, p.rolls, p.value) } // inside one box = still a tap
  }
  const keyGrid = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement; if (t.dataset.r == null) return
    const m = gridMove(e.key, +t.dataset.r, +t.dataset.c!, c.pupils.length, cols.length); if (!m) return
    e.preventDefault(); (e.currentTarget.querySelector(`button[data-r="${m[0]}"][data-c="${m[1]}"]`) as HTMLElement | null)?.focus()
  }
  return (
    <>
      {/* v0.7.0 S6 (F-CL-02/03): subject heading, "HW · Wednesday 4 November", calendar button; amber for past dates (F-DT-07) */}
      <div className={`sow-clhead${old ? ' old' : ''}`}>
        <div className="sow-clhead__txt"><h2 className="sow-clhead__title">{c.subject || 'Checklist'}</h2>
          <div className="sow-clhead__sub">{[focus.kind, longDate(focus.date)].filter(Boolean).join(' · ')}{old && <span className="sow-oldtag">Past date</span>}</div></div>
        <button className="sow-cal" aria-label="Pick a date" aria-expanded={dates} onClick={() => setDates(true)}><Icon name="calendar" /></button>
      </div>
      <div className={`sow-split sow-split--cl${old ? ' old' : ''}`}>
        <button className="sow-half" aria-label={`${done} done`} onClick={() => onHalf?.('done')}><b className="dl-num">{done}</b><span>Done <i aria-hidden>{GLYPH.down}</i></span></button>
        <button className="sow-half" aria-label={`${left} to go`} onClick={() => onHalf?.('go')}><b className="dl-num">{left}</b><span>To go <i aria-hidden>{GLYPH.down}</i></span></button>
      </div>
      <button className="sow-search" aria-label="Search names" onClick={() => setPill('')}><span aria-hidden>{GLYPH.search}</span><span>Find a name</span>{layout === 'desktop' && <kbd className="sow-kbd">just type</kbd>}</button>
      <div className={`sow-grid ${layout}${swipe && onTickMany ? ' swipe' : ''}${one ? ' one' : ''}`}>
        <table onKeyDown={keyGrid}>
          <thead><tr><th className="n">{one ? <span className="sow-yc">{keep ? 'Still to come in' : 'Your class'}</span> : null}{keep ? `${c.pupils.length} pending` : `${c.pupils.length} pupils`}</th>
            {cols.map((i) => { const s = c.columns[i]!; const d = fmtDay(s.date); return <th key={s.sessionId} className={`${i === anchor.index ? 'today' : ''}${weekStart(i) ? ' wk' : ''}`}>{one ? <span className="sow-sr">{d.dow} {d.dm}</span> : <>{s.kind ? `${s.kind} · ` : ''}{d.dow}<b>{d.dm}</b></>}</th> })}</tr></thead>
          <tbody>{c.pupils.map((p, r) => (
            <tr key={p.roll} ref={(el) => { rows.current[r] = el }} className={`${sel === r ? 'sel' : ''}${sel === r && flash ? ' flash' : ''}`}>
              <td className="n" onClick={() => { setSel(r); setToast(dup.has(p.name) ? `${p.name} · roll ${p.roll}` : p.name) }}>{p.name}{dup.has(p.name) && <small className="sow-roll">#{p.roll}</small>}</td>
              {cols.map((i, ci) => { const s = c.columns[i]!; const fut = s.date > today; const real = c.ticked(s.sessionId, p.roll)
                const pv = painted && painted.sid === s.sessionId && painted.rolls.includes(p.roll); const on = pv ? painted!.value : real
                const mk = real ? marks[cellKey({ sessionId: s.sessionId, roll: p.roll })] : undefined; const lt = !!mk && isLate(mk.at, s.date, !!mk.back) === true
                return <td key={s.sessionId} className={`${i === anchor.index ? 'today' : ''}${weekStart(i) ? ' wk' : ''}`}>{onTick ? <button className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}${pv ? ' paint' : ''}${lt && on ? ' late' : ''}`} data-r={r} data-c={ci} aria-pressed={real} aria-label={`${p.name}${dup.has(p.name) ? ` roll ${p.roll}` : ''}, ${d0(s.date)}, ${real ? (lt ? 'done, late' : 'done') : 'not yet'}`}
                    onPointerDown={(e) => down(e, s.sessionId, p.roll, real)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { paint.current = null; setPainted(null) }}
                    onClick={() => { if (eatClick.current) { eatClick.current = false; return } onTick(s.sessionId, p.roll) }}>{on ? GLYPH.tick : ''}</button>
                  : <span className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}`} aria-label={on ? 'Done' : 'Not yet'}>{on ? GLYPH.tick : ''}</span>}</td> })}
            </tr>))}</tbody>
        </table>
      </div>
      <AzRail names={names} onJump={go} side={railSide} bubble={railBubble} onSide={onRailSide} />
      {pill != null && <div className="sow-qs" role="search">
        <span aria-hidden>{GLYPH.search}</span>
        <input type="search" autoFocus aria-label="Find a name" value={pill} placeholder="Type a name, initials or roll"
          onChange={(e) => { setPill(e.target.value); if (e.target.value.trim()) find(e.target.value.trim()) }}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); setPill(null) } }} onBlur={() => setPill(null)} />
      </div>}
      {dates && <DateSheet columns={c0.columns} current={focus.sessionId} today={today} onPick={(sid) => onPick?.(sid)} onClose={() => setDates(false)} subjectKey={subjectKey ?? ''} kind={focus.kind} ticks={done} onDone={setToast} />}
      {/* v0.7.0 S9 (F-LT-02): mode pill, only once this date's due time has passed */}
      {onTick && pillVisible(focus.date, nowMs()) && <button className={`sow-mode ${markMode}`} aria-pressed={markMode === 'back'} aria-label={markMode === 'late' ? 'Marking late submissions, tap for back-date' : 'Marking on back-date, tap for late submissions'}
        onClick={() => useApp.getState().setMarkMode(markMode === 'late' ? 'back' : 'late')}><i aria-hidden>{GLYPH.clock}</i><span>{markMode === 'late' ? 'Marking late submissions' : 'Marking on back-date'}</span><span className="sow-mode__sw" aria-hidden /></button>}
      {late && <div className="dl-toast-region sow-late-region"><div className="dl-toast sow-late" role="status" aria-label="Late Submission" onPointerDown={(e) => { lx.current = e.clientX }} onPointerMove={(e) => { if (lx.current != null && Math.abs(e.clientX - lx.current) > CONFIG.timing.swipeExtendPx) { lx.current = null; setLate(false) } }} onPointerUp={() => { lx.current = null }}>
        <i aria-hidden>{GLYPH.clock}</i><span><b>Late Submission</b><small>Marked after {new Date(focus.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')} · swipe to dismiss</small></span></div></div>}
      {onTick && !dates && <Hint ids={['swipe', 'grip', 'quick']} />}
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--accent" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
    </>
  )
}
