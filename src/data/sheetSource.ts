// Sheet adapter, TEST COPY ONLY. Reads: ping/pull/pairClaim. D2 adds one write: tick-only `push`, after a ping proves the COPY.
import type { RosterSource, SheetState } from './contract'
import { CONFIG, FLAVOR, type Flavor } from '../config'
export const COPY_SHEET_ID = '1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI'
export const LIVE_SHEET_ID = '1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ'
/** Test-copy bridge address (not a secret). The token arrives only by pairing on the device. */
export const COPY_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbxU01l41mPcriTlPOXsrvh3krmiWuRh97UM1McXO9vZoJPF07woCDF17gLvnwOoYXkAtA/exec'
/** Copy-only everywhere (Steve t168u/t169u). LIVE stays off until Steve says otherwise. */
export const allowedSheets = (_f: Flavor = FLAVOR): string[] => [COPY_SHEET_ID]
const refuse = (_f: Flavor) => new Error('This bridge is not the test copy · the app works with the test copy only')
export const READ_ACTIONS: readonly string[] = ['ping', 'pull', 'pairClaim', 'devicesList', 'prefsPull']
type Fetcher = (u: string, init: { method: string; headers: Record<string, string>; body: string; redirect: 'follow'; signal?: AbortSignal }) => Promise<Response>

export const WRITE_ACTIONS: readonly string[] = ['push', 'deviceRevoke', 'deviceRename', 'prefsPush']
export async function call<T>(url: string, body: Record<string, unknown>, fetcher: Fetcher = fetch as unknown as Fetcher, write = false): Promise<T> {
  if (!(READ_ACTIONS.includes(String(body.action)) || (write && WRITE_ACTIONS.includes(String(body.action))))) throw new Error(`Blocked: “${String(body.action)}” is not allowed`)
  let res: Response
  // beta.14 BK-B14-05: a request that never answers is given up after bridgeTimeoutMs (it held the one save lock, so no later tick saved)
  const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(CONFIG.timing.bridgeTimeoutMs) : undefined
  try { res = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', ...(signal ? { signal } : {}) }) }
  catch { throw new Error('You’re offline') }
  if (!res.ok) throw new Error(`Sheet answered ${res.status}`)
  let j: { ok?: boolean; error?: string }
  try { j = (await res.json()) as typeof j } catch { throw new Error('The sheet sent an unexpected reply · try again in a minute') } // beta.14 BK-B14-03: an Apps Script HTML error page
  if (!j.ok) throw new Error(j.error === 'bad token' ? 'This device is no longer paired' : `Sheet: ${j.error ?? 'error'}`)
  return j as T
}

export function sheetBridgeSource(url: string, token: () => string | null, fetcher?: Fetcher, flavor: Flavor = FLAVOR): RosterSource {
  return {
    kind: 'sheet',
    async pull() {
      const t = token(); if (!t) throw new Error('Not paired yet')
      const p = await call<{ sheetId?: string }>(url, { action: 'ping', token: t }, fetcher)
      if (!allowedSheets(flavor).includes(String(p.sheetId))) throw refuse(flavor)
      lastSheetId = String(p.sheetId)
      return call<SheetState>(url, { action: 'pull', token: t }, fetcher)
    },
  }
}
/** One-time pairing: the 6-digit code comes from SoW › Setup on an already-paired device. Returns the token (kept on device only). */
/** v0.5: sends the device name; a 0.50 bridge answers with a per-device key (revocable one by one), an older one with the shared token. */
export async function claimPair(url: string, code: string, fetcher?: Fetcher, deviceName?: string): Promise<string> {
  const r = await call<{ token?: string; deviceKey?: string }>(url, { action: 'pairClaim', code: code.trim(), ...(deviceName ? { deviceName } : {}) }, fetcher)
  const k = r.deviceKey || r.token
  if (!k) throw new Error('Code not accepted')
  return k
}

import type { Op } from '../sync/ops'
import { editsToPush, type SessionEdit } from './edits'
async function assertCopy(url: string, t: string, fetcher?: Fetcher, flavor: Flavor = FLAVOR) {
  const p = await call<{ sheetId?: string }>(url, { action: 'ping', token: t }, fetcher)
  if (!allowedSheets(flavor).includes(String(p.sheetId))) throw refuse(flavor)
  lastSheetId = String(p.sheetId)
}
/** Sheet id of the last successful ping (devices are disabled on LIVE). */
export let lastSheetId: string | null = null
/** Writer for the COPY. Re-proves the COPY on every push; never LIVE. Uses the existing bridge `push` (no Apps Script change):
 *  tick cells, and since beta.16 (t245u) date edits as `structs` (rename, delete) and `sessions` (add a date, topic),
 *  which bridge 0.40+ already applies (structs first, then ticks, then sessions). */
export function copyWriter(url: string, token: () => string | null, fetcher?: Fetcher, flavor: Flavor = FLAVOR) {
  return async (ops: Op[], edits: SessionEdit[] = []): Promise<SheetState> => {
    const t = token(); if (!t) throw new Error('Not paired yet')
    await assertCopy(url, t, fetcher, flavor)
    const { structs, sessions } = editsToPush(edits)
    // beta.16: ids follow the sheet (a move re-keys the session), so a tick goes under its session's date
    const r = await call<{ state?: SheetState }>(url, { action: 'push', token: t, clientNow: new Date().toISOString(), ticks: ops.map((o) => ({ subjectKey: o.subjectKey, date: o.date || sheetDate(o), topic: '', roll: o.roll, set: o.set, updatedAt: o.updatedAt })),
      ...(structs.length ? { structs } : {}), ...(sessions.length ? { sessions } : {}) }, fetcher, true)
    if (!r.state) throw new Error('Sheet: no state in reply')
    return r.state
  }
}
/** beta.14 BK-B14-01: the date the sheet files a tick under. A date moved on this device (edits stay on the device)
 * keeps its sheet row, whose id is `subjectKey|yyyy-mm-dd`; sending the moved date made the bridge start a second
 * session on the new day and split the ticks. The id's date keeps every tick on the session it belongs to. */
export function sheetDate(o: Pick<Op, 'sessionId' | 'subjectKey' | 'date'>): string {
  const m = o.sessionId.startsWith(o.subjectKey + '|') ? /^(\d{4}-\d{2}-\d{2})/.exec(o.sessionId.slice(o.subjectKey.length + 1)) : null
  return m ? m[1]! : o.date
}
/** Setup-file connect: only accepted if that bridge is the COPY. */
export async function verifyCopy(url: string, token: string, fetcher?: Fetcher) { await assertCopy(url, token, fetcher) }
