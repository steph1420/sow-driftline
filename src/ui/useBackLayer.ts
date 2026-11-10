// beta.11 (t229u): the phone's back button goes back one step inside the app. Every open layer (a sheet, a menu, the
// hold menu, a panel, a Settings page, a pushed screen) adds one history entry; Back (popstate) closes the top layer
// only. A layer closed from the UI (✕, scrim, swipe, a pick) gives its entry back with history.back(), and the
// popstate that follows is skipped, so entries never pile up. Entries carry no URL; only their count matters, and
// a push waits until our own back has landed. With no layer open the
// browser's own Back applies (leave the page). The left-edge back swipe of a pushed page is a UI close like ✕.
import { useEffect, useRef } from 'react'

type Layer = { close: () => void }
const stack: Layer[] = [] // open layers, oldest first
let depth = 0 // our history entries above the page's own entry
let busy = false // waiting for the popstate of our own history.back()
let guard: ReturnType<typeof setTimeout> | undefined
let installed = false
const SETTLE_MS = 1000 // a back that never reports (it should) stops holding the queue after this

/** Bring the entry count to the number of open layers, one step at a time. A back is never mixed with a push: the
 * next step waits for its popstate, so a close and the next open (a menu pick opening a sheet) cannot cancel out. */
function sync() {
  if (busy || typeof history === 'undefined') return
  while (depth < stack.length) { history.pushState({ ...(history.state as object | null), sowLayer: depth + 1 }, ''); depth++ }
  if (depth > stack.length) { busy = true; guard = setTimeout(landed, SETTLE_MS); history.back() }
}
function landed() { clearTimeout(guard); busy = false; depth = Math.max(0, depth - 1); sync() }
function onPop(e: PopStateEvent) {
  if (busy) return landed() // our own history.back() after a UI close
  if (depth === 0) { // nothing of ours open; an entry left over from before a reload: keep going to the page's own
    if ((e.state as { sowLayer?: unknown } | null)?.sowLayer) history.back()
    return
  }
  depth--; const top = stack.pop(); top?.close(); sync() // the phone's Back: close the top layer only
}
function install() { if (installed || typeof window === 'undefined') return; installed = true; window.addEventListener('popstate', onPop) }

/** Open one layer (adds its history entry). The returned release is the UI close: it gives the entry back once. */
export function pushLayer(close: () => void): () => void {
  install(); const l: Layer = { close }; stack.push(l); sync()
  return () => { const i = stack.indexOf(l); if (i < 0) return; stack.splice(i, 1); sync() }
}
/** How many layers are open (tests, debugging). */
export const openLayers = () => stack.length
/** Tests only: forget every layer and our entry count (the history entries themselves stay). */
export function resetLayers() { stack.length = 0; depth = 0; busy = false; clearTimeout(guard) }

/** While `open`, the layer holds one history entry and the phone's Back calls `onBack` (the same as its ✕). */
export function useBackLayer(open: boolean, onBack: () => void) {
  const ref = useRef(onBack); ref.current = onBack
  useEffect(() => (open ? pushLayer(() => ref.current()) : undefined), [open])
}
