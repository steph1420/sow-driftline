// v0.7.0 S5 (step 4): week path for one class + subject + type (F-OV-04, mock v07j week-path).
// Newest week at the top, scroll down for older weeks; the pinned heading follows the week in view. Tap a stop to open it.
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { labelOf, useApp } from '../store/store'
import { weekPath } from '../data/overview'
const day = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^(\w+) /, '$1, ')
export function WeekPath({ subjectKey, today, onClose }: { subjectKey: string; today: string; onClose: () => void }) {
  const data = useApp((s) => s.data); const open = useApp((s) => s.openSession)
  const sub = data.subjects.find((x) => x.subjectKey === subjectKey)
  const weeks = weekPath(data, subjectKey, today)
  const [inView, setInView] = useState(0)
  const list = useRef<HTMLDivElement | null>(null); const secs = useRef<(HTMLElement | null)[]>([]); const y0 = useRef<number | null>(null)
  const thisWeek = Math.max(0, weeks.findIndex((w) => w.start <= today && today <= w.end))
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => { const el = secs.current[thisWeek]; if (el && list.current) list.current.scrollTop = el.offsetTop - list.current.offsetTop; setInView(thisWeek) }, [thisWeek]) // open on this week
  const onScroll = () => { const l = list.current; if (!l) return; const y = l.scrollTop + l.offsetTop + 8; let i = 0; secs.current.forEach((s, j) => { if (s && s.offsetTop <= y) i = j }); setInView(i) } // token-ok: not css
  if (!sub) return null
  const head = weeks[inView]?.title ?? 'No dates yet'
  return (<>
    <button className="sow-scrim" aria-label="Close week path" onClick={onClose} />
    <div className="sow-sheet sow-wp" role="dialog" aria-label={`Week path, ${labelOf(sub.classKey)} ${sub.subject} ${sub.kind}`}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={onClose}
        onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; onClose() } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>
      <div className="sow-wp__head"><div><h2 className="sow-wp__title">{labelOf(sub.classKey)} · {sub.subject} {sub.kind}</h2><div className="dl-muted sow-wp__week" aria-live="polite">{head}</div></div>
        <button className="sow-x" aria-label="Close" onClick={onClose}>✕</button></div>
      <div className="sow-wp__list" ref={list} onScroll={onScroll}>
        {weeks.map((w, wi) => <section key={w.start} ref={(el) => { secs.current[wi] = el }} aria-label={w.title}>
          {wi > 0 && wi !== thisWeek && <div className="sow-wp__div">{w.title}</div>}
          {w.stops.map((s) => <div key={s.sessionId} className={`sow-wp__stop ${s.when}`}>
            <div className="sow-wp__day">{s.when === 'today' ? `Today · ${day(s.date)}` : day(s.date)}</div>
            <button className="sow-wp__card" aria-label={`Open ${day(s.date)} on Checklist`} onClick={() => { open(sub.classKey, s.sessionId); onClose() }}>
              <span className="sow-wp__kind">{s.kind}</span><span className="sow-wp__topic">{s.topic || 'No topic yet'}</span>
              <span className="sow-wp__foot">{s.toGo > 0 ? <span>{s.toGo} to go</span> : <span className="sow-wp__in">✓ All in</span>}<span aria-hidden>→</span></span>
            </button></div>)}
        </section>)}
      </div>
    </div></>)
}
