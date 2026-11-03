// Overview (r4 M4 + /sow/ v0.47): per-class cards → tap opens that class on Checklist at that date.
// Summary = Done / To go / Waiting, "Still to come in" (progressive), Share footer (Copy · Share).
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { useApp } from '../store/store'
import { fmtDay, pickAnchor, toChecklist, toGo } from '../data/model'
import { todayIso } from '../data/today'
import { shareText } from '../data/share'
const CHIP = { today: 'Today', upcoming: 'Upcoming', last: 'Last', none: '' } as const
function useFocus(classKey: string) {
  const data = useApp((s) => s.data)
  const c = toChecklist(data, classKey); const a = pickAnchor(c.columns.map((x) => x.date), todayIso()); const col = c.columns[a.index]
  const left = col ? toGo(c, col.sessionId) : 0
  return { c, a, col, left, done: c.pupils.length - left, missing: col ? c.pupils.filter((p) => !c.ticked(col.sessionId, p.roll)) : [] }
}
function ClassCard({ classKey, label, subject }: { classKey: string; label: string; subject: string }) {
  const { c, a, col, left, done } = useFocus(classKey); const open = useApp((s) => s.openClass)
  const f = col ? fmtDay(col.date) : null
  return (
    <button className="dl-card sow-ccard" aria-label={`Open ${label} ${subject} on Checklist`} onClick={() => open(classKey)}>
      <div className="sow-glance"><span className="dl-logo" aria-hidden>{label.slice(-1)}</span>
        <div><div className="dl-headline">{label} <span className="dl-muted sow-note">{subject}</span></div>
          <div className="dl-eyebrow">{f ? `${CHIP[a.kind]} · ${col!.kind ? col!.kind + ' · ' : ''}${f.dow} ${f.dm}` : 'No dates yet'}</div></div>
        <span className="sow-sp" />{col && (left > 0 ? <span className="dl-chip dl-tone--accent">{left} to go</span> : <span className="dl-chip dl-tone--positive">All done</span>)}</div>
      <div className="sow-prog"><i style={{ width: `${c.pupils.length ? (done / c.pupils.length) * 100 : 0}%` }} /></div>
    </button>)
}
export function Summary({ classKey, label }: { classKey: string; label: string }) {
  const { c, col, left, done, missing } = useFocus(classKey); const waiting = useApp((s) => s.waiting)
  const [all, setAll] = useState(false); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  if (!col) return <div className="dl-card"><h2 className="dl-title2">No dates yet</h2></div>
  const f = fmtDay(col.date); const text = shareText({ label, date: col.date, names: missing.map((p) => p.name) })
  const shown = all ? missing : missing.slice(0, CONFIG.timing.stillToComeShown)
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* ignore */ } setToast('List copied') }
  const share = async () => { if (navigator.share) { try { await navigator.share({ text }) } catch { /* cancelled */ } } else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener') }
  return (<>
    <div className="dl-card"><div className="dl-eyebrow">{col.kind ? `${col.kind} · ` : ''}{f.dow} {f.dm} · {label}</div><h2 className="dl-title2">{c.subject || 'Class'}</h2>
      <div className="sow-stats">
        <div className="sow-stat pos"><span>Done</span><b className="dl-num">{done}</b><small>of {c.pupils.length}</small></div>
        <div className="sow-stat acc"><span>To go</span><b className="dl-num">{left}</b><small>not yet in</small></div>
        <div className="sow-stat warn"><span>Waiting</span><b className="dl-num">{waiting}</b><small>to save</small></div>
      </div></div>
    {missing.length > 0 && <div className="dl-card"><div className="dl-eyebrow">Still to come in</div><h3 className="dl-headline">{col.kind ? `${col.kind} · ` : ''}{f.dow} {f.dm}</h3>
      <div className="sow-snaps">{shown.map((p) => <div key={p.roll} className="dl-row"><span className="sow-ring" aria-hidden />{p.name}</div>)}</div>
      {missing.length > shown.length && <button className="sow-more" onClick={() => setAll(true)}>Show all {missing.length}</button>}</div>}
    <div className="dl-card sow-sharef"><div className="dl-eyebrow">Share</div><h3 className="dl-headline">Send the list</h3>
      <div className="sow-pair"><button className="dl-btn dl-btn--secondary" onClick={copy}>Copy</button><button className="dl-btn dl-btn--primary" onClick={share}>Share</button></div></div>
    {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--positive" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
  </>)
}
export function Overview() {
  const classes = useApp((s) => s.classes); const cur = useApp((s) => s.currentClass)
  const label = classes.find((c) => c.classKey === cur)?.label ?? ''
  return (<>
    <div className="dl-eyebrow sow-sec">Your classes</div>
    {classes.map((c) => <ClassCard key={c.classKey} {...c} />)}
    {cur && <><div className="dl-eyebrow sow-sec">This class</div><Summary classKey={cur} label={label} /></>}
  </>)
}
/** Pull-up quick overview on Checklist: swipe up on the grabber, ⇧O, or ⋮ › Quick overview. */
export function QuickSheet() {
  const open = useApp((s) => s.quick); const setQuick = useApp((s) => s.setQuick); const cur = useApp((s) => s.currentClass); const classes = useApp((s) => s.classes)
  const y0 = useRef<number | null>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && useApp.getState().quick) setQuick(false) }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [setQuick])
  const label = classes.find((c) => c.classKey === cur)?.label ?? ''
  return (<>
    {!open && <button className="sow-grabber" aria-label="Quick overview (swipe up)" onClick={() => setQuick(true)}
      onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && y0.current - e.clientY > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(true) } }} onPointerUp={() => { y0.current = null }}><i /></button>}
    {open && <><button className="sow-scrim" aria-label="Close quick overview" onClick={() => setQuick(false)} />
      <div className="sow-sheet" role="dialog" aria-label="Quick overview">
        <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={() => setQuick(false)}
          onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(false) } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>{cur && <Summary classKey={cur} label={label} />}</div></>}
  </>)
}
