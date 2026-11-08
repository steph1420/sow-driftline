// v0.8 F-TP-10: settings that follow the teacher across devices, through the bridge's hidden Prefs tab
// (prefsPull / prefsPush, one row per key, newer wins per key). Test copy only; never on the live sheet.
import { call, lastSheetId, LIVE_SHEET_ID } from '../data/sheetSource'

export type PrefRow = { key: string; category: string; value: unknown; updatedAt: string; deviceId?: string }
export type PrefsResult = { supported: boolean; rows: PrefRow[] }
export type PrefsClient = { pull: () => Promise<PrefsResult>; push: (rows: PrefRow[], deviceId: string) => Promise<PrefsResult> }
type Fetcher = Parameters<typeof call>[2]
const unsupported = (e: unknown) => /unknown action/i.test(String(e instanceof Error ? e.message : e))

export function prefsClient(url: string, token: () => string | null, fetcher?: Fetcher): PrefsClient {
  const t = () => { const x = token(); if (!x) throw new Error('Not paired yet'); return x }
  const run = async (body: Record<string, unknown>, write: boolean): Promise<PrefsResult> => {
    if (lastSheetId === LIVE_SHEET_ID) return { supported: false, rows: [] }
    try { const r = await call<{ prefs?: PrefRow[] }>(url, { ...body, token: t() }, fetcher, write); return { supported: true, rows: r.prefs ?? [] } }
    catch (e) { if (unsupported(e)) return { supported: false, rows: [] }; throw e }
  }
  return { pull: () => run({ action: 'prefsPull' }, false), push: (rows, deviceId) => run({ action: 'prefsPush', rows, deviceId }, true) }
}
