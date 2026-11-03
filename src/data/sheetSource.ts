// D1 sheet adapter: READ ONLY, TEST COPY ONLY. Never sends push/prefsPush/struct ops.
import type { RosterSource, SheetState } from './contract'
export const COPY_SHEET_ID = '1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI'
export const LIVE_SHEET_ID = '1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ'
/** Test-copy bridge address (not a secret). The token arrives only by pairing on the device. */
export const COPY_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbxU01l41mPcriTlPOXsrvh3krmiWuRh97UM1McXO9vZoJPF07woCDF17gLvnwOoYXkAtA/exec'
export const READ_ACTIONS: readonly string[] = ['ping', 'pull', 'pairClaim']
type Fetcher = (u: string, init: { method: string; headers: Record<string, string>; body: string; redirect: 'follow' }) => Promise<Response>

export async function call<T>(url: string, body: Record<string, unknown>, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<T> {
  if (!READ_ACTIONS.includes(String(body.action))) throw new Error(`Blocked: “${String(body.action)}” is not a read action`)
  let res: Response
  try { res = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }) }
  catch { throw new Error('You’re offline') }
  if (!res.ok) throw new Error(`Sheet answered ${res.status}`)
  const j = (await res.json()) as { ok?: boolean; error?: string }
  if (!j.ok) throw new Error(j.error === 'bad token' ? 'This device is no longer paired' : `Sheet: ${j.error ?? 'error'}`)
  return j as T
}

export function sheetBridgeSource(url: string, token: () => string | null, fetcher?: Fetcher): RosterSource {
  return {
    kind: 'sheet',
    async pull() {
      const t = token(); if (!t) throw new Error('Not paired yet')
      const p = await call<{ sheetId?: string }>(url, { action: 'ping', token: t }, fetcher)
      if (p.sheetId !== COPY_SHEET_ID) throw new Error('This bridge is not the test copy · D1 reads the test copy only')
      return call<SheetState>(url, { action: 'pull', token: t }, fetcher)
    },
  }
}
/** One-time pairing: the 6-digit code comes from SoW › Setup on an already-paired device. Returns the token (kept on device only). */
export async function claimPair(url: string, code: string, fetcher?: Fetcher): Promise<string> {
  const r = await call<{ token?: string }>(url, { action: 'pairClaim', code: code.trim() }, fetcher)
  if (!r.token) throw new Error('Code not accepted')
  return r.token
}
