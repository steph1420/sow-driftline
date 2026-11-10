// Shared by the layout tests: evaluate a --sow-* size from shell.css in px, for given Display size factors.
import { readFileSync } from 'node:fs'

const tokens = readFileSync('src/vendor/driftline/tokens.css', 'utf8')
export const shell = readFileSync('src/shell/shell.css', 'utf8')
const tok: Record<string, number> = Object.fromEntries([...tokens.matchAll(/(--dl-(?:space|hit|radius)-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1]!, +m[2]!]))
/** Every --sow-* declared on :root or .sow-grid rules in shell.css (last one wins). */
export const decl: Record<string, string> = {}
for (const rule of shell.matchAll(/(?:^|\n)(?::root|\.sow-grid)\s*\{([^}]*)\}/g)) for (const m of rule[1]!.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--sow-[\w-]+):\s*([^;]+);/g)) decl[m[1]!] = m[2]!.trim()

/** px with kit tokens → px, --sow-k-<group> → k[group] ?? 1, --sow-min-text → 13, then plain arithmetic. */
export function px(name: string, k: Record<string, number> = {}): number {
  const v = decl[name]; if (v == null) throw new Error(`${name} not declared`)
  const expr = v.replace(/var\((--[\w-]+)\)/g, (_, n: string) => n.startsWith('--sow-k-') ? String(k[n.slice(8)] ?? 1) : n === '--sow-min-text' ? '13' : n in tok ? String(tok[n]) : n.startsWith('--sow-') ? `(${px(n, k)})` : 'NaN')
    .replace(/calc\(/g, '(').replace(/max\(/g, 'Math.max(').replace(/min\(/g, 'Math.min(').replace(/(\d+(?:\.\d+)?)px/g, '$1')
  return Math.round(Function(`return ${expr}`)() * 100) / 100
}
