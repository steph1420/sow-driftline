# Break-it run: v0.8.0-beta.3 → fixes in v0.8.0-beta.4 (Steve t79u, Phase 10)

Target: https://steph1420.github.io/sow-driftline-beta/ (bundle index-BkKXV_ni.js), 9 Nov 2026 ~01:00–01:40 IST. Demo data, plus a stand-in bridge (page.route, fake token) for the copy path. No token was needed or used; the COPY and LIVE sheets were never contacted. Stable untouched.
Script: `docs/breakit-v08.cjs` (16 checks). Unit break-it: `tests/breakit.test.ts` (template sync on the real bridge Code.js in a VM), `tests/breakitStore.test.tsx` (200-step store storm), `tests/breakitUi.test.ts`, BK-SW-01/02 in `tests/v05.test.tsx`, BK-TP-01 in `tests/templateMaker.test.tsx`.
Viewports: 320×568, 412×915 (phone, 3x), 1920×1080; Night, Day and High contrast.

## Bugs

| ID | Severity | What | Status |
|---|---|---|---|
| B-P10-SWIPE | P1 | A sideways swipe that ended off the tick box was lost, and the box went on showing a tick that was never saved (count unchanged). An overshooting two-date swipe ticked only the first box. | FIXED beta.4 (BK-SW-01/02) |
| B-P10-REDO | P2 | Redo never brought back an undone date move, new date or topic edit. | FIXED beta.4 (BK-STORE-01/02) |
| B-P10-SYNCRACE | P2 | A template edit made while a sync push was in flight was marked as sent and never reached the other device. | FIXED beta.4 (BK-SYNC-01/02) |
| B-P10-TEXT12 | P2 (standing rule) | 12 px text: dock labels, Pending, YOUR CLASS, A–Z letters, footer, SMS, date chip labels. | FIXED beta.4 (BK-UI-01) |
| B-P10-SEG44 | P3 (standing rule) | The 1\|2 date buttons were 36×36 px. | FIXED beta.4 (BK-UI-02) |
| B-P10-NEWNAME | P3 (a11y) | After ＋ New, the header button and the new pill had the same name, "New template". | FIXED beta.4 (BK-TP-01) |
| B-P10-CLOCK | P3 | Template sync trusts device clocks; a device whose clock runs ahead keeps its own templates over others' newer edits until real time catches up. | OPEN (logged) |
| Q-FOCUS | P3 (design) | An update found before the first tap of a session applies at once, also on returning to an untouched app. | OPEN (Steve's open question 1) |

## Checks that held on beta.3
Rapid ticks (40 taps; header count = ticked rows, survives reload) · undo/redo storm (10 each way, Ctrl+Z) · Reschedule by the dials (ticks move with the date; collision note on an existing date; Undo restores) · offline/online flips while ticking and an offline reload (service worker) · copy path on a flaky stand-in bridge (30 taps while the bridge drops in and out; UI = server after reconnect; save dot "All saved to the test copy") · past-year view-only (taps, swipe, Ctrl+Z/Y, Space, date sheet, hold menu: nothing written, no storage keys touched; Back to now) · long share message warning at 1600 characters and targets off when empty · template abuse (duplicate names stay unique, 40-character name capped at 24, unknown token flagged, the last template can't be deleted) · keyboard ArrowDown + Space · search with typos/markup · A–Z jump · a 63-character pupil name does not widen the grid · no horizontal overflow at 320, 412 or 1920 px in Night, Day or High contrast · no JS errors.

## Parity with the old SoW app (Stable v0.47.1, docs/FEATURE_REFERENCE.md)

| Old app feature | Driftline v0.8 | Gap |
|---|---|---|
| Submitted mode (manual Submitted flag, M key) | Submitted = Set | GAP (decision t5u→v0.8: not carried; share uses set) |
| Roster page: mark pupils Left/Active (synced) | Left pupils hidden, no editor | GAP |
| History page (past mark sessions) | Past sessions preview (flag, demo only) | PARTIAL |
| Subjects page (tabs found on the sheet) | Classes from Subjects, no page | GAP |
| Tick all / Untick all per date | none | GAP |
| Long-press a name → select mode + Select bar | none (name tap = full-name toast) | GAP |
| Delete a date (🗑 with mark count + Undo) | Reschedule / New only | GAP |
| Restore snapshot: amber confirm with ticks then/now | native confirm, no counts | PARTIAL |
| Keyboard shortcuts sheet (?) | keys work, no sheet | GAP |
| Appearance: colour themes, contrast slider, Reduce motion, Haptics | Night/Day/Auto, Contrast Standard/High | PARTIAL (Reduce motion missing) |
| Sync: Check connection with sheet label + bridge version, clock warning | status dot and connection page | PARTIAL |
| Dev: bridge URL override, A–Z hide dimmed / HUD, keyboard auto-advance, swipe-from-name fraction, swipe cue styles, academic year start month | A–Z side, swipe on/off, letter bubble, past sessions | GAP (most are tuning options) |
| Shorthands (KGA/KGB prefix toggle) | {notebook} migration only | WAITING (Phase 5, Steve's list) |
| Open tabs check for updates every 5 min | check on return to the app | PARTIAL (by design, Q-FOCUS) |
| Desktop wide-scale (innerHeight/600) | desktop layout with Weeks | DIFFERENT (by design) |
| Pair / Join / Import, quick search, A–Z, undo/redo, snapshots, share templates, channel label, PWA install | present | none |
