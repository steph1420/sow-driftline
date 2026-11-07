// v0.7.0 — written before the code (failing first). Spec: FEATURES.md (F-LT, F-DT, F-OV).
import { describe, it, expect } from 'vitest'
import { dueEndMs, isLate, pillVisible, modeOnOpen } from '../src/data/late'
import { spinMonth, spinDate, spinDay, setYear } from '../src/data/dial'
import { overviewCards, weekPath, collides, nextClassDay } from '../src/data/overview'
import type { SheetState } from '../src/data/contract'

const IST = (s: string) => Date.parse(s + '+05:30')
describe('v0.7 late rule (F-LT-01/02/05)', () => {
  it('V07-LT-01 due end = midnight IST after the scheduled day', () => expect(dueEndMs('2026-11-04')).toBe(IST('2026-11-05T00:00:00')))
  it('V07-LT-02 marked 23:59 IST on the day is on time; 00:00 next day is late', () => {
    expect(isLate(new Date(IST('2026-11-04T23:59:00')).toISOString(), '2026-11-04')).toBe(false)
    expect(isLate(new Date(IST('2026-11-05T00:00:00')).toISOString(), '2026-11-04')).toBe(true)
  })
  it('V07-LT-03 unknown marked time is never guessed late', () => { expect(isLate('', '2026-11-04')).toBeNull(); expect(isLate(null, '2026-11-04')).toBeNull() })
  it('V07-LT-04 back-dated mark is never late', () => expect(isLate(new Date(IST('2026-11-07T10:00:00')).toISOString(), '2026-11-04', true)).toBe(false))
  it('V07-LT-05 re-evaluated when the date moves later', () => {
    const at = new Date(IST('2026-11-05T09:00:00')).toISOString()
    expect(isLate(at, '2026-11-04')).toBe(true); expect(isLate(at, '2026-11-06')).toBe(false)
  })
  it('V07-LT-06 pill only after due', () => { expect(pillVisible('2026-11-04', IST('2026-11-04T15:00:00'))).toBe(false); expect(pillVisible('2026-11-04', IST('2026-11-05T00:00:01'))).toBe(true) })
  it('V07-LT-07 pill resets to late on opening another date', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-02', nowMs: 10 * 60e3, keepMs: 60e3 })).toBe('late'))
  it('V07-LT-08 …but not on a quick return to the same date (t79u 2.2)', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-03', nowMs: 20e3, keepMs: 60e3 })).toBe('back'))
  it('V07-LT-09 slow return still resets', () => expect(modeOnOpen({ mode: 'back', leftDate: '2026-11-03', leftAtMs: 0, openDate: '2026-11-03', nowMs: 5 * 60e3, keepMs: 60e3 })).toBe('late'))
})
describe('v0.7 date wheels (F-DT-02/03)', () => {
  it('V07-DL-01 month spin clamps the date (31 Jan +1 → 28 Feb 2026)', () => expect(spinMonth('2026-01-31', 1)).toBe('2026-02-28'))
  it('V07-DL-02 month spin wraps across the year boundary', () => { expect(spinMonth('2026-12-10', 1)).toBe('2027-01-10'); expect(spinMonth('2026-01-10', -1)).toBe('2025-12-10') })
  it('V07-DL-03 date spin wraps inside the month', () => { expect(spinDate('2026-11-30', 1)).toBe('2026-11-01'); expect(spinDate('2026-11-01', -1)).toBe('2026-11-30') })
  it('V07-DL-04 Day wheel moves to that weekday in the same Mon–Sun week (t75u)', () => {
    expect(spinDay('2026-11-04', 4)).toBe('2026-11-06') // Wed → Fri
    expect(spinDay('2026-11-04', 0)).toBe('2026-11-02') // Wed → Mon
    expect(spinDay('2026-11-08', 0)).toBe('2026-11-02') // Sun → Mon same week
  })
  it('V07-DL-05 Day wheel crosses a month inside the week', () => expect(spinDay('2026-12-01', 0)).toBe('2026-11-30'))
  it('V07-DL-06 year pill keeps day/month and clamps 29 Feb', () => { expect(setYear('2026-11-04', 2027)).toBe('2027-11-04'); expect(setYear('2028-02-29', 2027)).toBe('2027-02-28') })
})
const ss = (id: string, subjectKey: string, classKey: string, date: string, topic = ''): SheetState['sessions'][number] => ({ sessionId: id, subjectKey, classKey, date, topic, status: 'Open', updatedAt: '' })
const st: SheetState = { ok: true, schema: 1,
  subjects: [
    { subjectKey: 'A_ENG_HW', classKey: 'A', subject: 'English', kind: 'HW', active: true },
    { subjectKey: 'B_ENG_CW', classKey: 'B', subject: 'English', kind: 'CW', active: true },
    { subjectKey: 'C_ENG_HW', classKey: 'C', subject: 'English', kind: 'HW', active: true },
    { subjectKey: 'A_PHO_CW', classKey: 'A', subject: 'Phonics', kind: 'CW', active: true },
  ],
  roster: [1, 2, 3].flatMap((r) => ['A', 'B', 'C'].map((c) => ({ classKey: c, roll: r, name: `${c}${r}`, status: 'Active' as const, updatedAt: '' }))),
  sessions: [
    ss('a1', 'A_ENG_HW', 'A', '2026-10-26', 'G & H'), ss('a2', 'A_ENG_HW', 'A', '2026-11-02', 'K & L'), ss('a3', 'A_ENG_HW', 'A', '2026-11-04', 'M & N'), ss('a4', 'A_ENG_HW', 'A', '2026-11-06', 'O & P'),
    ss('b1', 'B_ENG_CW', 'B', '2026-11-04', 'Words'),
    ss('c1', 'C_ENG_HW', 'C', '2026-11-03', 'Little letters'),
    ss('p1', 'A_PHO_CW', 'A', '2026-11-09', 'The m sound'),
  ],
  ticks: [{ tickId: 'a3|1', sessionId: 'a3', subjectKey: 'A_ENG_HW', classKey: 'A', roll: 1, set: true, updatedAt: '' }],
}
describe('v0.7j Overview (F-OV-01/02)', () => {
  const cards = () => overviewCards(st, '2026-11-04')
  it('V07-OV-01 one card per class+subject+type, every class shown', () => expect(cards().map((c) => c.subjectKey).sort()).toEqual(['A_ENG_HW', 'A_PHO_CW', 'B_ENG_CW', 'C_ENG_HW']))
  it('V07-OV-02 current session = today, else earliest future, else latest past', () => {
    const by = Object.fromEntries(cards().map((c) => [c.subjectKey, c.sessionId]))
    expect(by).toEqual({ A_ENG_HW: 'a3', B_ENG_CW: 'b1', C_ENG_HW: 'c1', A_PHO_CW: 'p1' })
  })
  it('V07-OV-03 card carries type, date, topic and to-go only', () => { const a = cards().find((c) => c.subjectKey === 'A_ENG_HW')!; expect([a.kind, a.date, a.topic, a.toGo, a.total]).toEqual(['HW', '2026-11-04', 'M & N', 2, 3]) })
  it('V07-OV-04 today first, then a stable order', () => { const k = cards().map((c) => c.subjectKey); expect(k.slice(0, 2).sort()).toEqual(['A_ENG_HW', 'B_ENG_CW']); expect(overviewCards(st, '2026-11-04').map((c) => c.subjectKey)).toEqual(k) })
  it('V07-OV-05 a class with no dates still appears, with no session', () => { const s2 = { ...st, subjects: [...st.subjects, { subjectKey: 'D_ENG_CW', classKey: 'D', subject: 'English', kind: 'CW', active: true }] }; const d = overviewCards(s2, '2026-11-04').find((c) => c.subjectKey === 'D_ENG_CW')!; expect(d.sessionId).toBeNull() })
})
describe('v0.7j week path (F-OV-04)', () => {
  const w = () => weekPath(st, 'A_ENG_HW', '2026-11-04')
  it('V07-WP-01 only that class+subject', () => expect(w().flatMap((x) => x.stops).every((s) => s.sessionId.startsWith('a'))).toBe(true))
  it('V07-WP-02 newest week first (this week, then older), Mon→Fri inside', () => { expect(w().map((x) => x.start)).toEqual(['2026-11-02', '2026-10-26']); expect(w()[0]!.stops.map((s) => s.date)).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']) })
  it('V07-WP-03 today/past/future marks', () => expect(w()[0]!.stops.map((s) => s.when)).toEqual(['past', 'today', 'future']))
  it('V07-WP-04 week titles: This week · Last week · date range', () => expect(w().map((x) => x.title)).toEqual(['This week · 2–8 Nov', 'Last week · 26 Oct – 1 Nov']))
})
describe('v0.7 dates (F-DT-05, F-OV-05)', () => {
  it('V07-DT-01 same label same day collides; other label does not', () => { expect(collides(st, 'A_ENG_HW', '2026-11-06')).toBe(true); expect(collides(st, 'A_PHO_CW', '2026-11-06')).toBe(false) })
  it('V07-DT-02 moving a session onto its own day is not a collision', () => expect(collides(st, 'A_ENG_HW', '2026-11-06', 'a4')).toBe(false))
  it('V07-DT-03 next class day follows the class weekdays, skips taken days', () => expect(nextClassDay(st, 'A_ENG_HW', '2026-11-04')).toBe('2026-11-09'))
})

// S2 (v0.6.1 lock): no save wording on screen; only the status dot carries it (as its label).
import { render as renderS2, cleanup as cleanupS2 } from '@testing-library/react'
import { App as AppS2 } from '../src/App'
import { useApp as useAppS2 } from '../src/store/store'
describe('V07-S2 quiet save state', () => {
  it('V07-S2-01 footer shows no saved/saving/waiting text', () => {
    cleanupS2(); localStorage.clear(); useAppS2.getState().reset()
    const { container } = renderS2(<AppS2 />)
    const foot = container.querySelector('.sow-foot')!.textContent!
    expect(foot).toMatch(/Driftline/); expect(foot).not.toMatch(/sav|waiting|on this device/i)
  })
  it('V07-S2-02 status dot still has an accessible label', () => {
    cleanupS2(); localStorage.clear(); useAppS2.getState().reset()
    const { container } = renderS2(<AppS2 />)
    expect(container.querySelector('.sow-dot')!.getAttribute('aria-label')).toBeTruthy()
  })
})

// S3 (v0.6.1 lock, mocks v061/qo*): split Done | To go counter, names panel, ✕ close, no Waiting box.
import { screen as scrS3, fireEvent as feS3, within as wS3 } from '@testing-library/react'
describe('V07-S3 quick overview', () => {
  const open = () => { cleanupS2(); localStorage.clear(); useAppS2.getState().reset(); renderS2(<AppS2 />); feS3.keyDown(document.body, { key: 'O', shiftKey: true }); return scrS3.getByRole('dialog', { name: /quick overview/i }) }
  it('V07-S3-01 ✕ closes the sheet', () => {
    const d = open(); feS3.click(wS3(d).getByRole('button', { name: 'Close' })); expect(scrS3.queryByRole('dialog')).toBeNull()
  })
  it('V07-S3-02 split counter: Done and To go halves, collapsed by default', () => {
    const d = open(); const done = wS3(d).getByRole('button', { name: /^\d+ done/i }); const go = wS3(d).getByRole('button', { name: /^\d+ to go/i })
    expect(done.getAttribute('aria-expanded')).toBe('false'); expect(go.getAttribute('aria-expanded')).toBe('false')
    expect(d.textContent).not.toMatch(/still to come in/i)
  })
  it('V07-S3-03 tapping To go opens "Still to come in"; tapping Done swaps to the Done list; tapping again closes', () => {
    const d = open(); const go = wS3(d).getByRole('button', { name: /^\d+ to go/i }); const done = wS3(d).getByRole('button', { name: /^\d+ done/i })
    feS3.click(go); expect(go.getAttribute('aria-expanded')).toBe('true'); expect(d.textContent).toMatch(/still to come in/i)
    feS3.click(done); expect(done.getAttribute('aria-expanded')).toBe('true'); expect(go.getAttribute('aria-expanded')).toBe('false'); expect(d.textContent).toMatch(/^.*DONE|Done/)
    feS3.click(done); expect(done.getAttribute('aria-expanded')).toBe('false')
  })
  it('V07-S3-04 list shows 5 names then "Show all N"', () => {
    const d = open(); const go = wS3(d).getByRole('button', { name: /^(\d+) to go/i }); const n = Number(go.getAttribute('aria-label')!.match(/^\d+/)![0])
    feS3.click(go); expect(d.querySelectorAll('.sow-names li').length).toBe(Math.min(5, n))
    if (n > 5) { feS3.click(wS3(d).getByRole('button', { name: `Show all ${n}` })); expect(d.querySelectorAll('.sow-names li').length).toBe(n) }
  })
  it('V07-S3-05 no Waiting box', () => { const d = open(); expect(d.textContent).not.toMatch(/waiting/i) })
})

// S3b (t95u): Copy back beside Share; Share opens 4 target blobs (WhatsApp, Keep, Mail, Messages).
describe('V07-S3b share targets', () => {
  const open = () => { cleanupS2(); localStorage.clear(); useAppS2.getState().reset(); renderS2(<AppS2 />); feS3.keyDown(document.body, { key: 'O', shiftKey: true }); return scrS3.getByRole('dialog', { name: /quick overview/i }) }
  it('V07-S3b-01 Copy and Share both shown; targets hidden until Share', () => {
    const d = open(); expect(wS3(d).getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(wS3(d).queryByRole('link', { name: /whatsapp/i })).toBeNull()
  })
  it('V07-S3b-02 computer without a share sheet: WhatsApp, Keep only (no Mail, Messages or More)', () => {
    const d = open(); feS3.click(wS3(d).getByRole('button', { name: 'Share' }))
    const wa = wS3(d).getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement
    expect(wa.href).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(wS3(d).queryByRole('link', { name: /^mail$/i })).toBeNull()
    expect(wS3(d).getByRole('button', { name: /keep/i })).toBeTruthy()
    expect(wS3(d).queryByRole('link', { name: /messages/i })).toBeNull(); expect(wS3(d).queryByRole('button', { name: /more/i })).toBeNull()
  })
  it('V07-S3b-03 (t96u) targets per device', async () => {
    const { shareTargets } = await import('../src/data/shareTargets')
    expect(shareTargets({ phone: true, canShare: true })).toEqual(['whatsapp', 'keep', 'sms', 'more'])
    expect(shareTargets({ phone: false, canShare: false })).toEqual(['whatsapp', 'keep'])
    expect(shareTargets({ phone: false, canShare: true })).toEqual(['whatsapp', 'keep', 'more'])
  })
  it('V07-S3b-04 (t98u) editable message: prefilled, edits flow to the targets, Reset restores', () => {
    const d = open(); feS3.click(wS3(d).getByRole('button', { name: 'Share' }))
    const box = wS3(d).getByRole('textbox', { name: 'Message to share' }) as HTMLTextAreaElement
    expect(box.value).toMatch(/^KG-A • .* • not set\/found \(\d+\):/); expect(wS3(d).queryByRole('button', { name: 'Reset' })).toBeNull()
    feS3.change(box, { target: { value: 'Hello class' } })
    expect((wS3(d).getByRole('link', { name: /whatsapp/i }) as HTMLAnchorElement).href).toBe('https://wa.me/?text=Hello%20class')
    feS3.click(wS3(d).getByRole('button', { name: 'Reset' })); expect(box.value).toMatch(/not set\/found/)
  })
})

// v0.7.0 S4 (step 3): v0.7j Overview cards
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
describe('S4 Overview cards (F-OV)', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  const load = async () => { cleanup(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    history.replaceState(null, '', '/?demo=school'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); return useApp }
  it('S4-01 page header: date eyebrow, "Your classes", hint', async () => {
    await load(); expect(screen.getByRole('heading', { name: 'Your classes' })).toBeTruthy(); expect(screen.getByText('Tap a class to open its checklist')).toBeTruthy()
  })
  it('S4-02 one squircle per class subject type with a type pill and topic, no progress or late chips', async () => {
    await load(); const cards = screen.getAllByRole('button', { name: /open .* on checklist/i })
    expect(cards.length).toBe(6)
    for (const c of cards) { expect(c.querySelector('.sow-sq__pill')?.textContent).toMatch(/^(CW|HW|Test)$/); expect(c.querySelector('.sow-prog')).toBeNull(); expect(c.textContent).not.toMatch(/late/i) }
  })
  it('S4-03 tapping a card opens Checklist focused on that card\'s session', async () => {
    const useApp = await load(); const card = screen.getByRole('button', { name: /open KG-C Phonics Test on checklist/i })
    fireEvent.click(card); const s = useApp.getState()
    expect(s.tab).toBe('checklist'); expect(s.currentClass).toBe('KG-C'); expect(s.focus).toMatch(/^KG-C_PHO_TEST\|/)
    expect(screen.getByRole('table')).toBeTruthy()
  })
  it('S4-04 changing class from the bar drops the card focus', async () => {
    const useApp = await load(); fireEvent.click(screen.getAllByRole('button', { name: /open .* on checklist/i })[0]!)
    useApp.getState().setClass('KG-B'); expect(useApp.getState().focus).toBeNull()
  })
})

// v0.7.0 S4b (t101u): one card = one class + subject + type; Pending only pill; no "later date" link
describe('S4b one subject per checklist + Pending only', () => {
  afterEach(() => { cleanup(); localStorage.clear(); history.replaceState(null, '', '/') })
  const load = async () => { cleanup(); const { App } = await import('../src/App'); const { useApp } = await import('../src/store/store')
    history.replaceState(null, '', '/?demo=school&today=2026-11-04'); useApp.getState().reset(); render(<App />); fireEvent.click(screen.getByRole('tab', { name: 'Overview' })); return useApp }
  it('S4b-01 a card\'s checklist shows only that subject and type', async () => {
    const useApp = await load(); fireEvent.click(screen.getByRole('button', { name: /open KG-C Phonics Test on checklist/i }))
    expect(useApp.getState().subject).toBe('KG-C_PHO_TEST')
    const heads = screen.getAllByRole('columnheader').slice(1).map((h) => h.textContent)
    expect(heads.length).toBeGreaterThan(0); for (const h of heads) expect(h).toMatch(/^Test · /)
  })
  it('S4b-02 Pending only shows just the unticked names for the focused date, and no "later date" link', async () => {
    const useApp = await load(); fireEvent.click(screen.getByRole('button', { name: /open KG-A English HW on checklist/i }))
    const all = screen.getAllByRole('row').length
    fireEvent.click(screen.getByRole('button', { name: 'Pending only' })); expect(useApp.getState().pending).toBe(true)
    expect(screen.getAllByRole('row').length).toBe(10 + 1) // 10 to go + header row
    expect(screen.getAllByRole('row').length).toBeLessThan(all)
    expect(screen.queryByText(/later date/)).toBeNull()
  })
})
