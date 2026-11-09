// RDs2 top bar (t140u, portrait kept clean): class chip on the left; Undo, then the shortcuts button on the right.
// No sync dot (sync is automatic; Settings › Sync shows its state).
import { useEffect, useState } from 'react'
import { useApp } from '../store/store'
import { scopeSubjects, validPick } from '../data/scope'
import type { UndoIntent } from '../data/gestures'
import { CONFIG } from '../config'
import { ClassChip } from './ClassChip'
import { ClassesPanel } from './ClassesPanel'
import { FavPicker } from './FavPicker'
import { REDO_HINT, UndoButton, UndoOverlay } from './UndoButton'
import { Shortcuts } from './Shortcuts'

type Open = 'classes' | 'favs' | null
/** `columns`: the 1/2 shortcut only where the phone shows one or two dates (upright). */
export function Bar({ columns }: { columns: boolean }) {
  const viewing = useApp((s) => s.viewing); const data = useApp((s) => s.data); const scope = useApp((s) => s.scope); const favs = useApp((s) => s.favs); const subject = useApp((s) => s.subject)
  const [open, setOpen] = useState<Open>(null); const [mini, setMini] = useState(false); const [lists, setLists] = useState(false)
  const [intent, setIntent] = useState<UndoIntent | null>(null); const [hint, setHint] = useState(false)
  useEffect(() => { if (!hint) return; const t = setTimeout(() => setHint(false), CONFIG.timing.nameToastMs); return () => clearTimeout(t) }, [hint])
  const keys = scopeSubjects(data, validPick(data, scope), favs).map((x) => x.subjectKey)
  const close = () => setOpen(null)
  return (
    <header className="sow-bar">
      <ClassChip open={open === 'classes'} scope={{ count: keys.length, index: keys.indexOf(subject) }} onTap={() => setOpen(open === 'classes' ? null : 'classes')} onHold={() => setOpen('favs')} />
      {intent && <UndoOverlay intent={intent} />}
      <span className="sow-sp" />
      {!viewing && <UndoButton intent={intent} onIntent={setIntent} onAct={close} onFirstUndo={() => { setHint(true); useApp.getState().dismissHint(REDO_HINT) }} />}
      <Shortcuts columns={columns} onOpen={close} />
      {open === 'classes' && <ClassesPanel mini={mini} onMini={setMini} lists={lists} onLists={setLists} onClose={close} />}
      {open === 'favs' && <FavPicker onClose={close} />}
      {hint && !intent && <div className="sow-peek" role="status"><span>Hold or swipe down to redo</span></div>}
    </header>)
}
