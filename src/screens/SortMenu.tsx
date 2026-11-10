// beta.13 (t230u, variant A): press-and-hold the table header's # or Names opens this compact menu under the finger:
// A–Z, Roll, Pending, each with ↑ ↓; the current one is ticked and its arrow lit. A row picks that option (its own
// direction), an arrow picks the option with that direction. Moment "hold" (the same grow-in as the card menu).
import { useApp } from '../store/store'
import { ARROW, SORTS, pickSort, type SortDir } from '../data/sortNames'
import { MenuShell, useEscape } from './CardMenu'

type Props = { at: DOMRect; onClose: () => void }
const DIRS: SortDir[] = ['asc', 'desc']
const SAY: Record<SortDir, string> = { asc: 'ascending', desc: 'descending' }
export function SortMenu({ at, onClose }: Props) {
  useEscape(onClose)
  const s = useApp((x) => x.nameSort); const set = useApp((x) => x.setNameSort)
  const left = Math.max(0, Math.min(at.left, window.innerWidth * 0.4))
  const origin = `${at.left + at.width / 2 - left}px top`
  return (<MenuShell name="Sort names" className="sow-cardmenu--sort" style={{ top: at.bottom, left }} origin={origin} head="Sort names" onClose={onClose}>
    {SORTS.map((o) => { const cur = s.by === o.id
      return <div key={o.id} className={`dl-row sow-sortm__row${cur ? ' is-on' : ''}`}>
        <button role="menuitemradio" aria-checked={cur} className="sow-sortm__pick" onClick={() => { set(pickSort(s, o.id)); onClose() }}>{o.label}</button>
        {cur && <span className="sow-set__check" aria-hidden>✓</span>}
        {DIRS.map((d) => <button key={d} role="menuitemradio" aria-checked={cur && s.dirs[o.id] === d} aria-label={`${o.label} ${SAY[d]}`}
          className={`sow-sortm__dir${cur && s.dirs[o.id] === d ? ' is-on' : ''}`} onClick={() => { set(pickSort(s, o.id, d)); onClose() }}>{ARROW[d]}</button>)}
      </div> })}
  </MenuShell>)
}
