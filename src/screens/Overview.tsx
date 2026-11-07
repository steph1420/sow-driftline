// Overview (r4 M4 + /sow/ v0.47): per-class cards → tap opens that class on Checklist at that date.
// Summary (v0.6.1) = curved Done | To go split counter with names panels, Share.
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
const longDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '')
/** v0.6.1 quick overview (mocks v061/qo*): curved Done | To go split counter; each half opens its names panel. */
export function Summary({ classKey, label, onClose }: { classKey: string; label: string; onClose?: () => void }) {
  const { c, a, col, left, done, missing } = useFocus(classKey)
  const [panel, setPanel] = useState<'done' | 'go' | null>(null); const [all, setAll] = useState(false); const [targets, setTargets] = useState(false); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setAll(false) }, [panel])
  if (!col) return <div className="dl-card"><h2 className="dl-title2">No dates yet</h2></div>
  const sub = [c.subject, longDay(col.date)].filter(Boolean).join(' · ')
  const text = shareText({ label, date: col.date, names: missing.map((p) => p.name) })
  const doneList = c.pupils.filter((p) => c.ticked(col.sessionId, p.roll))
  const list = panel === 'done' ? doneList : missing; const shown = all ? list : list.slice(0, CONFIG.timing.stillToComeShown)
  const t = encodeURIComponent(text); const subj = encodeURIComponent(`${label} · ${c.subject} · ${longDay(col.date)}`)
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* ignore */ } setToast('List copied') }
  /** Keep has no web link that takes text: phones get the system share sheet (Keep is in it); desktop copies and opens Keep. */
  const keep = async () => { if (navigator.share) { try { await navigator.share({ text }) } catch { /* cancelled */ } return }
    await copy(); setToast('List copied, paste it into a new note'); window.open('https://keep.google.com/', '_blank', 'noopener') }
  const half = (k: 'done' | 'go', n: number, word: string) => (
    <button className={`sow-half ${k}${panel === k ? ' on' : ''}`} aria-expanded={panel === k} aria-label={`${n} ${word}`} onClick={() => setPanel(panel === k ? null : k)}>
      <b className="dl-num">{n}</b><span>{word === 'done' ? 'Done' : 'To go'} <i aria-hidden>{panel === k ? '⌃' : '⌄'}</i></span></button>)
  return (<div className="sow-sum">
    <div className="sow-sum__head"><div><h2 className="dl-headline">{label}{CHIP[a.kind] ? ` · ${CHIP[a.kind]}` : ''}</h2><div className="dl-muted sow-note">{sub}</div></div>
      {onClose && <button className="sow-x" aria-label="Close" onClick={onClose}>✕</button>}</div>
    <div className="sow-prog"><i style={{ width: `${c.pupils.length ? (done / c.pupils.length) * 100 : 0}%` }} /></div>
    <div className="sow-split">{half('done', done, 'done')}{half('go', left, 'to go')}</div>
    {panel && <div className="sow-names"><div className="dl-eyebrow">{panel === 'done' ? 'Done' : 'Still to come in'}</div><div className="dl-muted sow-note">{sub}</div>
      {list.length ? <ul>{shown.map((p) => <li key={p.roll}><span className={panel === 'done' ? 'sow-okdot' : 'sow-ring'} aria-hidden>{panel === 'done' ? '✓' : ''}</span>{p.name}</li>)}</ul>
        : <p className="dl-muted sow-note">{panel === 'done' ? 'None yet' : 'Everyone is in'}</p>}
      {list.length > shown.length && <button className="sow-more" onClick={() => setAll(true)}>Show all {list.length}</button>}</div>}
    {targets && <div className="sow-targets" role="group" aria-label="Share to">
      <a className="sow-blob wa" href={`https://wa.me/?text=${t}`} target="_blank" rel="noopener" aria-label="WhatsApp"><i aria-hidden>✆</i><span>WhatsApp</span></a>
      <button className="sow-blob keep" aria-label="Keep" onClick={keep}><i aria-hidden>✎</i><span>Keep</span></button>
      <a className="sow-blob mail" href={`mailto:?subject=${subj}&body=${t}`} aria-label="Mail"><i aria-hidden>✉</i><span>Mail</span></a>
      <a className="sow-blob sms" href={`sms:?&body=${t}`} aria-label="Messages"><i aria-hidden className="txt">SMS</i><span>Messages</span></a></div>}
    <div className="sow-pair sow-sharebar"><button className="dl-btn dl-btn--secondary" onClick={copy}>Copy</button>
      <button className="dl-btn dl-btn--primary" aria-expanded={targets} onClick={() => setTargets(!targets)}>Share</button></div>
    {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--positive" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
  </div>)
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
          onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(false) } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>{cur && <Summary classKey={cur} label={label} onClose={() => setQuick(false)} />}</div></>}
  </>)
}
