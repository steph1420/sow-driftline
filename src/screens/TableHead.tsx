// RDs2 table header (A5 track-list): column-aligned '#', 'Names 🔍' (tap anywhere on it to search in place) and one
// 56 px header per date: the date in the chosen format over its count or topic. Tap a date for the date sheet
// (Month | Date | Day). The primary date is the rightmost column; on the phone the second (earlier) date is a drawer
// to its left: a left swipe on a date header or the 3 px right-edge grip opens it; a right swipe or the grip closes it.
import { motion } from 'framer-motion'
import { useMoment } from '../ui/useMotionOn'
import { useRef } from 'react'
import { useApp } from '../store/store'
import { dateLabel } from '../data/model'
import { fmtDate } from '../data/dateFormat'
import { swipeDir } from '../data/gestures'
import { GLYPH, Icon } from '../ui/icons'
import { RollNumber } from '../ui/RollNumber'

export type HeadCol = { sessionId: string; date: string; kind: string; topic: string; done: number; total: number; past: boolean; sel: boolean; second: boolean; week: boolean }
type Props = { cols: HeadCol[]; label: string; count: number; matches: number; onFind: (q: string) => void; onDate: (sessionId: string) => void; drawer?: { open: boolean; set: (open: boolean) => void } }

export function TableHead({ cols, label, count, matches, onFind, onDate, drawer }: Props) {
  const sm = useMoment('search'); const find = useApp((s) => s.find); const setFind = useApp((s) => s.setFind); const fmt = useApp((s) => s.view.dateFmt); const subtext = useApp((s) => s.view.dateSub)
  const sw = useRef<{ x: number; y: number } | null>(null); const swiped = useRef(false)
  const swipe = drawer && { // on a date header: left = open the second date, right = close it
    onPointerDown: (e: React.PointerEvent) => { sw.current = { x: e.clientX, y: e.clientY }; swiped.current = false },
    onPointerUp: (e: React.PointerEvent) => { const p = sw.current; sw.current = null; if (!p) return; const d = swipeDir(e.clientX - p.x, e.clientY - p.y)
      if (d) { swiped.current = true; drawer.set(d === 'left') } } }
  return (
    <thead><tr>
      <th className="r" scope="col" aria-label="Roll">#</th>
      <th className="n" scope="col">{find == null
        ? <button className="sow-th__names" aria-label="Search names" onClick={() => setFind('')}><span>{label}</span><Icon name="magnifier" /></button>
        : <motion.div className="sow-th__find" role="search" initial={sm.on ? { opacity: 0, scaleX: 0.6 } : false} animate={{ opacity: 1, scaleX: 1 }} style={{ originX: 0 }} transition={sm.spring('snappy')}><Icon name="magnifier" />
            <input type="search" autoFocus aria-label="Find a name" value={find} placeholder="Name or roll" onChange={(e) => onFind(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); setFind(null) } }} />
            {find.trim() && <span className="sow-th__n dl-num">{matches} of {count}</span>}
            <button className="sow-ib sow-bare" aria-label="Close search" onClick={() => setFind(null)}>{GLYPH.close}</button></motion.div>}</th>
      {cols.map((c, i) => { const sub = subtext === 'topic' ? c.topic || '—' : <RollNumber value={c.done} suffix={`/${c.total}`} /> // anim/proto: the count rolls
        const tone = c.done === c.total ? ' full' : c.past ? ' old' : ''
        return <th key={c.sessionId} scope="col" className={`d${c.sel ? ' sel' : ''}${c.second ? ' c2' : ''}${c.week ? ' wk' : ''}`}>
          <button className={`sow-th__date${tone}`} aria-label={`Dates, ${[c.kind, dateLabel(c.date)].filter(Boolean).join(' ')}`} aria-description={`${c.done} of ${c.total} done${c.topic ? `, ${c.topic}` : ''}`}
            {...(swipe || undefined)} onClick={() => { if (swiped.current) { swiped.current = false; return } onDate(c.sessionId) }}>
            <b>{fmtDate(c.date, fmt)}</b><small className={subtext}>{sub}</small></button>
          {drawer && i === cols.length - 1 && <button className={`sow-grip${drawer.open ? ' is-open' : ''}`} aria-expanded={drawer.open} aria-label={drawer.open ? 'Close the second date' : 'Open a second date'} onClick={() => drawer.set(!drawer.open)}><i /></button>}
        </th> })}
    </tr></thead>)
}
