// RDs2 Classes panel (v7, music-player style). Left strip: CLASSES with a collapse toggle, then All, Fav, each class
// and a collapsible LISTS section. Right: the pick's subjects with today's count and a favourite star. The left pick is
// the chip's swipe scope; the loop toggle (top right) lets that swipe wrap round.
import { useMemo } from 'react'
import { useBackLayer } from '../ui/useBackLayer'
import { useApp } from '../store/store'
import { classLabel, focusColumn, toChecklist, toGo } from '../data/model'
import { samePick, scopeSubjects, validPick, type ScopePick } from '../data/scope'
import { todayIso } from '../data/today'
import { GLYPH, Icon } from '../ui/icons'

type Props = { mini: boolean; onMini: (b: boolean) => void; lists: boolean; onLists: (b: boolean) => void; onClose: () => void }

/** "18/24" on the subject's date for today (today → next → last), or a dash when it has no dates. */
function useCounts(keys: string[]) {
  const data = useApp((s) => s.data)
  return useMemo(() => new Map(keys.map((k) => {
    const sub = data.subjects.find((x) => x.subjectKey === k)!; const c = toChecklist(data, sub.classKey, k); const a = focusColumn(c, todayIso(), null)
    const col = c.columns[a.index]; return [k, col ? { done: c.pupils.length - toGo(c, col.sessionId), total: c.pupils.length } : null] as const
  })), [data, keys.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function ClassesPanel({ mini, onMini, lists, onLists, onClose }: Props) {
  const s = useApp(); const pick = validPick(s.data, s.scope); useBackLayer(true, onClose) // beta.11 (t229u)
  const shown = scopeSubjects(s.data, pick, s.favs); const counts = useCounts(shown.map((x) => x.subjectKey))
  const all = scopeSubjects(s.data, { kind: 'all' }, s.favs)
  const picks: { pick: ScopePick; label: string; n: number; icon?: 'lines' | 'starOn' }[] = [
    { pick: { kind: 'all' }, label: 'All', n: all.length, icon: 'lines' }, { pick: { kind: 'fav' }, label: 'Fav', n: all.filter((x) => s.favs.includes(x.subjectKey)).length, icon: 'starOn' },
    ...s.classes.map((c) => ({ pick: { kind: 'class', classKey: c.classKey } as ScopePick, label: c.label, n: all.filter((x) => x.classKey === c.classKey).length }))]
  const item = (p: (typeof picks)[number]) => { const on = samePick(p.pick, pick)
    return <button key={p.label} className={`sow-li${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={`${p.label}, ${p.n} subjects`} onClick={() => s.setScope(p.pick)}>
      {!mini && p.icon && <span className={p.icon === 'starOn' ? 'sow-li__fav' : undefined} aria-hidden><Icon name={p.icon} /></span>}<span className="sow-li__t">{p.label}</span>
      {!mini && <span className="sow-li__n">{p.n}</span>}</button> }
  return (<>
    <button className="sow-scrim sow-scrim--clear" aria-label="Close classes" onClick={onClose} />
    <div className="sow-cp" role="dialog" aria-label="Classes">
      <div className={`sow-cp__grid${mini ? ' is-mini' : ''}`}>
        <nav className="sow-cp__side" aria-label="Pick">
          <div className="dl-eyebrow sow-cp__head">{!mini && <span>Classes</span>}
            <button className="sow-ib sow-bare sow-cp__toggle" aria-label={mini ? 'Expand the classes strip' : 'Collapse the classes strip'} aria-expanded={!mini} onClick={() => onMini(!mini)}><Icon name="sidebar" /></button></div>
          {picks.slice(0, 2).map(item)}<span className="sow-cp__sep" />{picks.slice(2).map(item)}
          <span className="sow-cp__sep" />
          <button className="dl-eyebrow sow-cp__lists" aria-expanded={lists} onClick={() => onLists(!lists)}><span>Lists</span><i className={lists ? 'is-open' : undefined} aria-hidden>{lists ? GLYPH.down : GLYPH.next}</i></button>
          {lists && <button className="sow-li sow-li--add" disabled aria-label="New list (coming later)">{mini ? GLYPH.plus : `${GLYPH.plus} New list`}</button>}
        </nav>
        <div className="sow-cp__main">
          <button className={`sow-ib sow-cp__loop${s.loop ? ' is-on' : ''}`} aria-pressed={s.loop} aria-label="Loop: swiping the chip wraps round" onClick={() => s.setLoop(!s.loop)}><Icon name="loop" /></button>
          {shown.length ? <ul className="sow-cp__rows" role="list">{shown.map((x) => { const on = x.subjectKey === s.subject; const n = counts.get(x.subjectKey); const fav = s.favs.includes(x.subjectKey)
            const name = `${pick.kind === 'class' ? '' : `${classLabel(x.classKey)} · `}${x.subject} ${x.kind}`.trim()
            return <li key={x.subjectKey} className={`sow-cp__row${on ? ' is-on' : ''}`}>
              <button className="sow-cp__pick" aria-current={on || undefined} aria-label={`${name}${n ? `, ${n.done} of ${n.total} done` : ''}`} onClick={() => { s.setSubject(x.subjectKey); onClose() }}>
                <span className="sow-cp__name">{name}</span>{n && <span className={`sow-cp__det${n.done === n.total ? ' done' : ''}`}>{n.done}/{n.total}</span>}</button>
              <button className={`sow-cp__star${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={`Favourite ${name}`} onClick={() => s.toggleFav(x.subjectKey)}><Icon name={fav ? 'starOn' : 'star'} /></button></li> })}</ul>
            : <p className="sow-cp__empty">{pick.kind === 'fav' ? 'No favourites yet. Tap ☆ on a subject to add it.' : 'No subjects here yet.'}</p>}
        </div>
      </div>
      <button className="sow-cp__grab" aria-label="Close classes" onClick={onClose}><i /></button>
    </div>
  </>)
}
