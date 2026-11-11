// v0.8 Phase 10 break-it: store under a random storm of ticks, date moves, topic edits, undo and redo (demo data only).
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useApp } from '../src/store/store'

const view = () => { const d = useApp.getState().data; return JSON.stringify({ t: d.ticks.filter((x) => x.set).map((x) => `${x.sessionId}|${x.roll}`).sort(), s: d.sessions.map((x) => `${x.sessionId}@${x.date}:${x.topic}`).sort() }) }
let seed = 7; const rnd = (n: number) => { seed = (seed * 16807) % 2147483647; return seed % n }

describe('P10 break-it: store storm', () => {
  beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset() })
  it('BK-STORE-01 55 random ticks / moves / topics (under the beta.15 cap of 60), then undo everything: back to the start; redo everything: back to the end', () => {
    const s0 = view(); let done = 0
    act(() => {
      for (let i = 0; done < 55; i++) { // beta.15 (t245u): Undo keeps the last 60 steps
        const s = useApp.getState(); const ses = s.data.sessions.filter((x) => x.date <= '2026-11-06'); const se = ses[rnd(ses.length)]!
        const k = rnd(10)
        if (k < 6) { s.tick(se.sessionId, 1 + rnd(20)); done++ }
        else if (k < 8) { const before = view(); s.moveSession(se.sessionId, `2026-12-${String(1 + rnd(28)).padStart(2, '0')}`); if (view() !== before) done++ }
        else { const before = view(); s.setTopic(se.sessionId, `T${i}`); if (view() !== before) done++ }
      }
    })
    const s1 = view()
    act(() => { for (let i = 0; i < done + 5; i++) useApp.getState().undo() })
    expect(view()).toBe(s0); expect(useApp.getState().canUndo).toBe(false)
    act(() => { for (let i = 0; i < done + 5; i++) useApp.getState().redo() })
    expect(view()).toBe(s1)
  })
  it('BK-STORE-01b beta.15: after 80 ticks and date edits, exactly the last 60 can be undone', () => {
    act(() => { for (let i = 0; i < 80; i++) { const s = useApp.getState(); const se = s.data.sessions.filter((x) => x.date <= '2026-11-06')[i % 3]!
      if (i % 10 === 9) s.setTopic(se.sessionId, `Cap ${i}`); else s.tick(se.sessionId, 1 + (i % 20)) } })
    let n = 0; act(() => { while (useApp.getState().canUndo && n < 200) { useApp.getState().undo(); n++ } })
    expect(n).toBe(60)
  })
  it('BK-STORE-02 Redo brings back an undone date move and topic edit, in order with ticks', () => {
    const sid = useApp.getState().data.sessions.find((x) => x.date === '2026-11-04')!.sessionId; const k = sid.split('|')[0]!
    const at = () => useApp.getState().data.sessions.find((x) => x.sessionId === sid || x.sessionId === `${k}|2026-11-05`)! // beta.16: a move re-keys to subjectKey|date
    act(() => { const s = useApp.getState(); s.tick(sid, 2); s.moveSession(sid, '2026-11-05'); s.setTopic(`${k}|2026-11-05`, 'New topic') })
    act(() => { for (let i = 0; i < 3; i++) useApp.getState().undo() })
    expect(at().date).toBe('2026-11-04'); expect(useApp.getState().canRedo).toBe(true)
    act(() => useApp.getState().redo()); act(() => useApp.getState().redo())
    expect(at().date).toBe('2026-11-05'); expect(at().topic).not.toBe('New topic')
    act(() => useApp.getState().redo()); expect(at().topic).toBe('New topic'); expect(useApp.getState().canRedo).toBe(false)
    act(() => { useApp.getState().undo(); useApp.getState().tick(`${k}|2026-11-05`, 4) }); expect(useApp.getState().canRedo).toBe(false) // a new action drops the redo stack
  })
})
