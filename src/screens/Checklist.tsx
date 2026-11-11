import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../config'
import type { SheetState } from '../data/contract'
import { AzRail, firstRowFor, letterOf } from './AzRail'
import { fmtDay, focusColumn, toChecklist, toGo, visibleCols, type Layout } from '../data/model'
import { rankMatches } from '../data/quickSearch'
import { centreScrollTop } from './scroll'
import { gridMove, isTypingTarget } from './keyboard'
import { DateSheet } from './DateSheet'
import { TableHead, type HeadCol } from './TableHead'
import { GLYPH, Icon } from '../ui/icons'
import { useApp, nowMs } from '../store/store'
import { isLate, pillVisible } from '../data/late'
import { cellKey } from '../sync/ops'
import { Hint } from './Hint'
import { AnimatePresence, motion } from 'framer-motion'
import { DUR, SHIFT, STAGGER } from '../config/motion'
import { useAnimScale, useMoment, useMotion } from '../ui/useMotionOn'
import { useBackLayer } from '../ui/useBackLayer'
import { flashClass, flashMs, type Flash } from './flash'
import { UndoToast, type ToastMsg } from '../ui/UndoToast'
import { Burst } from '../ui/Life'
import { ARROW, isDefaultSort, sortDir, sortName, sortPupils } from '../data/sortNames'
import { SortMenu } from './SortMenu'

/** anim/proto: the check mark pops in on a tick (overshoot spring) and a ring bursts from the box; a clear shrinks it out. */
function TickMark({ fx }: { fx: boolean }) {
  const mk = useMoment('ticks') // beta.9: its own switch in Motion details
  return <>{fx && <motion.i className="sow-t__ring" aria-hidden initial={{ scale: 0.7, opacity: 0.9 }} animate={{ scale: 1.45, opacity: 0 }} transition={mk.tween(DUR.ring, { ease: 'easeOut' })} />}
    <motion.span className="sow-t__mark" initial={{ scale: 0.3, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0, transition: mk.tween(DUR.fade) }} transition={mk.spring('pop')}><Icon name="check" /></motion.span></>
}
/** anim/proto: row entrance. The first rows on screen arrive in a quick cascade (page load, class/subject switch); rows
 * further down are already in place. `dir` = which side a switched-to subject slides in from (0 = page load, rise). */
const rowIn = (r: number, dir: number) => r >= STAGGER.rowsMax ? false : ({ opacity: 0, x: dir * SHIFT.classSwitch, y: dir ? 0 : SHIFT.enter })

type Props = { state: SheetState; classKey: string; today: string; layout: Layout; jump?: number
  onTick?: (sessionId: string, roll: number) => void; onTickMany?: (sessionId: string, rolls: number[], value: boolean) => void
  railBubble?: boolean; swipe?: boolean; dateCols?: number; drawer?: boolean; focusSessionId?: string | null; subjectKey?: string | null; pendingOnly?: boolean; onPick?: (sessionId: string) => void }
