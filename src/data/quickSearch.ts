/**
 * v0.38.0 Spotlight-style pupil search (Steve t67u). Ranks, never filters the list away.
 * Tiers: roll · first-name prefix · other-word prefix · multi-word prefix · initials · substring · subsequence · typo (Damerau 1, len ≥ 4).
 * Ties → roll order.
 */
export type QsRow = { roll: number; name: string }
export type QsMatch = { roll: number; score: number; kind: string }

export function damerau(a: string, b: string): number {
  const m = a.length, n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0]![j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1
    d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c)
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
  }
  return d[m]![n]!
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim()

function isSubseq(q: string, s: string): boolean {
  let i = 0
  for (const ch of s) if (ch === q[i]) i++
  return i === q.length
}

export function scoreName(qRaw: string, row: QsRow): QsMatch | null {
  const q = norm(qRaw)
  if (!q) return null
  if (/^\d+$/.test(q)) return String(row.roll) === q ? { roll: row.roll, score: 100, kind: 'roll' } : String(row.roll).startsWith(q) ? { roll: row.roll, score: 70, kind: 'roll' } : null
  const name = norm(row.name)
  const words = name.split(' ').filter(Boolean)
  const flat = words.join('')
  const qWords = q.split(' ').filter(Boolean)
  if (qWords.length > 1) {
    for (let s = 0; s + qWords.length <= words.length; s++) {
      if (qWords.every((w, k) => words[s + k]!.startsWith(w))) return { roll: row.roll, score: 88 - s, kind: 'words' }
    }
  }
  const qq = qWords.join('')
  if (words[0]?.startsWith(qq)) return { roll: row.roll, score: words[0] === qq ? 95 : 90, kind: 'first' }
  for (let i = 1; i < words.length; i++) if (words[i]!.startsWith(qq)) return { roll: row.roll, score: 85 - i, kind: 'word' }
  if (qq.length >= 2 && qq.length <= words.length) {
    // initials in order: 'rk' → R… K…
    let w = 0, k = 0
    while (w < words.length && k < qq.length) { if (words[w]![0] === qq[k]) k++; w++ }
    if (k === qq.length) return { roll: row.roll, score: 80, kind: 'initials' }
  }
  const at = flat.indexOf(qq)
  if (qq.length >= 2 && at >= 0) return { roll: row.roll, score: 60 - Math.min(at, 10) * 0.5, kind: 'substring' }
  if (qq.length >= 4) {
    for (const w of words) {
      if (damerau(qq, w) <= 1) return { roll: row.roll, score: 50, kind: 'typo' }
      for (const L of [qq.length - 1, qq.length, qq.length + 1]) if (L >= 3 && L < w.length && damerau(qq, w.slice(0, L)) <= 1) return { roll: row.roll, score: 48, kind: 'typo' }
    }
  }
  if (qq.length >= 2 && isSubseq(qq, flat)) return { roll: row.roll, score: 40, kind: 'subsequence' }
  return null
}

export function rankMatches(q: string, rows: QsRow[]): QsMatch[] {
  const out: QsMatch[] = []
  for (const r of rows) { const m = scoreName(q, r); if (m) out.push(m) }
  return out.sort((a, b) => b.score - a.score || a.roll - b.roll)
}
