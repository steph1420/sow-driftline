// v0.5 device registry client. Bridges older than 0.50.0-dl.1 answer "unknown action" → supported: false (UI explains, nothing breaks).
import { call, lastSheetId, LIVE_SHEET_ID } from './sheetSource'
const live = () => lastSheetId === LIVE_SHEET_ID // device registry stays off on LIVE
export type Device = { id: string; name: string; createdAt: string; lastSeen: string; revoked: boolean }
type Fetcher = Parameters<typeof call>[2]
const unsupported = (e: unknown) => /unknown action/i.test(String(e instanceof Error ? e.message : e))
export function devicesClient(url: string, token: () => string | null, fetcher?: Fetcher) {
  const t = () => { const x = token(); if (!x) throw new Error('Not paired yet'); return x }
  return {
    async list(): Promise<{ supported: boolean; devices: Device[] }> {
      if (live()) return { supported: false, devices: [] }
      try { const r = await call<{ devices?: Device[] }>(url, { action: 'devicesList', token: t() }, fetcher); return { supported: true, devices: r.devices ?? [] } }
      catch (e) { if (unsupported(e)) return { supported: false, devices: [] }; throw e }
    },
    revoke: (id: string) => live() ? Promise.reject(new Error('Not on the live sheet')) : call(url, { action: 'deviceRevoke', token: t(), id }, fetcher, true),
    rename: (id: string, name: string) => live() ? Promise.reject(new Error('Not on the live sheet')) : call(url, { action: 'deviceRename', token: t(), id, name }, fetcher, true),
  }
}