// t119u/t121u: swipe is sideways along one name's row (was down a column); up-and-down scrolls
type Paint = { roll: number; r: number; start: number; to: number; value: boolean; x0: number; y0: number; engaged: boolean; sids: string[] }
/** The box under x; past either end it is the end box, in a gap it stays where it was (B-P10-SWIPE overshoot). */
function boxAt(btns: HTMLElement[], x: number, was: number): number {
  const r = btns.map((b) => b.getBoundingClientRect()); const at = r.findIndex((q) => x >= q.left && x <= q.right)
  if (at >= 0 || !r.length) return at >= 0 ? at : was
  return x < r[0]!.left ? 0 : x > r[r.length - 1]!.right ? r.length - 1 : was
}
const d0 = (iso: string) => { const f = fmtDay(iso); return `${f.dow} ${f.dm}` }
export function Checklist({ state, classKey, today, layout, jump = 0, onTick, onTickMany, railBubble = true, swipe = true, dateCols, drawer = false, focusSessionId = null, subjectKey = null, pendingOnly = false, onPick }: Props) {
  const c0 = useMemo(() => toChecklist(state, classKey, subjectKey), [state, classKey, subjectKey])
  const mk = useMotion(); const mo = mk.on; const [pop, setPop] = useState<string | null>(null) // anim/proto: the cell the finger just ticked
  const tk = useMoment('ticks'); const rf = useMoment('reflow'); const [undo, setUndo] = useState<ToastMsg | null>(null); const doneUndo = useCallback(() => setUndo(null), []) // beta.9
  const notice = useApp((s) => s.notice); useEffect(() => { if (notice) { setUndo(notice); useApp.setState({ notice: null }) } }, [notice]) // beta.17 (t250u): a move the sheet refused
  const [burst, setBurst] = useState(false); const full = useRef<{ key: string; done: Record<string, boolean> } | null>(null)
  const order = state.subjects.map((x) => x.subjectKey); const was = useRef({ key: `${classKey}|${subjectKey}`, dir: 0 })
  const sk = `${classKey}|${subjectKey}`; if (was.current.key !== sk) { const a = order.indexOf(was.current.key.split('|')[1] ?? ''), b = order.indexOf(subjectKey ?? ''); was.current = { key: sk, dir: a >= 0 && b >= 0 && b < a ? -1 : 1 } }
  const anchor = focusColumn(c0, today, focusSessionId)
  const [end, setEnd] = useState(anchor.index)
  // S4b "Pending only": rows still to come in for the focused date. The set is fixed when switched on (or the date changes), so a row doesn't vanish mid-tap.
  const fsid = c0.columns[anchor.index]?.sessionId ?? ''
  const [keep, setKeep] = useState<Set<number> | null>(null)
  useEffect(() => { setKeep(pendingOnly && fsid ? new Set(c0.pupils.filter((p) => !c0.ticked(fsid, p.roll)).map((p) => p.roll)) : null) }, [pendingOnly, fsid, classKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // beta.13 (t230u): the chosen name order. Pending counts the leftover ticks on the dates on screen; that count is
  // taken when the sort, the dates on screen or the subject change (not on every tick), so a row does not run away mid-tap.
  const nameSort = useApp((s) => s.nameSort); const [sortAt, setSortAt] = useState<DOMRect | null>(null)
  const shownSids = c0.columns.length ? visibleCols(c0.columns.length, end, layout, dateCols).map((i) => c0.columns[i]!.sessionId) : []
  const pendKey = nameSort.by === 'pending' ? `${sk}|${sortDir(nameSort)}|${shownSids.join(',')}` : ''
  const pend = useRef<{ key: string; n: Map<number, number> }>({ key: '', n: new Map() })
  if (pendKey && pend.current.key !== pendKey) pend.current = { key: pendKey, n: new Map(c0.pupils.map((p) => [p.roll, shownSids.filter((sid) => !c0.ticked(sid, p.roll)).length])) }
  const left = (roll: number) => pend.current.n.get(roll) ?? shownSids.filter((sid) => !c0.ticked(sid, roll)).length
  const c = useMemo(() => { const pupils = keep ? c0.pupils.filter((p) => keep.has(p.roll)) : c0.pupils
    return isDefaultSort(nameSort) && !keep ? c0 : { ...c0, pupils: isDefaultSort(nameSort) ? pupils : sortPupils(pupils, nameSort, left) } }, [c0, keep, nameSort, pendKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // beta.11 (t228u/t233u): a tapped or jumped-to row flashes once and clears itself. It used to keep a solid `sel` tint
  // until another row was picked, so the fade ended back on that tint ("fades, then sticks on").
  const [flash, setFlash] = useState<Flash | null>(null); const animK = useAnimScale()
  const [toast, setToast] = useState<string | null>(null)
  const [dates, setDates] = useState<string | null>(null) // sessionId whose date sheet is open
  const marks = useApp((s) => s.marks); const markMode = useApp((s) => s.markMode); const lateToast = useApp((s) => s.lateToast)
  const [late, setLate] = useState(false); const lx = useRef<number | null>(null)
  useEffect(() => { if (lateToast) setLate(true) }, [lateToast])
  useEffect(() => { if (!late) return; const t = setTimeout(() => setLate(false), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [late, lateToast])
  const pill = useApp((s) => s.find); const setPill = useApp.getState().setFind; const setView = useApp.getState().setView
  const [letter, setLetter] = useState<string | null>(null)
  const [painted, setPainted] = useState<{ roll: number; sids: string[]; value: boolean } | null>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const paint = useRef<Paint | null>(null); const eatClick = useRef(false)
  const names = c.pupils.map((p) => p.name)
  useEffect(() => { setEnd(anchor.index) }, [anchor.index, classKey, jump])
  // RDs2 rail: the letter of the first name under the header is the current one
  useEffect(() => {
    let raf = 0
    const look = () => { raf = 0; const head = document.querySelector('.sow-grid thead')?.getBoundingClientRect().bottom ?? 0
      const r = rows.current.findIndex((el) => !!el && el.getBoundingClientRect().bottom > head + 1); const n = r >= 0 ? c.pupils[r]?.name : undefined; setLetter(n ? letterOf(n) : null) }
    const on = () => { if (!raf) raf = requestAnimationFrame(look) }
    look(); window.addEventListener('scroll', on, { passive: true }); return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [c.pupils])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), flashMs(animK)); return () => clearTimeout(t) }, [flash]) // eslint-disable-line react-hooks/exhaustive-deps
  const lightRow = (r: number) => setFlash((f) => ({ row: r, n: (f?.n ?? 0) + 1 }))
  useBackLayer(pill != null, () => setPill(null)) // beta.11 (t229u): Back closes the name search
  // Quick search: "/" anywhere; on desktop any letter/digit typed anywhere opens the pill with it.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.shiftKey && e.key === 'O') || pill != null || isTypingTarget(e.target as Element)) return
      if (e.key === '/') { e.preventDefault(); setPill('') }
      else if (layout === 'desktop' && /^[a-z0-9]$/i.test(e.key)) { e.preventDefault(); setPill(e.key); find(e.key) }
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  })
  // beta.9 moment "done": a small burst when a date on screen reaches all done by a tick (not on load or a class switch).
  // beta.14 BK-B14-06: above the no-dates return, so a class with no dates doesn't change the hook count (it blanked the app)
  const allDone = Object.fromEntries(c0.columns.map((x) => [x.sessionId, c0.pupils.length > 0 && toGo(c0, x.sessionId) === 0]))
  useEffect(() => { const f = full.current; full.current = { key: sk, done: allDone }; if (!f || f.key !== sk || !onTick) return
    if (Object.entries(allDone).some(([sid, d]) => d && f.done[sid] === false)) setBurst(true) }) // eslint-disable-line react-hooks/exhaustive-deps
  if (!c.columns.length) return (
    <div className="dl-card sow-empty"><div className="sow-ico" aria-hidden>＋</div><h2 className="dl-title2">No dates yet</h2>
      <p className="dl-muted">This class has no dates on the sheet yet. Ticks appear here.</p></div>)
  const cols0 = visibleCols(c.columns.length, end, layout, dateCols)
  // Dates run oldest → newest, so the primary (selected) date is always the rightmost column, flush right (t145u);
  // on the phone the second date (the one before) is a drawer that opens to its left.
  const cols = cols0
  const two = drawer && cols.length === 2
  const wide = cols.length > CONFIG.layout.desktopCalmDateCols
  const weekStart = (i: number) => { if (!wide || i === cols0[0]) return false; const a = new Date(c.columns[i]!.date + 'T00:00:00'), b = new Date(c.columns[i - 1]!.date + 'T00:00:00'); return a.getDay() < b.getDay() || (+a - +b) / 864e5 >= 7 }
  const focus = c.columns[anchor.index]!
  const one = cols.length === 1
  /** Jump: centre the name in the list viewport (near the top it stays where it lands) and highlight it. */
  function go(i: number) {
    if (i < 0) return; lightRow(i)
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
  const doneOn = (sid: string) => c0.pupils.length - toGo(c0, sid)
  const matches = pill?.trim() ? rankMatches(pill.trim(), c.pupils.map((p) => ({ roll: p.roll, name: p.name }))).length : 0
  const head: HeadCol[] = cols.map((i, ci) => { const s = c.columns[i]!; return { sessionId: s.sessionId, date: s.date, kind: s.kind, topic: s.topic, done: doneOn(s.sessionId), total: c0.pupils.length, past: s.date < today, sel: i === anchor.index, second: two && ci === 0, week: weekStart(i) } })
  const sheet = c0.columns.find((x) => x.sessionId === dates)
  const colSids = cols.map((i) => c.columns[i]!.sessionId)
  const down = (e: React.PointerEvent, sid: string, roll: number, on: boolean) => {
    if (!swipe || !onTick) return
    paint.current = { roll, r: c.pupils.findIndex((p) => p.roll === roll), start: colSids.indexOf(sid), to: colSids.indexOf(sid), value: !on, x0: e.clientX, y0: e.clientY, engaged: false, sids: [sid] }
  }
  const move = (e: React.PointerEvent) => {
    const p = paint.current; if (!p) return
    const dx = Math.abs(e.clientX - p.x0), dy = Math.abs(e.clientY - p.y0)
    if (!p.engaged) { if (dy > dx && dy >= CONFIG.timing.swipeEngagePx) { paint.current = null; return } if (dx < CONFIG.timing.swipeEngagePx) return; p.engaged = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } // keep the pointer: the finger usually ends off the box (B-P10-SWIPE)
    const btns = Array.from(rows.current[p.r]?.querySelectorAll('button.t') ?? []) as HTMLElement[]
    p.to = boxAt(btns, e.clientX, p.to); const [lo, hi] = p.to < p.start ? [p.to, p.start] : [p.start, p.to]
    p.sids = colSids.slice(lo, hi + 1); setPainted({ roll: p.roll, sids: p.sids, value: p.value })
  }
  const up = () => {
    const p = paint.current; paint.current = null; setPainted(null)
    if (!p?.engaged) return // a small wobble is still a tap
    eatClick.current = true; setTimeout(() => { eatClick.current = false }, 0)
    p.sids.forEach((sid) => { if (c.ticked(sid, p.roll) !== p.value) onTick!(sid, p.roll) })
  }
  const keyGrid = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement; if (t.dataset.r == null) return
    const m = gridMove(e.key, +t.dataset.r, +t.dataset.c!, c.pupils.length, cols.length); if (!m) return
    e.preventDefault(); (e.currentTarget.querySelector(`button[data-r="${m[0]}"][data-c="${m[1]}"]`) as HTMLElement | null)?.focus()
  }
  return (
    <>
      <div className={`sow-grid ${layout}${swipe && onTick ? ' swipe' : ''}${one ? ' one' : ''}${two ? ' two' : ''}`}>
        <table onKeyDown={keyGrid}>
          <TableHead cols={head} label={keep ? `Pending · ${c.pupils.length}` : 'Names'} count={c.pupils.length} matches={matches} onDate={setDates}
            sortTag={isDefaultSort(nameSort) ? null : { name: sortName(nameSort.by), arrow: ARROW[sortDir(nameSort)] }} onSortHold={(el) => setSortAt(el.getBoundingClientRect())}
            onFind={(q) => { setPill(q); if (q.trim()) find(q.trim()) }} drawer={drawer && cols0.length > 0 && c.columns.length > 1 ? { open: two, set: (o) => setView({ phoneCols: o ? 2 : 1 }) } : undefined} />
          <tbody key={sk}>{c.pupils.map((p, r) => (
            <motion.tr key={p.roll} ref={(el: HTMLTableRowElement | null) => { rows.current[r] = el }} className={flashClass(flash, r, animK) || undefined}
              layout={rf.on ? 'position' : false} initial={mo ? rowIn(r, was.current.dir) : false} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ ...mk.spring('settle', r * STAGGER.rows), layout: rf.spring('settle') }}>
              <td className="r dl-num">{p.roll}</td>
              <td className="n" onClick={() => { lightRow(r); setToast(dup.has(p.name) ? `${p.name} · roll ${p.roll}` : p.name) }}>{p.name}{dup.has(p.name) && <small className="sow-roll">#{p.roll}</small>}</td>
              {cols.map((i, ci) => { const s = c.columns[i]!; const fut = s.date > today; const real = c.ticked(s.sessionId, p.roll)
                const pv = !!painted && painted.roll === p.roll && painted.sids.includes(s.sessionId); const on = pv ? painted!.value : real
                const mk = real ? marks[cellKey({ sessionId: s.sessionId, roll: p.roll })] : undefined; const lt = !!mk && isLate(mk.at, s.date, !!mk.back) === true
                return <td key={s.sessionId} className={[weekStart(i) && 'wk', two && ci === 0 && 'c2'].filter(Boolean).join(' ') || undefined}>{onTick ? <button className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}${pv ? ' paint' : ''}${lt && on ? ' late' : ''}`} data-r={r} data-c={ci} aria-pressed={real} aria-label={`${p.name}${dup.has(p.name) ? ` roll ${p.roll}` : ''}, ${d0(s.date)}, ${real ? (lt ? 'done, late' : 'done') : 'not yet'}`}
                    onPointerDown={(e) => down(e, s.sessionId, p.roll, real)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { paint.current = null; setPainted(null) }}
                    onClick={() => { if (eatClick.current) { eatClick.current = false; return } setPop(real ? null : `${s.sessionId}|${p.roll}`); onTick(s.sessionId, p.roll) }}>
                    {tk.on ? <AnimatePresence initial={false}>{on && <TickMark key="m" fx={pop === `${s.sessionId}|${p.roll}`} />}</AnimatePresence> : on ? <Icon name="check" /> : null}</button>
                  : <span className={`t ${fut && !on ? 'fut' : on ? 'on' : ''}`} aria-label={on ? 'Done' : 'Not yet'}>{on ? <Icon name="check" /> : null}</span>}</td> })}
            </motion.tr>))}</tbody>
        </table>
      </div>
      <AzRail names={names} onJump={go} current={letter} bubble={railBubble} />
      {sortAt && <SortMenu at={sortAt} onClose={() => setSortAt(null)} />}
      {sheet && <DateSheet viewOnly={!onTick} columns={c0.columns} current={sheet.sessionId} today={today} onPick={(sid) => onPick?.(sid)} onClose={() => setDates(null)} subjectKey={subjectKey ?? ''} kind={sheet.kind} ticks={doneOn(sheet.sessionId)} onDone={(text) => setUndo({ id: Date.now(), text, undo: /^(Moved|Added|Topic)/.test(text) ? () => useApp.getState().undo() : undefined })} />}
      {/* v0.7.0 S9 (F-LT-02): mode pill, only once this date's due time has passed */}
      {onTick && pillVisible(focus.date, nowMs()) && <button className={`sow-mode ${markMode}`} aria-pressed={markMode === 'back'} aria-label={markMode === 'late' ? 'Marking late submissions, tap for back-date' : 'Marking on back-date, tap for late submissions'}
        onClick={() => useApp.getState().setMarkMode(markMode === 'late' ? 'back' : 'late')}><i aria-hidden>{GLYPH.clock}</i><span>{markMode === 'late' ? 'Marking late submissions' : 'Marking on back-date'}</span><span className="sow-mode__sw" aria-hidden /></button>}
      {late && <div className="dl-toast-region sow-late-region"><div className="dl-toast sow-late" role="status" aria-label="Late Submission" onPointerDown={(e) => { lx.current = e.clientX }} onPointerMove={(e) => { if (lx.current != null && Math.abs(e.clientX - lx.current) > CONFIG.timing.swipeExtendPx) { lx.current = null; setLate(false) } }} onPointerUp={() => { lx.current = null }}>
        <i aria-hidden>{GLYPH.clock}</i><span><b>Late Submission</b><small>Marked after {new Date(focus.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')} · swipe to dismiss</small></span></div></div>}
      {onTick && !sheet && <Hint ids={['swipe', 'grip', 'quick']} />}
      {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--accent" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
      <UndoToast msg={undo} onDone={doneUndo} />
      {burst && <Burst onDone={() => setBurst(false)} />}
    </>
  )
}
