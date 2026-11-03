# Changelog
## 0.5.0-beta.1 — 2026-11-04
Ported from /sow/ (Steve t163u). Beta only.
- Swipe to tick: press a box and drag up/down the same column; every box crossed gets the first box's new value; one Undo step. Small wobble = tap. Developer option "Swipe to tick".
- A–Z / search jump puts the name in the middle of the list (near the top it stays where it lands) and flashes it.
- Quick search pill: on desktop just type anywhere; "/" or the Find button everywhere. Ported /sow/ ranking (roll, first name, initials, partial, typos). One letter = A–Z jump. Esc/Enter closes.
- Keyboard: arrows/Home/End/PgUp/PgDn move between boxes, Space/Enter ticks, Ctrl/Cmd+Z undo, Ctrl+Y or Ctrl/Cmd+Shift+Z redo, "/" search.
- More: device name, Stable/Beta channel switch, Devices list (name, last seen, Remove) when the bridge supports it; otherwise a calm "needs the bridge update" note.
- bridge/Code.js = COPY bridge 0.50.0-dl.1 (0.46.2 + device registry, additive). Not deployed — steps in docs/BRIDGE_DEPLOY_v0.50.0-dl.1.md.
- Guard: Stable may use LIVE + test copy; Beta = test copy only; devices never on LIVE. Beta now has its own storage namespace (`sow-driftline-beta:*`), so Beta and Stable never share token/queue on github.io (Beta demo ticks from 0.3–0.4 start fresh).
- Tests: 78 app + 4 bridge (old /sow/ bridge suite 63/63 also passes on the new bridge file).
## 0.4.0-beta.1 — 2026-11-04
"A working app now" (Steve t155u/t156u). Beta only.
- A–Z grip restored (old /sow/ look and behaviour): a three-line handle above the rail; tap moves the strip to the other side, drag sideways and it snaps to the nearest edge.
- A–Z rail shows only letters that have names; they spread to fill the rail.
- Quick sync: while connected, the app pulls every 4 s (config `quickSyncMs`), paused when hidden, and pulls at once on focus/visible/online. Merge is per box, newest wins; ticks still waiting to save are never overwritten.
- Desktop: the date header now sticks below the bar, so a jump never tucks it under.
- docs/DEVICE_REGISTRY_PLAN.md (deferred; needs an Apps Script deploy).
- Tests: 46 (5 new + 2 changed, written first), incl. an end-to-end test against a faithful bridge mock (ping/pull/push).
## 0.3.0-beta.1 — 2026-11-04
Rail fix + D2 in one Beta release (Steve t154u). Stable stays 0.1.0.
- A–Z rail (t146u, t151u 1A): fixed in its own gutter, full height between bar and dock, never scrolls with the list; all 26 letters fit the screen, only letters present are active; tap or drag-scrub jumps to the first full name of that letter (an empty letter goes to the next one) with a letter bubble; phone and desktop. Developer options: rail side, bubble on/off.
- D2 ticking: tap a box to tick/untick. Auto-save to the TEST COPY only (re-checked on every save; the live sheet is refused) with a subtle status dot + footer (all saved / saving / offline · N waiting); offline queue on the device, retried and sent on reconnect or when the app is hidden.
- B-B4-1 fix: only changed cells are sent, one writer at a time across tabs (Web Locks), every tab hears every tick (BroadcastChannel) and merges per cell (newer wins), so two tabs never overwrite each other.
- Automatic on-device snapshots (on open + every 10 min when changed; 12 kept) with a Restore list in More; Restore keeps a "Before restore" snapshot first.
- Undo/Redo in the bar, kept on the device across restarts.
- Q-TOK-1: connect by pairing code or by opening a setup file (`{"kind":"sow-driftline-setup","bridgeUrl","token"}`); accepted only if it is the test copy; token stays on the device.
- Q-DUP-1: rows keyed by roll number; when two names match, a subtle #roll shows and the toast says the roll.
- Demo stays the default (2B): demo ticks save on this device only.
- Uses the existing bridge `push` action — no Apps Script change needed.
- Removed committed tsconfig.tsbuildinfo (now ignored).
- Tests: 41 (15 new, written first). D1-UI-02 now checks read-only only when no tick handler is given.
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
