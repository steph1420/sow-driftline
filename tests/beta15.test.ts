// beta.15 (Steve t245u): Undo keeps a finite history, the last 60 steps. Fake storage only; no network.
import { describe, it, expect, beforeEach } from 'vitest'
import { History } from '../src/sync/history'
import { CONFIG } from '../src/config'
import type { Op } from '../src/sync/ops'
beforeEach(() => localStorage.clear())
const op = (roll: number, at: string): Op => ({ sessionId: 's1', subjectKey: 'A_Eng_CW', classKey: 'A', date: '2026-11-03', roll, set: true, updatedAt: at })
const at = (i: number) => new Date(Date.UTC(2026, 10, 3, 8, 0, i)).toISOString()

describe('beta.15 undo cap (t245u)', () => {
  it('B15-01 the cap is 60', () => { expect(CONFIG.data.undoMax).toBe(60) })
  it('B15-02 only the newest 60 steps can be undone; the 61st Undo does nothing', () => {
    const h = new History(localStorage, 'undo')
    for (let i = 1; i <= 75; i++) h.record(op(i, at(i)), false)
    const undone: number[] = []
    for (let i = 0; i < 61; i++) { const ops = h.undo(at(100 + i)); if (ops) undone.push(ops[0]!.roll) }
    expect(undone.length).toBe(60)
    expect(undone[0]).toBe(75); expect(undone[59]).toBe(16)
    expect(h.canUndo()).toBe(false)
  })
  it('B15-03 redo is capped too, and survives a reload', () => {
    const h = new History(localStorage, 'undo')
    for (let i = 1; i <= 70; i++) h.record(op(i, at(i)), false)
    for (let i = 0; i < 70; i++) h.undo(at(100 + i))
    const saved = JSON.parse(localStorage.getItem('undo')!)
    expect(saved.undo.length).toBe(0); expect(saved.redo.length).toBe(60)
    expect(new History(localStorage, 'undo').canRedo()).toBe(true)
  })
  it('B15-04 a full phone storage drops the oldest steps instead of throwing (the tick must still go through)', () => {
    const h = new History(localStorage, 'undo')
    for (let i = 1; i <= 10; i++) h.record(op(i, at(i)), false)
    const real = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) { if (v.length > 900) throw new DOMException('full', 'QuotaExceededError'); return real.call(this, k, v) }
    try { expect(() => h.record(op(11, at(11)), false)).not.toThrow() } finally { Storage.prototype.setItem = real }
    const left = JSON.parse(localStorage.getItem('undo')!).undo as { cells: { op: Op }[] }[]
    expect(left.length).toBeGreaterThan(0); expect(left.length).toBeLessThan(11)
    expect(left[left.length - 1]!.cells[0]!.op.roll).toBe(11)
  })
  it('B15-05 dropOldest removes the oldest undo step only', () => {
    const h = new History(localStorage, 'undo')
    for (let i = 1; i <= 3; i++) h.record(op(i, at(i)), false)
    h.dropOldest()
    expect(h.undo(at(50))![0]!.roll).toBe(3); expect(h.undo(at(51))![0]!.roll).toBe(2); expect(h.undo(at(52))).toBeNull()
  })
})
