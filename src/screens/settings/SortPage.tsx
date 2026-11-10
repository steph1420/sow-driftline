// beta.13 (t230u): Settings › Sort names. A–Z, Roll, Pending, each with its own ↑ / ↓ toggle; the current one is ticked.
import { useApp } from '../../store/store'
import { ARROW, SORTS, pickSort, type SortDir } from '../../data/sortNames'

const DIRS: SortDir[] = ['asc', 'desc']
const SAY: Record<SortDir, string> = { asc: 'ascending', desc: 'descending' }
export function SortPage() {
  const s = useApp((x) => x.nameSort); const set = useApp((x) => x.setNameSort)
  return (<>
    <section className="sow-set__group"><h2 className="dl-eyebrow sow-set__eyebrow">Sort by</h2><div className="dl-list" role="radiogroup" aria-label="Sort by">{SORTS.map((o) => { const cur = s.by === o.id
      return <div key={o.id} className="dl-row sow-set__row sow-sort__row">
        <button role="radio" aria-checked={cur} aria-label={`${o.label}, ${o.note}`} className="sow-sort__pick" onClick={() => set(pickSort(s, o.id))}>
          <span className="sow-set__txt"><span>{o.label}</span><small className="dl-muted">{o.note}</small></span></button>
        <div className="dl-seg" role="group" aria-label={`${o.label} direction`}>{DIRS.map((d) => <button key={d} className={`dl-seg__item${s.dirs[o.id] === d ? ' is-on' : ''}`} aria-pressed={s.dirs[o.id] === d} aria-label={`${o.label} ${SAY[d]}`}
          onClick={() => set(pickSort(s, o.id, d))}>{s.dirs[o.id] === d && <span className="dl-seg__pill" />}<span className="dl-seg__label">{ARROW[d]}</span></button>)}</div>
        <span className="sow-sort__tick" aria-hidden>{cur ? '✓' : ''}</span>
      </div> })}</div></section>
    <p className="dl-muted sow-note sow-sort__note">The list follows this order. Press and hold # or Names on the checklist to change it there too.</p>
  </>)
}
