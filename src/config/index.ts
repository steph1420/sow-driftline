// One config module (06 rule 6). Every timing/layout number lives here; Developer options will override later.
declare const __APP_FLAVOR__: string
declare const __APP_VERSION__: string
export type Flavor = 'stable' | 'beta'
export const FLAVOR: Flavor = typeof __APP_FLAVOR__ !== 'undefined' && __APP_FLAVOR__ === 'beta' ? 'beta' : 'stable'
export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? 'test' : __APP_VERSION__
export const FLAVOR_LABEL = FLAVOR === 'beta' ? 'Beta' : 'Stable'
/** v0.5 release channel switch: Stable and Beta live side by side on the same origin. */
export const channelUrl = (ch: Flavor, origin = location.origin) => `${origin}/${ch === 'beta' ? 'sow-driftline-beta' : 'sow-driftline'}/`
/** v0.5: Beta and Stable share the github.io origin, so they must never share keys (token, outbox, tabs channel). */
export const namespaceFor = (f: Flavor) => (f === 'beta' ? 'sow-driftline-beta' : 'sow-driftline')
export const CONFIG = {
  namespace: namespaceFor(FLAVOR),
  idbName: 'sow-driftline',
  storageVersion: 1,
  timing: { pendingGraceMs: 3000, panelSettlePx: 24, panelSettleMs: 120, updateCheckMs: 5 * 60 * 1000, nameToastMs: 2600, railBubbleMs: 650, saveRetryMs: 15000, snapshotEveryMs: 10 * 60 * 1000, quickSyncMs: 4000, gripSnapMinPx: 8, swipeEngagePx: 10, swipeExtendPx: 28, swipeExtendFrac: 0.6, jumpFlashMs: 1200, sheetOpenDragPx: 64, holdMs: 500, pressMs: 160, shortcutHoldMs: 100, devHoldMs: 500, quickOpenPx: 96, quickFlickPxMs: 0.5, undoSlidePx: 16, undoCancelPx: 28, prefsPushMs: 2000, stillToComeShown: 5, modeKeepMs: 20000 },
  data: { snapshotsMax: 12, undoMax: 200 },
  layout: { phoneMaxDateCols: 1, desktopDateCols: 9, desktopCalmDateCols: 3, phoneNameShare: 0.5, headerHeightPx: 56, dockReservePx: 88, desktopMinWidthPx: 1000, desktopScaleDivisor: 600, desktopScaleMax: 2.4 },
} as const

/** Every localStorage / idb key goes through here so nothing collides with /sow/. */
export function storageKey(name: string): string {
  return `${CONFIG.namespace}:${name}:v${CONFIG.storageVersion}`
}
