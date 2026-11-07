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
type Props = { state: SheetState; classKey: string; today: string; layout: Layout; jump?: number
  onTick?: (sessionId: string, roll: number) => void; onTickMany?: (sessionId: string, rolls: number[], value: boolean) => void
  railSide?: Side; railBubble?: boolean; onRailSide?: (s: Side) => void; swipe?: boolean; dateCols?: number; focusSessionId?: string | null }
type Paint = { sid: string; start: number; value: boolean; y0: number; engaged: boolean; armed: boolean; rolls: number[] }
const d0 = (iso: string) => { const f = fmtDay(iso); return `${f.dow} ${f.dm}` }
export function Checklist({ state, classKey, today, layout, jump = 0, onTick, onTickMany, railSide = 'right', railBubble = true, onRailSide, swipe = true, dateCols, focusSessionId = null }: Props) {
  const c = useMemo(() => toChecklist(state, classKey), [state, classKey])
  const a0 = pickAnchor(c.columns.map((x) => x.date), today)
  const fi = focusSessionId ? c.columns.findIndex((x) => x.sessionId === focusSessionId) : -1 // v0.7j: opened from a class card
  const anchor = fi < 0 ? a0 : { index: fi, kind: (c.columns[fi]!.date === today ? 'today' : c.columns[fi]!.date > today ? 'upcoming' : 'last') as typeof a0.kind }
  const [end, setEnd] = useState(anchor.index)
  const [sel, setSel] = useState<number | null>(null)
  const [flash, setFlash] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
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
  const left = toGo(c, focus.sessionId); const done = c.pupils.length - left
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
      <div className="dl-card">
        <div className="sow-glance">
          <div><div className="dl-eyebrow">{[c.subject, focus.kind, `${f.dow} ${f.dm}`].filter(Boolean).join(' · ')}</div>
            <div className="dl-headline">{anchor.kind === 'today' ? <><span className="dl-num">{done}</span> of {c.pupils.length} done</> : anchor.kind === 'upcoming' ? `Next up ${f.dow} ${f.dm}` : `Last was ${f.dow} ${f.dm}`}</div></div>
          <span className="sow-sp" />
          {left > 0 ? <span className="dl-chip dl-tone--accent">{left} to go</span> : <span className="dl-chip dl-tone--positive">All done</span>}
        </div>
        <div className="sow-prog"><i style={{ width: `${c.pupils.length ? (done / c.pupils.length) * 100 : 0}%` }} /></div>
      </div>
      <button className="sow-search" aria-label="Search names" onClick={() => setPill('')}><span aria-hidden>⌕</span><span>Find a name</span>{layout === 'desktop' && <kbd className="sow-kbd">just type</kbd>}</button>
      <div className={`sow-grid ${layout}${swipe && onTickMany ? ' swipe' : ''}`}>
        {cols[0]! > 0 && <button className="sow-more" onClick={() => setEnd(Math.max(cols.length - 1, end - 1))}>← {cols[0]} earlier date{cols[0] === 1 ? '' : 's'}</button>}
        <table onKeyDown={keyGrid}>
          <thead><tr><th className="n">{c.pupils.length} pupils</th>
            {cols.map((i) => { const s = c.columns[i]!; const d = fmtDay(s.date); return <th key={s.sessionId} className={`${i === anchor.index ? 'today' : ''}${weekStart(i) ? ' wk' : ''}`}>{s.kind ? `${s.kind} · ` : ''}{d.dow}<b>{d.dm}</b></th> })}</tr></thead>
          <tbody>{c.pupils.map((p, r) => (
            <tr key={p.roll} ref={(el) => { rows.current[r] = el }} className={`${sel === r ? 'sel' : ''}${sel === r && flash ? ' flash' : ''}`}>
              <td className="n" onClick={() => { setSel(r); setToast(dup.has(p.name) ? `${p.name} · roll ${p.roll}` : p.name) }}>{p.name}{dup.has(p.name) && <small className="sow-roll">#{p.roll}</small>}</td>
              {cols.map((i, ci) => { const s = c.columns[i]!; const fut = s.date > today; const real = c.ticked(s.sessionId, p.roll)
                const pv = painted && painted.sid === s.sessionId && painted.rolls.includes(p.roll); const on = pv ? painted!.value : real
                return <td key={s.sessionId} className={`${i === anchor.index ? 'today' : ''}${weekStart(i) ? ' wk' : ''}`}>{onTick ? <button className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}${pv ? ' paint' : ''}`} data-r={r} data-c={ci} aria-pressed={real} aria-label={`${p.name}${dup.has(p.name) ? ` roll ${p.roll}` : ''}, ${d0(s.date)}, ${real ? 'done' : 'not yet'}`}
                    onPointerDown={(e) => down(e, s.sessionId, p.roll, real)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { paint.current = null; setPainted(null) }}
                    onClick={() => { if (eatClick.current) { eatClick.current = false; return } onTick(s.sessionId, p.roll) }}>{on ? '✓' : ''}</button>
                  : <span className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}`} aria-label={on ? 'Done' : 'Not yet'}>{on ? '✓' : ''}</span>}</td> })}
            </tr>))}</tbody>
        </table>
        {end < c.columns.length - 1 && <button className="sow-more" onClick={() => setEnd(end + 1)}>later date →</button>}
      </div>
      <AzRail names={names} onJump={go} side={railSide} bubble={railBubble} onSide={onRailSide} />
      {pill != null && <div className="sow-qs" role="search">
        <span aria-hidden>⌕</span>
        <input type="search" autoFocus aria-label="Find a name" value={pill} placeholder="Type a name, initials or roll"
          onChange={(e) => { setPill(e.target.value); if (e.target.value.trim()) find(e.target.value.trim()) }}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); setPill(null) } }} onBlur={() => setPill(null)} />
      </div>}
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--accent" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
    </>
  )
}
