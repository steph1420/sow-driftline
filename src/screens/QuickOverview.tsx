// v0.8 F-CL-10/11 (Q2e, Q3-since): quick overview on Checklist. One card per visible date column: date pill, done/total,
// "+N since HH:MM" (tap: since open → this hour → today) and share, which stacks the share sheet (F-CL-12).
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { labelOf, nowMs, useApp } from '../store/store'
import { fmtDay, focusColumn, toChecklist, toGo, visibleCols, type Layout } from '../data/model'
import { SINCE_MODES, SINCE_NAME, countSince, nextSince, sinceLabel, sinceWords, sinceStart, type SinceMode } from '../data/since'
import { shareText } from '../data/share'
import { todayIso } from '../data/today'
import { GLYPH, Icon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import { ShareSheet } from './ShareSheet'

const pillDate = (iso: string) => `${fmtDay(iso).dow} ${Number(iso.slice(8, 10))}`
const longDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')

export function QuickOverview({ layout, dateCols }: { layout: Layout; dateCols: number }) {
  const open = useApp((s) => s.quick); const setQuick = useApp((s) => s.setQuick)
  const data = useApp((s) => s.data); const cls = useApp((s) => s.currentClass); const subject = useApp((s) => s.subject); const focus = useApp((s) => s.focus); const openedAt = useApp((s) => s.openedAt)
  const [mode, setMode] = useState<SinceMode>('open'); const [share, setShare] = useState<string | null>(null)
  const y0 = useRef<number | null>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key !== 'Escape' || !useApp.getState().quick) return; if (share) setShare(null); else setQuick(false) }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [setQuick, share])
  useEffect(() => { if (!open) setShare(null) }, [open])
  const today = todayIso(); const c = toChecklist(data, cls, subject); const anchor = focusColumn(c, today, focus)
  const cols = visibleCols(c.columns.length, anchor.index, layout, dateCols).map((i) => c.columns[i]!)
  const from = sinceStart(mode, { openedAt, now: nowMs() }); const what = [labelOf(cls), c.subject, cols[0]?.kind].filter(Boolean).join(' ')
  const shared = cols.find((x) => x.sessionId === share)
  if (!open) return (
    <button className="sow-grabber" aria-label="Quick overview (swipe up)" onClick={() => setQuick(true)}
      onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && y0.current - e.clientY > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(true) } }} onPointerUp={() => { y0.current = null }}><i /></button>)
  return (<>
    <Sheet label="Quick overview" onClose={() => setQuick(false)} className="sow-quick">
      <div className="sow-sheet__head"><h2 className="sow-sheet__title">Quick overview</h2><button className="sow-x" aria-label="Close" onClick={() => setQuick(false)}>{GLYPH.close}</button></div>
      <div className={`sow-qcs${cols.length > 1 ? ' two' : ''}`}>{cols.map((s) => {
        const done = c.pupils.length - toGo(c, s.sessionId); const n = countSince(data.ticks, s.sessionId, from); const words = sinceWords(mode, openedAt)
        return <div key={s.sessionId} className={`sow-qc${s.date < today ? ' old' : ''}${s.sessionId === c.columns[anchor.index]?.sessionId ? ' sel' : ''}`}>
          <span className="sow-qc__pill">{pillDate(s.date)}</span>
          <b className="sow-qc__n dl-num">{done}<small>/{c.pupils.length}</small></b>
          <button className="sow-qc__since" aria-label={`${sinceLabel(mode, n, openedAt)}, tap for ${SINCE_NAME[nextSince(mode)]}`} onClick={() => setMode(nextSince(mode))}>
            <span><b>+{n}</b> {words}</span><span className="sow-qc__dots" aria-hidden>{SINCE_MODES.map((m) => <i key={m} className={m === mode ? 'on' : ''} />)}</span></button>
          <button className="sow-qc__share" aria-label={`Share ${longDate(s.date)}`} onClick={() => setShare(s.sessionId)}><Icon name="share" /></button>
        </div> })}</div>
    </Sheet>
    {shared && <ShareSheet date={pillDate(shared.date)} what={what} mailSubject={`${what} · ${longDate(shared.date)}`} onClose={() => setShare(null)}
      text={shareText({ label: labelOf(cls), date: shared.date, names: c.pupils.filter((p) => !c.ticked(shared.sessionId, p.roll)).map((p) => p.name) })} />}
  </>)
}
