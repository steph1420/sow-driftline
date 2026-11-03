// Ported from /sow/ src/lib/keyboard.ts (gridMove, isTypingTarget).
export function gridMove(key: string, row: number, col: number, nRows: number, nCols: number): [number, number] | null {
  const r = (x: number) => Math.max(0, Math.min(nRows - 1, x)); const c = (x: number) => Math.max(0, Math.min(nCols - 1, x))
  switch (key) {
    case 'ArrowDown': return [r(row + 1), col]
    case 'ArrowUp': return [r(row - 1), col]
    case 'ArrowRight': return [row, c(col + 1)]
    case 'ArrowLeft': return [row, c(col - 1)]
    case 'Home': return [0, col]
    case 'End': return [nRows - 1, col]
    case 'PageDown': return [r(row + 10), col]
    case 'PageUp': return [r(row - 10), col]
    default: return null
  }
}
const NON_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false; const h = el as HTMLElement
  if (h.isContentEditable) return true
  const t = String(el.tagName || '').toUpperCase(); if (t === 'TEXTAREA' || t === 'SELECT') return true
  return t === 'INPUT' && !NON_TEXT.has(((el as HTMLInputElement).type || 'text').toLowerCase())
}
export const isMod = (e: { metaKey: boolean; ctrlKey: boolean }) => e.metaKey || e.ctrlKey
