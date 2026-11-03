// One config module (06 rule 6). Every timing/layout number lives here; Developer options will override later.
export const CONFIG = {
  namespace: 'sow-driftline',
  idbName: 'sow-driftline',
  storageVersion: 1,
  timing: { pendingGraceMs: 3000, panelSettlePx: 24, panelSettleMs: 120, updateCheckMs: 5 * 60 * 1000, nameToastMs: 2600, railBubbleMs: 650, saveRetryMs: 15000, snapshotEveryMs: 10 * 60 * 1000 },
  data: { snapshotsMax: 12, undoMax: 200 },
  layout: { phoneMaxDateCols: 2, desktopDateCols: 9, phoneNameShare: 0.5, headerHeightPx: 56, desktopMinWidthPx: 1000, desktopScaleDivisor: 600, desktopScaleMax: 2.4 },
} as const

/** Every localStorage / idb key goes through here so nothing collides with /sow/. */
export function storageKey(name: string): string {
  return `${CONFIG.namespace}:${name}:v${CONFIG.storageVersion}`
}
