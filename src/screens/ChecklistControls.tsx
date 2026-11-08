import { useApp } from '../store/store'
import { GLYPH } from '../ui/icons'
import type { Layout } from '../data/model'

/** v0.8 F-SH-01 (G5d): second row under the bar: Pending · 1|2 (phone) · bare undo/redo (`history` false in a past year, F-DT-08). */
export function ChecklistControls({ layout, history }: { layout: Layout; history: boolean }) {
  const pending = useApp((s) => s.pending); const cols = useApp((s) => s.view.phoneCols)
  const canUndo = useApp((s) => s.canUndo); const canRedo = useApp((s) => s.canRedo)
  const { setPending, setView, undo, redo } = useApp.getState()
  return (
    <div className="sow-ctl" role="toolbar" aria-label="Checklist controls">
      <button className={`dl-chip dl-chip--btn dl-tone--accent sow-chip sow-pend${pending ? ' on' : ''}`} aria-label="Pending only" aria-pressed={pending} onClick={() => setPending(!pending)}>Pending</button>
      {layout === 'phone' && <div className="sow-seg" role="group" aria-label="Dates on phone">
        {([1, 2] as const).map((n) => <button key={n} className={n === cols ? 'on' : ''} aria-label={`${n} date${n > 1 ? 's' : ''}`} aria-pressed={n === cols} onClick={() => setView({ phoneCols: n })}>{n}</button>)}</div>}
      <span className="sow-sp" />
      {history && <>
        <button className="sow-ib sow-bare" aria-label="Undo" disabled={!canUndo} onClick={undo}>{GLYPH.undo}</button>
        <button className="sow-ib sow-bare" aria-label="Redo" disabled={!canRedo} onClick={redo}>{GLYPH.redo}</button></>}
    </div>
  )
}
