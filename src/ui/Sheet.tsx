// Bottom sheet shell: scrim, dialog and a grab handle that closes on tap or a downward drag. One place for every sheet.
import { useRef, type ReactNode } from 'react'
import { CONFIG } from '../config'

type Props = { label: string; onClose: () => void; className?: string; scrimLabel?: string; children: ReactNode }

export function Sheet({ label, onClose, className = '', scrimLabel, children }: Props) {
  const y0 = useRef<number | null>(null)
  return (<>
    <button className="sow-scrim" aria-label={scrimLabel ?? `Close ${label.toLowerCase()}`} onClick={onClose} />
    <div className={`sow-sheet ${className}`.trim()} role="dialog" aria-label={label}>
      <button className="sow-sheet__handle" aria-label="Close (swipe down)" onClick={onClose}
        onPointerDown={(e) => { y0.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }}
        onPointerMove={(e) => { if (y0.current != null && e.clientY - y0.current > CONFIG.timing.sheetOpenDragPx) { y0.current = null; onClose() } }}
        onPointerUp={() => { y0.current = null }}><span className="sow-sheet__grip" /></button>
      {children}
    </div>
  </>)
}
