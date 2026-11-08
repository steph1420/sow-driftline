// The date sheet, opened from a column's date chip (v0.8 F-DT-01, dial3): it opens straight on Reschedule with the dials showing.
// Strip of this class's existing dates (F-DT-04: tap = open it, no data change; off once something has changed),
// Reschedule (S7, F-DT-01..06: wheels, year, topic, live dashed chip, button dim until a change, collision note, Cancel)
// and ＋ New date at the end of the strip (S8, F-OV-05: next class day picked, no duplicate on the same day).
import { useEffect, useRef, useState } from 'react'
import { GLYPH } from '../ui/icons'
import { useApp } from '../store/store'
import { collides, nextClassDays } from '../data/edits'
import { Wheels } from './Wheels'
import { Sheet } from '../ui/Sheet'
const chipDay = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dm: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } }
const short = (iso: string) => { const d = chipDay(iso); return `${d.dow} ${d.dm}` }
const long = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '')
export type DateCol = { sessionId: string; date: string; kind: string; topic: string }
type Mode = 'edit' | 'new'
type Props = { columns: DateCol[]; current: string; today: string; onPick: (sessionId: string) => void; onClose: () => void; subjectKey?: string; kind?: string; ticks?: number; onDone?: (msg: string) => void; start?: Mode }
export function DateSheet({ columns, current, today, onPick, onClose, subjectKey = '', kind = '', ticks = 0, onDone, start = 'edit' }: Props) {
  const strip = useRef<HTMLDivElement | null>(null)
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
  return (
    <Sheet label={mode === 'edit' ? 'Reschedule' : 'New date'} scrimLabel="Close dates" onClose={onClose} className="sow-ds editing">
      <div className="sow-wp__head"><h2 className="sow-wp__title">{mode === 'edit' ? 'Reschedule' : 'New date'}</h2><button className="sow-x" aria-label="Close" onClick={onClose}>{GLYPH.close}</button></div>
      {mode === 'edit' && <div className="sow-ds__strip" ref={strip}><div className="sow-ds__opts" role="listbox" aria-label="Existing dates">
        {columns.map((c) => { const on = c.sessionId === current; const shown = on ? date : c.date; const d = chipDay(shown)
          return <button key={c.sessionId} role="option" aria-selected={on} aria-current={on} className={`sow-ds__chip${on ? ' on' : ''}${on && moved ? ' live' : ''}${shown < today ? ' old' : ''}`} aria-label={`${c.kind} ${d.dow} ${d.dm}${shown === today ? ', today' : ''}`}
            onClick={() => { if (on || changed) return; onPick(c.sessionId); onClose() }}>
            <small>{shown === today ? `${c.kind} · Today` : `${c.kind} · ${d.dow}`}</small><b>{d.dm}</b></button> })}</div>
        <button className="sow-ds__chip sow-ds__new" aria-label="New date" onClick={() => open('new')}><small>{kind || 'Date'}</small><b>＋ New</b></button>
      </div>}
      {mode === 'edit' && <div className="sow-ds__line">
        <span>{ticks} {ticks === 1 ? 'tick' : 'ticks'} · </span>
        {typing ? <input className="sow-ds__topic" aria-label="Topic" autoFocus value={topic} placeholder="Add a topic" onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setTyping(false) }} onBlur={() => setTyping(false)} />
          : <button className="sow-ds__topicbtn" aria-label="Edit topic" onClick={() => setTyping(true)}>{topic || 'Add a topic'} <i aria-hidden>{GLYPH.edit}</i></button>}</div>}
      {mode === 'new' && <>
        <p className="sow-ds__note">{kind ? `${kind} · ` : ''}Your next class day is picked for you</p>
        <div className="sow-ds__strip" role="listbox" aria-label="Next class days">{suggest.map((x, i) => { const d = chipDay(x); return <button key={x} role="option" aria-selected={x === date} className={`sow-ds__chip${x === date ? ' on' : ''}`} aria-label={`${d.dow} ${d.dm}`} onClick={() => setDate(x)}><small>{i === 0 ? 'Next class' : d.dow}</small><b>{d.dm}</b></button> })}</div></>}
      <Wheels value={date} onChange={setDate} today={today} />
      {clash ? <p className="sow-ds__clash" role="status">{kind || 'This'} already has {short(date)}. Pick another day.</p>
        : mode === 'new' ? <p className="sow-ds__note">Same day is fine with a different label</p> : null}
      <div className="sow-ds__btns"><button className="sow-ds__cancel" onClick={() => (mode === 'new' && start === 'edit' ? open('edit') : onClose())}>Cancel</button>
        <button className="sow-ds__go" disabled={!changed || clash} onClick={go}>{act}</button></div>
    </Sheet>)
}
