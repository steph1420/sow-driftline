# Changelog
## 0.2.0-beta.1 — 2026-11-04
D1: first usable thing, **read only**.
- Checklist grid in the r4 locked look: name column 50% on phone, one line with ellipsis, tap a name for the full-name toast; max 2 date columns on phone portrait (desktop up to 9); soft-blue "N to go"; A–Z rail and "Find a name" search jump to the full name; earlier/later date buttons.
- Dynamic Today / Upcoming / Last chip in the bar (jumps the date columns only).
- RosterSource adapter: `sheetBridgeSource` (test-copy bridge, actions `ping`/`pull`/`pairClaim` only, refuses any sheet that is not the test copy) and a demo `fakeSource` with made-up names. A roster-DB adapter can replace it later.
- More: connect the test copy with a 6-digit pairing code (token stays on the device), Refresh, Back to demo; Night/Day/System.
- Class switcher lists classes found on the sheet. `?demo` forces demo data (used for screenshots).
- Tests: 26 (15 new D1 tests written first). D0-STO-01 and D0-SHL-03 updated: the demo now has dates.
## 0.1.0 — 2026-11-04
D0 empty shell (Stable). Same content as 0.1.0-beta.1.
## 0.1.0-beta.1 — 2026-11-04
- D0: slim 56px bar (class pill, Undo/Redo, More), Dock (Checklist · Overview · More), calm "No dates yet" empty state, in the r4 locked look.
- Single zustand store, config module (locked timings and layout), Driftline kit v0.3.0 tokens vendored.
- Own namespace: `sow-driftline:*` storage keys, own PWA scope and cache id. Demo data only, no sheet calls.
- Tests: config, store, shell, token purity (11).
