// Q-TOK-1: importable setup file. The token stays on this device (localStorage), never in the build.
// beta.16 (t245u): also reads the old SoW file (sow v0.47.1: kind 'sow-setup', v 1, syncUrl, token, sheetUrl, exportedAt,
// appVersion), and writes v, exportedAt and an optional sheetUrl like it. Formats: docs/REFERENCE.md §Setup files.
export type Setup = { bridgeUrl: string; token: string; sheetUrl?: string }
export const SETUP_KIND = 'sow-driftline-setup'; export const SETUP_V = 1
const OLD_KIND = 'sow-setup'
/** A deployed Apps Script web app (/exec), also on a Workspace domain (/a/<domain>/macros/…). */
const EXEC_URL = /^https:\/\/script\.google\.com\/(a\/[\w.-]+\/)?macros\/s\/[\w-]+\/exec$/
export function parseSetup(text: string): Setup {
  let j: { kind?: unknown; v?: unknown; bridgeUrl?: unknown; syncUrl?: unknown; token?: unknown; sheetUrl?: unknown }
  try { j = JSON.parse(text.replace(/^\uFEFF/, '')) } catch { throw new Error('That file is not a setup file') } // beta.14: a BOM from a text editor is fine
  if (!j || typeof j !== 'object') throw new Error('That file is not a setup file')
  const url = j.kind === SETUP_KIND ? j.bridgeUrl : j.kind === OLD_KIND ? j.syncUrl : undefined
  if ((j.kind !== SETUP_KIND && j.kind !== OLD_KIND) || typeof j.token !== 'string' || !j.token || typeof url !== 'string') throw new Error('That file is not a setup file')
  if (j.v != null && j.v !== SETUP_V) throw new Error('This setup file is from a newer version · update the app first') // 06 rule 5: a mismatch fails clearly
  if (!EXEC_URL.test(url)) throw new Error('The setup file points somewhere unexpected')
  return { bridgeUrl: url, token: j.token, ...(typeof j.sheetUrl === 'string' && j.sheetUrl ? { sheetUrl: j.sheetUrl } : {}) }
}
/** beta.13 (t234u/t235u): the file Settings › Export setup file writes, the exact shape parseSetup reads back. */
export const SETUP_FILENAME = 'sow-driftline-setup.json'
export const exportSetup = (s: Setup, now: Date = new Date()): string =>
  JSON.stringify({ kind: SETUP_KIND, v: SETUP_V, bridgeUrl: s.bridgeUrl, token: s.token, ...(s.sheetUrl ? { sheetUrl: s.sheetUrl } : {}), exportedAt: now.toISOString() }, null, 2) + '\n'
