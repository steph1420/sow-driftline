// v0.7.0 S6 (step 5): date sheet, read part — a strip of this class's existing dates (F-DT-04). Picking one changes no data.
// S7 adds the Month | Date | Day wheels, year pill and Change date on this same sheet.
import { useEffect, useRef } from 'react'
import { CONFIG } from '../config'
const chipDay = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } }
export type DateCol = { sessionId: string; date: string; kind: string; topic: string }
export function DateSheet({ columns, current, today, onPick, onClose, children }: { columns: DateCol[]; current: string; today: string; onPick: (sessionId: string) => void; onClose: () => void; children?: React.ReactNode }) {
  const strip = useRef<HTMLDivElement | null>(null); const y0 = useRef<number | null>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => { strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }) }, [])
  return (<>
    <button className="sow-scrim" aria-label="Close dates" onClick={onClose} />
    <div className="sow-sheet sow-ds" role="dialog" aria-label="Dates">
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={onClose}
        onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; onClose() } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>
      <div className="sow-wp__head"><h2 className="sow-wp__title">Dates</h2><button className="sow-x" aria-label="Close" onClick={onClose}>✕</button></div>
      <div className="sow-ds__strip" ref={strip} role="listbox" aria-label="Existing dates">
        {columns.map((c) => { const d = chipDay(c.date); const on = c.sessionId === current
          return <button key={c.sessionId} role="option" aria-selected={on} aria-current={on} className={`sow-ds__chip${on ? ' on' : ''}${c.date < today ? ' old' : ''}`} aria-label={`${c.kind} ${d.dow} ${d.dm}${c.date === today ? ', today' : ''}`} onClick={() => { onPick(c.sessionId); onClose() }}>
            <small>{c.date === today ? `${c.kind} · Today` : `${c.kind} · ${d.dow}`}</small><b>{d.dm}</b></button> })}
      </div>
      {children}
    </div></>)
}
