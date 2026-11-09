// Bottom sheet shell: scrim, dialog and a grab handle that closes on tap or a downward drag. One place for every sheet.
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { CONFIG } from '../config'

/** `pull`: px a finger has pulled the sheet up so far (it follows the finger); undefined once it is open. */
type Props = { label: string; onClose: () => void; className?: string; scrimLabel?: string; pull?: number; children: ReactNode }

export function Sheet({ label, onClose, className = '', scrimLabel, pull, children }: Props) {
  const y0 = useRef<number | null>(null)
  return (<>
    <button className={`sow-scrim${pull != null ? ' is-pulling' : ''}`} aria-label={scrimLabel ?? `Close ${label.toLowerCase()}`} onClick={onClose} />
    <div className={`sow-sheet ${className}${pull != null ? ' is-pulling' : ''}`.trim()} role="dialog" aria-label={label}
      style={pull != null ? ({ '--sow-pull': `${pull}px` } as CSSProperties) : undefined}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={onClose}
        onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }}
        onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; onClose() } }}
        onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>
      {children}
    </div>
  </>)
}
