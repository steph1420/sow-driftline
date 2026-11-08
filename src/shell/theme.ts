// F-SH-03 / F-ST-02: Night | Day | Auto plus Contrast Standard | High → one Driftline theme name.
import type { Contrast, Side } from '../store/store'
export const themeFor = (side: Side, contrast: Contrast, prefersLight: boolean) =>
  `${contrast === 'high' ? 'contrast' : 'utopian'}-${side === 'system' ? (prefersLight ? 'day' : 'night') : side}`
