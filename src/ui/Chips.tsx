// beta.9 (t221u): moment "chips": the selected chip's fill is a blob that slides to the newly picked chip (one blob per
// group, so the class and type filters each keep theirs). At rest the chip looks exactly as before.
import { LayoutGroup, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMoment } from './useMotionOn'

export function ChipGroup({ id, children }: { id: string; children: ReactNode }) { return <LayoutGroup id={id}>{children}</LayoutGroup> }
type Props = { label: ReactNode; on: boolean; onClick: () => void; aria?: string; moment?: 'chips' | 'sharepills'; className?: string; children?: ReactNode }
export function Chip({ label, on, onClick, aria, moment = 'chips', className = '', children }: Props) {
  const mk = useMoment(moment)
  return <button className={`sow-fchip${on ? ' on' : ''}${mk.on ? ' sow-fchip--blob' : ''} ${className}`.trim()} aria-pressed={on} aria-label={aria} onClick={onClick}>
    {on && mk.on && <motion.span layoutId="blob" className="sow-fchip__blob" aria-hidden transition={mk.spring('snappy')} />}
    <span className="sow-fchip__txt">{label}</span>{children}</button>
}
