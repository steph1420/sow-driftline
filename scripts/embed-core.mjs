// Copies src/oplog/core.js (the one op-log core) into bridge/Code.js between the oplog-core markers, without `export `.
// Run: node scripts/embed-core.mjs   (test OL-CORE-00 fails when they differ)
import { readFileSync, writeFileSync } from 'node:fs'
const core = readFileSync(new URL('../src/oplog/core.js', import.meta.url), 'utf8')
export const plain = (s) => s.replace(/^export /gm, '').trimEnd() + '\n'
const p = new URL('../bridge/Code.js', import.meta.url); const code = readFileSync(p, 'utf8')
const a = code.indexOf('// <oplog-core>'), b = code.indexOf('// </oplog-core>')
if (a < 0 || b < 0) throw new Error('markers missing in bridge/Code.js')
const end = b + '// </oplog-core>'.length + 1
writeFileSync(p, code.slice(0, a) + plain(core) + code.slice(end))
console.log('embedded', plain(core).split('\n').length, 'lines')
