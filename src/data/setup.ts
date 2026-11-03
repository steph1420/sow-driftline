// Q-TOK-1: importable setup file. The token stays on this device (localStorage), never in the build.
export type Setup = { bridgeUrl: string; token: string }
export function parseSetup(text: string): Setup {
  let j: { kind?: string; bridgeUrl?: unknown; token?: unknown }
  try { j = JSON.parse(text) } catch { throw new Error('That file is not a setup file') }
  if (j.kind !== 'sow-driftline-setup' || typeof j.token !== 'string' || !j.token || typeof j.bridgeUrl !== 'string') throw new Error('That file is not a setup file')
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(j.bridgeUrl)) throw new Error('The setup file points somewhere unexpected')
  return { bridgeUrl: j.bridgeUrl, token: j.token }
}
