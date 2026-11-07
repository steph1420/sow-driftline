// v0.7.0 S6–S8: the date sheet. Chips of this class's existing dates (F-DT-04, tap = open it, no data change),
// Reschedule (was Change date) (S7, F-DT-01..06: wheels, year pill, topic, live dashed chip, button dim until a change, collision note, Cancel)
// and + New date (S8, F-OV-05: next class day picked, no duplicate on the same day).
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { GLYPH, Icon } from '../ui/icons'
import { useApp } from '../store/store'
import { collides, nextClassDays } from '../data/edits'
import { Wheels } from './Wheels'
const chipDay = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } }
const short = (iso: string) => { const d = chipDay(iso); return `${d.dow} ${d.dm}` }
const long = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '')
export type DateCol = { sessionId: string; date: string; kind: string; topic: string }
type Mode = 'pick' | 'edit' | 'new'
type Props = { columns: DateCol[]; current: string; today: string; onPick: (sessionId: string) => void; onClose: () => void; subjectKey?: string; kind?: string; ticks?: number; onDone?: (msg: string) => void; start?: Mode }
export function DateSheet({ columns, current, today, onPick, onClose, subjectKey = '', kind = '', ticks = 0, onDone, start = 'pick' }: Props) {
  const strip = useRef<HTMLDivElement | null>(null); const y0 = useRef<number | null>(null)
  const data = useApp((s) => s.data); const cur = columns.find((c) => c.sessionId === current)
  const [mode, setMode] = useState<Mode>(start)
  const suggest = nextClassDays(data, subjectKey, today)
  const [date, setDate] = useState(start === 'new' ? suggest[0] ?? today : cur?.date ?? today)
  const [topic, setTopic] = useState(cur?.topic ?? ''); const [typing, setTyping] = useState(false)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  useEffect(() => { strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }) }, [mode])
  const open = (m: Mode) => { setMode(m); setDate(m === 'new' ? suggest[0] ?? today : cur?.date ?? today); setTopic(cur?.topic ?? ''); setTyping(false) }
  const moved = mode === 'edit' && cur != null && date !== cur.date; const retopic = mode === 'edit' && cur != null && topic.trim() !== (cur.topic ?? '')
  const clash = (mode === 'edit' && moved && collides(data, subjectKey, date, current)) || (mode === 'new' && collides(data, subjectKey, date))
  const changed = mode === 'new' || moved || retopic
  const act = mode === 'new' ? `Add ${kind ? `${kind} · ` : ''}${long(date)}` : moved ? `Move to ${short(date)}` : retopic ? 'Save topic' : 'Move date'
  function go() {
    if (!changed || clash) return; const s = useApp.getState()
    if (mode === 'new') { const sid = s.addSession(subjectKey, date); if (sid) { onPick(sid); onDone?.(`Added ${kind} · ${short(date)}`) } onClose(); return }
    if (retopic) s.setTopic(current, topic.trim())
    if (moved) s.moveSession(current, date)
    onDone?.(moved ? `Moved to ${short(date)} · ticks moved with it` : 'Topic updated'); onClose()
  }
  return (<>
    <button className="sow-scrim" aria-label="Close dates" onClick={onClose} />
    <div className={`sow-sheet sow-ds${mode !== 'pick' ? ' editing' : ''}`} role="dialog" aria-label={mode === 'edit' ? 'Reschedule' : mode === 'new' ? 'New date' : 'Dates'}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={onClose}
        onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; onClose() } }} onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>
      <div className="sow-wp__head"><h2 className="sow-wp__title">{mode === 'edit' ? 'Reschedule' : mode === 'new' ? 'New date' : 'Dates'}</h2><button className="sow-x" aria-label="Close" onClick={onClose}>{GLYPH.close}</button></div>
      {mode !== 'new' && <div className="sow-ds__strip" ref={strip} role="listbox" aria-label="Existing dates">
        {columns.map((c) => { const on = c.sessionId === current; const shown = on && mode === 'edit' ? date : c.date; const d = chipDay(shown)
          return <button key={c.sessionId} role="option" aria-selected={on} aria-current={on} className={`sow-ds__chip${on ? ' on' : ''}${on && moved ? ' live' : ''}${shown < today ? ' old' : ''}`} aria-label={`${c.kind} ${d.dow} ${d.dm}${shown === today ? ', today' : ''}`}
            onClick={() => { if (mode === 'edit') return; onPick(c.sessionId); onClose() }}>
            <small>{shown === today ? `${c.kind} · Today` : `${c.kind} · ${d.dow}`}</small><b>{d.dm}</b></button> })}
      </div>}
      {mode === 'pick' && <div className="sow-ds__acts">
        <button className="sow-ds__act" onClick={() => open('edit')}><Icon name="calendar" /><span>Reschedule</span></button>
        <button className="sow-ds__act" onClick={() => open('new')}><span aria-hidden>＋</span><span>New date</span></button></div>}
      {mode === 'edit' && <div className="sow-ds__line">
        <span>{ticks} {ticks === 1 ? 'tick' : 'ticks'} · </span>
        {typing ? <input className="sow-ds__topic" aria-label="Topic" autoFocus value={topic} placeholder="Add a topic" onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setTyping(false) }} onBlur={() => setTyping(false)} />
          : <button className="sow-ds__topicbtn" aria-label="Edit topic" onClick={() => setTyping(true)}>{topic || 'Add a topic'} <i aria-hidden>{GLYPH.edit}</i></button>}</div>}
      {mode === 'new' && <>
        <p className="sow-ds__note">{kind ? `${kind} · ` : ''}Your next class day is picked for you</p>
        <div className="sow-ds__strip" role="listbox" aria-label="Next class days">{suggest.map((x, i) => { const d = chipDay(x); return <button key={x} role="option" aria-selected={x === date} className={`sow-ds__chip${x === date ? ' on' : ''}`} aria-label={`${d.dow} ${d.dm}`} onClick={() => setDate(x)}><small>{i === 0 ? 'Next class' : d.dow}</small><b>{d.dm}</b></button> })}</div></>}
      {mode !== 'pick' && <>
        <Wheels value={date} onChange={setDate} today={today} />
        {clash ? <p className="sow-ds__clash" role="status">{kind || 'This'} already has {short(date)}. Pick another day.</p>
          : mode === 'new' ? <p className="sow-ds__note">Same day is fine with a different label</p> : null}
        <div className="sow-ds__btns"><button className="sow-ds__cancel" onClick={() => (start === 'pick' ? setMode('pick') : onClose())}>Cancel</button>
          <button className="sow-ds__go" disabled={!changed || clash} onClick={go}>{act}</button></div></>}
    </div></>)
}
