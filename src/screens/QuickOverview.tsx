// v0.8 F-CL-10/11 (Q2e, Q3-since): quick overview on Checklist. One card per visible date column: date pill, done/total,
// "+N since HH:MM" (tap: since open → this hour → today) and share, which stacks the share sheet (F-CL-12).
// v0.9.0-beta.3 (t150u, dev-only): the card is drawn in one of five styles (Settings › Developer options › QO card
// style); holding the title steps to the next style with a toast naming it.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CONFIG } from '../config'
import { nowMs, useApp } from '../store/store'
import { focusColumn, toChecklist, visibleCols, type Layout } from '../data/model'
import { nextSince, sinceWords, sinceStart, type SinceMode } from '../data/since'
import { nextQoStyle, qoCard, qoStyleName } from '../data/qoCard'
import { todayIso } from '../data/today'
import { GLYPH } from '../ui/icons'
import { usePress } from '../ui/usePress'
import { QoCardView } from './qo/QoCards'
import { Sheet } from '../ui/Sheet'
import { ShareSheet } from './ShareSheet'

export function QuickOverview({ layout, dateCols }: { layout: Layout; dateCols: number }) {
  const open = useApp((s) => s.quick); const setQuick = useApp((s) => s.setQuick); const pull = useApp((s) => s.quickPull)
  const data = useApp((s) => s.data); const cls = useApp((s) => s.currentClass); const subject = useApp((s) => s.subject); const focus = useApp((s) => s.focus); const openedAt = useApp((s) => s.openedAt)
  const [mode, setMode] = useState<SinceMode>('open'); const [share, setShare] = useState<string | null>(null)
  const y0 = useRef<number | null>(null)
  const style = useApp((s) => s.dev.qoCard); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  const cycle = usePress({ holdMs: CONFIG.timing.devHoldMs, onTap: () => {}, onHold: () => { const st = useApp.getState(); const next = nextQoStyle(st.dev.qoCard); st.setDev({ qoCard: next }); setToast(qoStyleName(next)) } })
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key !== 'Escape' || !useApp.getState().quick) return; if (share) setShare(null); else setQuick(false) }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [setQuick, share])
  useEffect(() => { if (!open) setShare(null) }, [open])
  const today = todayIso(); const c = toChecklist(data, cls, subject); const anchor = focusColumn(c, today, focus)
  const cols = visibleCols(c.columns.length, anchor.index, layout, dateCols).map((i) => c.columns[i]!)
  const from = sinceStart(mode, { openedAt, now: nowMs() })
  const shown = open || !!pull // anim/proto: the sheet stays in an AnimatePresence so closing slides it away
  return (<>
    {!shown && <button className="sow-grabber" aria-label="Quick overview (swipe up)" onClick={() => setQuick(true)}
      onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && y0.current - e.clientY > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(true) } }} onPointerUp={() => { y0.current = null }}><i /></button>}
    <AnimatePresence>{shown && <Sheet key="qo" label="Quick overview" onClose={() => setQuick(false)} className="sow-qo" pull={open ? undefined : pull} behind={!!share}>
      <div className="sow-sheet__head"><h2 className="sow-sheet__title sow-qo__title" aria-description="Hold to try the next card style (developer)" {...cycle}>Quick overview</h2>
        {toast && <span className="sow-qo__toast" role="status">{toast}</span>}<button className="sow-x" aria-label="Close" onClick={() => setQuick(false)}>{GLYPH.close}</button></div>
      <div className={`sow-qcs${cols.length > 1 ? ' two' : ''}`}>{cols.map((s, i) =>
        <QoCardView key={s.sessionId} index={i} style={style} card={qoCard(c, data.ticks, s.sessionId, { from, today, selId: c.columns[anchor.index]?.sessionId ?? null })}
          mode={mode} words={sinceWords(mode, openedAt)} onNext={() => setMode(nextSince(mode))} onShare={() => setShare(s.sessionId)} />)}</div>
    </Sheet>}</AnimatePresence>
    <AnimatePresence>{share && <ShareSheet key={share} sessionId={share} onClose={() => setShare(null)} />}</AnimatePresence>
  </>)
}
