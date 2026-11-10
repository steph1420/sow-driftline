// Dev sizer build entry. main.tsx calls install() only when VITE_DL_SIZER=1, before the app renders; Beta/Stable never load this chunk.
import { createRoot } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'
import { Sizer } from './Sizer'
import { apply, load } from './groups'
import './sizer.css'

export function install() {
  // No decorative motion: framer jumps to end states, useReducedMotion() and CSS see "reduce", CSS transitions are instant (sizer.css).
  MotionGlobalConfig.skipAnimations = true
  const mm = window.matchMedia.bind(window)
  window.matchMedia = (q: string) => (/prefers-reduced-motion:\s*reduce/.test(q) ? { ...mm(q), matches: true, media: q } as MediaQueryList : mm(q))
  document.documentElement.classList.add('sow-sizer-build')
  apply(load(localStorage), document.documentElement.style)
  const host = document.createElement('div'); host.id = 'sow-sizer'; document.body.appendChild(host)
  createRoot(host).render(<Sizer />)
}
