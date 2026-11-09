// RDs2: holding the class chip opens the favourites picker — the starred subjects, one tap to switch.
import { useApp } from '../store/store'
import { classLabel } from '../data/model'
import { scopeSubjects } from '../data/scope'

export function FavPicker({ onClose }: { onClose: () => void }) {
  const s = useApp(); const favs = scopeSubjects(s.data, { kind: 'fav' }, s.favs)
  return (<>
    <button className="sow-scrim sow-scrim--clear" aria-label="Close favourites" onClick={onClose} />
    <div className="sow-fav" role="dialog" aria-label="Favourites">
      <h2 className="dl-eyebrow sow-fav__head">Favourites</h2>
      {favs.length ? favs.map((x) => { const on = x.subjectKey === s.subject
        return <button key={x.subjectKey} className={`sow-fav__row${on ? ' is-on' : ''}`} aria-current={on || undefined} onClick={() => { s.setSubject(x.subjectKey); onClose() }}>
          <b>{classLabel(x.classKey)}</b><span>{x.subject} {x.kind}</span></button> })
        : <p className="sow-fav__empty">No favourites yet. Tap the chip, then ☆ a subject.</p>}
    </div>
  </>)
}
