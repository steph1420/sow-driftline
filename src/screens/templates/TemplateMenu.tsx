// F-TP-07: the ⋯ menu of one template. Delete takes two taps; the last template can't be deleted.
import { useEffect, useState } from 'react'
import { GLYPH } from '../../ui/icons'

type Actions = { rename: () => void; duplicate: () => void; setDefault: () => void; left: () => void; right: () => void; remove: () => void; restore: () => void }
type Props = { canDelete: boolean; isDefault: boolean; first: boolean; last: boolean; on: Actions }

export function TemplateMenu({ canDelete, isDefault, first, last, on }: Props) {
  const [open, setOpen] = useState(false); const [sure, setSure] = useState(false)
  useEffect(() => { if (!open) setSure(false) }, [open])
  const item = (label: string, act: () => void, disabled = false) =>
    <button role="menuitem" className="dl-row dl-row--btn" disabled={disabled} onClick={() => { setOpen(false); act() }}>{label}</button>
  return (<div className="sow-tpl__menuwrap">
    <button className="sow-ib sow-bare" aria-label="Template options" aria-expanded={open} onClick={() => setOpen(!open)}>{GLYPH.moreDots}</button>
    {open && <div className="dl-card sow-menu sow-menu--end" role="menu" aria-label="Template options">
      {item('Rename', on.rename)}{item('Duplicate', on.duplicate)}{item('Set default', on.setDefault, isDefault)}
      {item('Move left', on.left, first)}{item('Move right', on.right, last)}
      <button role="menuitem" className="dl-row dl-row--btn sow-tpl__delete" disabled={!canDelete} onClick={() => { if (sure) { setOpen(false); on.remove() } else setSure(true) }}>{sure ? 'Tap again to delete' : 'Delete'}</button>
      {item('Restore default templates', on.restore)}
    </div>}
  </div>)
}
