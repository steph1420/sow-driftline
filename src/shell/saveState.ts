// The save dot (bar chip, Settings › Sync): one quiet label per state, no save chatter (t173u/t174u).
import { sheetLabel, type useApp } from '../store/store'
type S = Pick<ReturnType<typeof useApp.getState>, 'status' | 'source' | 'save' | 'waiting'>
export const saveLabel = (s: S) => s.status === 'error' ? 'Could not refresh'
  : s.source === 'copy' ? { saved: `All saved to the ${sheetLabel()}`, saving: 'Saving…', offline: `Offline, ${s.waiting} waiting`, error: `Not saved yet, ${s.waiting} waiting`, demo: '' }[s.save]
  : 'Demo, saved on this device'
/** CSS modifier for `.sow-dot`. */
export const saveTone = (s: S) => (s.source === 'copy' ? s.save : '')
