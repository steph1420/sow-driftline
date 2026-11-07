// v0.7f/g wheels: Month | Date | Day, year pill (F-DT-02/03). Every wheel spins (wheel, drag, arrow keys); tapping a value off centre snaps it in.
import { useRef, useState } from 'react'
import { GLYPH } from '../ui/icons'
import { dowOf, setYear, spinDate, spinDay, spinMonth } from '../data/dial'
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STEP_PX = 36
type Col = { name: string; at: (k: number) => string; spin: (k: number) => string }
export function Wheels({ value, onChange, today }: { value: string; onChange: (iso: string) => void; today: string }) {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]; const w = dowOf(value)
  const [years, setYears] = useState(false)
  const cols: Col[] = [
    { name: 'Month', at: (k) => MON[(((m - 1 + k) % 12) + 12) % 12]!, spin: (k) => spinMonth(value, k) },
    { name: 'Date', at: (k) => String(+spinDate(value, k).slice(8)), spin: (k) => spinDate(value, k) },
    { name: 'Day', at: (k) => DOW[(((w + k) % 7) + 7) % 7]!, spin: (k) => spinDay(value, (((w + k) % 7) + 7) % 7) },
  ]
  const ty = +today.slice(0, 4)
  return (
    <div className="sow-wh" role="group" aria-label="Pick the date">
      <div className="sow-wh__top"><button className={`sow-wh__year${y !== ty ? ' on' : ''}`} aria-label={`Year ${y}`} aria-expanded={years} onClick={() => setYears(!years)}>{y} {GLYPH.down}</button></div>
      <div className="sow-wh__heads">{cols.map((c) => <span key={c.name}>{c.name}</span>)}</div>
      {years && <div className="sow-wh__years" role="listbox" aria-label="Year">{[ty - 1, ty, ty + 1].map((yy) => <button key={yy} role="option" aria-selected={yy === y} className={yy === y ? 'on' : ''} onClick={() => { onChange(setYear(value, yy)); setYears(false) }}>{yy}</button>)}</div>}
      <div className="sow-wh__band" aria-hidden />
      <div className="sow-wh__cols">{cols.map((c) => <Wheel key={c.name} col={c} onChange={onChange} />)}</div>
    </div>)
}
function Wheel({ col, onChange }: { col: Col; onChange: (iso: string) => void }) {
  const y0 = useRef<number | null>(null); const acc = useRef(0)
  const step = (k: number) => { if (k) onChange(col.spin(k)) }
  return (
    <div className="sow-wh__col" role="spinbutton" tabIndex={0} aria-label={col.name} aria-valuetext={col.at(0)}
      onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) } if (e.key === 'ArrowDown') { e.preventDefault(); step(1) } }}
      onWheel={(e) => { acc.current += e.deltaY; const k = Math.trunc(acc.current / STEP_PX); if (k) { acc.current -= k * STEP_PX; step(k) } }}
      onPointerDown={(e) => { y0.current = e.clientY }} onPointerMove={(e) => { if (y0.current == null) return; const k = Math.trunc((y0.current - e.clientY) / STEP_PX); if (k) { y0.current -= k * STEP_PX; step(k) } }}
      onPointerUp={() => { y0.current = null }} onPointerCancel={() => { y0.current = null }}>
      {[-1, 0, 1].map((k) => <button key={k} tabIndex={-1} className={`sow-wh__v${k === 0 ? ' on' : ''}`} aria-label={k === 0 ? undefined : `${col.name} ${col.at(k)}`} onClick={() => step(k)}>{col.at(k)}</button>)}
    </div>)
}
