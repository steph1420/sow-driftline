// RDs2 Undo, way 2 (undo-v2). Tap = undo. Press and slide down: the icon flips in place (rotateX) to Redo and release
// redoes; slide back up flips to Undo and release undoes; a quick flick down redoes; slide left = Cancel (release does
// nothing). While the finger is down the label over the class chip names what release will do.
import { motion } from 'framer-motion'
import { useMotion } from '../ui/useMotionOn'
import { useApp } from '../store/store'
import { undoIntent, type UndoIntent } from '../data/gestures'
import { Icon } from '../ui/icons'
import { usePress } from '../ui/usePress'
import { buzz } from './haptics'

export const REDO_HINT = 'redo'
type Props = { intent: UndoIntent | null; onIntent: (i: UndoIntent | null) => void; onAct: () => void; onFirstUndo: () => void }

export function UndoButton({ intent, onIntent, onAct, onFirstUndo }: Props) {
  const canUndo = useApp((s) => s.canUndo); const canRedo = useApp((s) => s.canRedo); const mk = useMotion()
  const act = (i: UndoIntent) => { const s = useApp.getState(); onAct()
    if (i === 'redo' && s.canRedo) { s.redo(); buzz(s.haptics) }
    else if (i === 'undo' && s.canUndo) { s.undo(); if (!s.hints.includes(REDO_HINT)) onFirstUndo() } }
  const follow = (dx: number, dy: number) => { const next = undoIntent(dx, dy); if (next !== intent) { if (intent) buzz(useApp.getState().haptics); onIntent(next) } }
  const press = usePress({
    onTap: () => act('undo'),
    onHold: () => { onAct(); onIntent('undo') },
    onDrag: ({ dx, dy }) => follow(dx, dy),
    onRelease: ({ dx, dy }) => { onIntent(null); act(undoIntent(dx, dy)) },
    onCancel: () => onIntent(null),
  })
  const flip = intent === 'redo' ? 180 : 0
  return (
    <button className={`sow-ib sow-undo${intent ? ` is-${intent}` : ''}`} disabled={!canUndo && !canRedo}
      aria-label="Undo" aria-description="Hold or slide down to redo" {...press}>
      <motion.span className="sow-undo__flip" initial={false} animate={{ rotateX: flip }} transition={mk.spring('undo')}>
        <span className="sow-undo__face" aria-hidden><Icon name="undo" /></span>
        <span className="sow-undo__face sow-undo__face--back" aria-hidden><Icon name="redo" /></span>
      </motion.span>
    </button>)
}

const WORDS: Record<UndoIntent, [string, string]> = { undo: ['Undo', 'Slide left to cancel'], redo: ['Redo', 'Slide left to cancel'], cancel: ['Cancel', 'Release to do nothing'] }
/** The label over the class chip while the Undo button is held. */
export function UndoOverlay({ intent }: { intent: UndoIntent }) {
  const can = useApp((s) => (intent === 'redo' ? s.canRedo : intent === 'undo' ? s.canUndo : true))
  const [label, sub] = WORDS[intent]
  return <div className={`sow-act is-${intent}${can ? '' : ' is-off'}`} role="status" aria-live="polite"><b>{label}</b><span>{can ? sub : `Nothing to ${label.toLowerCase()}`}</span></div>
}
