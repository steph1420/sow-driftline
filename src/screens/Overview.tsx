// Overview (r4 M4 + /sow/ v0.47): per-class cards → tap opens that class on Checklist at that date.
// Summary (v0.6.1) = curved Done | To go split counter with names panels, Share.
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { labelOf, useApp } from '../store/store'
import { overviewCards, type Card } from '../data/overview'
import { addDays } from '../data/dial'
import { WeekPath } from './WeekPath'
import { fmtDay, pickAnchor, toChecklist, toGo } from '../data/model'
import { todayIso } from '../data/today'
import { shareText } from '../data/share'
import { isPhone, shareTargets } from '../data/shareTargets'
const CHIP = { today: 'Today', upcoming: 'Upcoming', last: 'Last', none: '' } as const
function useFocus(classKey: string) {
  const data = useApp((s) => s.data); const sub = useApp((s) => s.subject); const fs = useApp((s) => s.focus)
  const c = toChecklist(data, classKey, sub); const a0 = pickAnchor(c.columns.map((x) => x.date), todayIso()); const fi = fs ? c.columns.findIndex((x) => x.sessionId === fs) : -1 // follows the date open on Checklist
  const t = todayIso(); const a = fi < 0 ? a0 : { index: fi, kind: (c.columns[fi]!.date === t ? 'today' : c.columns[fi]!.date > t ? 'upcoming' : 'last') as typeof a0.kind }; const col = c.columns[a.index]
  const left = col ? toGo(c, col.sessionId) : 0
  return { c, a, col, left, done: c.pupils.length - left, missing: col ? c.pupils.filter((p) => !c.ticked(col.sessionId, p.roll)) : [] }
}
const dayMon = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } } // Wed, 4 Nov
const longDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '')
/** v0.6.1 quick overview (mocks v061/qo*): curved Done | To go split counter; each half opens its names panel. */
export function Summary({ classKey, label, onClose, half: initialHalf = null }: { classKey: string; label: string; onClose?: () => void; half?: 'done' | 'go' | null }) {
  const { c, a, col, left, done, missing } = useFocus(classKey)
  const [panel, setPanel] = useState<'done' | 'go' | null>(initialHalf); const [all, setAll] = useState(false); const [targets, setTargets] = useState(false); const [msg, setMsg] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setAll(false) }, [panel])
  if (!col) return <div className="dl-card"><h2 className="dl-title2">No dates yet</h2></div>
  const sub = [c.subject, longDay(col.date)].filter(Boolean).join(' · ')
  const base = shareText({ label, date: col.date, names: missing.map((p) => p.name) }); const text = msg ?? base
  const doneList = c.pupils.filter((p) => c.ticked(col.sessionId, p.roll))
  const list = panel === 'done' ? doneList : missing; const shown = all ? list : list.slice(0, CONFIG.timing.stillToComeShown)
  const t = encodeURIComponent(text); const subj = encodeURIComponent(`${label} · ${c.subject} · ${longDay(col.date)}`)
  const copy = async () => { try { await navigator.clipboard?.writeText(text) } catch { /* ignore */ } setToast('List copied') }
  /** Keep has no web link that takes text: phones get the system share sheet (Keep is in it); desktop copies and opens Keep. */
  const keep = async () => { await copy(); setToast('List copied, paste it into a new note'); window.open('https://keep.google.com/', '_blank', 'noopener') }
  const more = async () => { try { await navigator.share?.({ text }) } catch { /* cancelled */ } }
  const list4 = shareTargets({ phone: isPhone(), canShare: typeof navigator !== 'undefined' && !!navigator.share })
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
    {targets && <div className="sow-msg"><div className="sow-msg__head"><span className="dl-eyebrow">Message</span><span className="sow-sp" />
        {msg != null && msg !== base && <button className="sow-link" onClick={() => setMsg(null)}>Reset</button>}</div>
      <textarea aria-label="Message to share" value={text} rows={Math.min(7, text.split('\n').length + 1)} onChange={(e) => setMsg(e.target.value)} /></div>}
    {targets && <div className="sow-targets" role="group" aria-label="Share to" style={{ gridTemplateColumns: `repeat(${list4.length}, 1fr)` }}>{list4.map((k) =>
      k === 'whatsapp' ? <a key={k} className="sow-blob wa" href={`https://wa.me/?text=${t}`} target="_blank" rel="noopener" aria-label="WhatsApp"><i aria-hidden>✆</i><span>WhatsApp</span></a>
      : k === 'keep' ? <button key={k} className="sow-blob keep" aria-label="Keep" onClick={keep}><i aria-hidden>✎</i><span>Keep</span></button>
      : k === 'mail' ? <a key={k} className="sow-blob mail" href={`mailto:?subject=${subj}&body=${t}`} aria-label="Mail"><i aria-hidden>✉</i><span>Mail</span></a>
      : k === 'sms' ? <a key={k} className="sow-blob sms" href={`sms:?&body=${t}`} aria-label="Messages"><i aria-hidden className="txt">SMS</i><span>Messages</span></a>
      : <button key={k} className="sow-blob more" aria-label="More apps" onClick={more}><i aria-hidden>⋯</i><span>More</span></button>)}</div>}
    <div className="sow-pair sow-sharebar"><button className="dl-btn dl-btn--secondary" onClick={copy}>Copy</button>
      <button className="dl-btn dl-btn--primary" aria-expanded={targets} onClick={() => setTargets(!targets)}>Share</button></div>
    {toast && <div className="dl-toast-region"><div className="dl-toast dl-tone--positive" role="status"><span className="dl-toast__dot" />{toast}</div></div>}
  </div>)
}
/** v0.7j Overview: one squircle card per class + subject + type; tap opens Checklist on that session, the corner path opens its week path. */
const PathIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 17.5c4 0 3-5 6-6.5s2-3 2.3-3.4" /></svg>
function ClassCard({ c, today, onPath }: { c: Card; today: string; onPath: () => void }) {
  const open = useApp((s) => s.openSession); const f = c.date ? dayMon(c.date) : null
  const when = !c.date ? 'No dates yet' : c.date === today ? 'Today' : c.date === addDays(today, 1) ? 'Tomorrow' : ''
  return (
    <div className="sow-sq">
      <button className="sow-sq__main" aria-label={`Open ${c.label} ${c.subject} ${c.kind} on Checklist`} disabled={!c.sessionId} onClick={() => c.sessionId && open(c.classKey, c.sessionId)}>
        <span className="sow-sq__top"><b className="sow-sq__cls">{c.label}</b><span className="sow-sq__sub">{c.subject}</span><span className="sow-sq__pill">{c.kind}</span></span>
        <span className="sow-sq__topic">{c.topic || (c.date ? 'No topic yet' : '')}</span>
        <span className="sow-sq__foot"><span className="sow-sq__when">{f ? [when, `${f.dow}, ${f.dm}`].filter(Boolean).join(' · ') : when}</span>
          {c.sessionId && (c.toGo > 0 ? <span className="sow-sq__go">{c.toGo} to go ›</span> : <span className="sow-sq__in">✓ All in</span>)}</span>
      </button>
      {c.date && <button className="sow-sq__path" aria-label={`Week path, ${c.label} ${c.subject} ${c.kind}`} onClick={onPath}><PathIcon /></button>}
    </div>)
}
export function Overview() {
  const data = useApp((s) => s.data); const today = todayIso(); const [path, setPath] = useState<string | null>(null)
  const cards = overviewCards(data, today).map((c) => ({ ...c, label: labelOf(c.classKey) }))
  return (<div className="sow-ov">
    <div className="dl-muted sow-ov__date">{new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h1 className="sow-ov__title">Your classes</h1>
    <p className="dl-muted sow-ov__hint">Tap a class to open its checklist</p>
    <div className="sow-sqs">{cards.map((c) => <ClassCard key={c.subjectKey} c={c} today={today} onPath={() => setPath(c.subjectKey)} />)}</div>
    {!cards.length && <p className="dl-muted">No classes yet.</p>}
    {path && <WeekPath subjectKey={path} today={today} onClose={() => setPath(null)} />}
  </div>)
}
/** Pull-up quick overview on Checklist: swipe up on the grabber, ⇧O, or ⋮ › Quick overview. */
export function QuickSheet() {
  const open = useApp((s) => s.quick); const setQuick = useApp((s) => s.setQuick); const cur = useApp((s) => s.currentClass); const classes = useApp((s) => s.classes); const qh = useApp((s) => s.quickHalf)
  const y0 = useRef<number | null>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && useApp.getState().quick) setQuick(false) }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [setQuick])
  const label = classes.find((c) => c.classKey === cur)?.label ?? ''
  return (<>
    {!open && <button className="sow-grabber" aria-label="Quick overview (swipe up)" onClick={() => setQuick(true)}
      onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && y0.current - e.clientY > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(true) } }} onPointerUp={() => { y0.current = null }}><i /></button>}
    {open && <><button className="sow-scrim" aria-label="Close quick overview" onClick={() => setQuick(false)} />
      <div className="sow-sheet" role="dialog" aria-label="Quick overview">
        <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={() => setQuick(false)}
          onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; setQuick(false) } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>{cur && <Summary classKey={cur} label={label} half={qh} onClose={() => setQuick(false)} />}</div></>}
  </>)
}
