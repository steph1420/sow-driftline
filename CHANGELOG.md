# Changelog
## 0.7.0-beta.3 — 2026-11-08
Steve t119u–t122u. Beta only.
- Swipe to tick now runs sideways along one name's row: on the phone with one date it ticks that box; across two dates it ticks that name on both. Up-and-down just scrolls.
- ⋮ menu: "Dates on phone 1 | 2", remembered on this device (default 1).
- The date heading (e.g. "HW · Wed 4/11") shows above the tick column on the phone too.
- Tests: 149 app (V05-SW-01 changed for the new direction).
## 0.7.0-beta.2 — 2026-11-08
Steve t112u/t113u. Beta only.
- The app opens on Overview the first time, then reopens on the last tab used on this device.
- "Change date" is now called Reschedule (t110u).
- Tests: 145 app (V06-OV-04 and D0-STO-01 changed for the new start screen).
## 0.7.0-beta.1 — 2026-11-08
Steve t88u GO, t111u release. Beta only, test copy only.
- Overview first: squircle card per class, subject and type (pill), with topic, date and "N to go"; tap a card to open its checklist, corner path icon opens that class's week path (scrolls into older weeks, heading follows the week in view).
- Checklist: heading with class, subject, type and date; Done | To go split counter; "Pending only" toggle in the bar; blue ticks; quiet save (no "waiting to save" text).
- Dates sheet (calendar button): date chips (amber for past dates), Reschedule (Month | Date | Day wheels, year pill, editable topic, live chip, collision note, Cancel, Undo) and + New date (next class day picked for you, no duplicate of the same type on a day).
- Late submissions: ticks after midnight IST at the end of the scheduled day get an amber notch and a swipeable "Late Submission" toast; a mode pill switches to "Marking on back-date" for copies set but unmarked before due.
- One-time hints (swipe-tick, A–Z grip, quick look, week path); ✕ is remembered.
- Icons and strings moved to src/ui/icons.tsx.
- Known: reschedules, new dates, topics and late marks are kept on this device until bridge 0.51.0-dl; CW/HW/Test label chips dropped (each card is one type).
- Tests: 145 app.
## 0.6.0-beta.1 — 2026-11-04
Steve t169u. Beta only.
- Weeks (the wide many-date grid that read as a "week view" on desktop) is now a switch in the ⋮ view menu, OFF by default, remembered on this device. Off: desktop shows 3 dates, phone 2. On: up to 9 dates with a thin line where a new week starts, on desktop and phone held sideways only (phone upright always 2). ⋮ now opens this small view menu (Weeks · Quick overview · More…) instead of jumping straight to More.
- Overview page: one card per class with the Today/Upcoming/Last date, soft-blue "N to go" and progress; tap a card → that class on Checklist at that date. Below: Done / To go / Waiting, "Still to come in" (first 5, then "Show all"), and Share footer (Copy · Share) with the v0.47 Pending text.
- Quick overview sheet on Checklist: swipe up on the small handle above the dock, ⇧O, or ⋮ › Quick overview; swipe down on its handle, Esc or tap outside closes. (Plain "o" on desktop still starts a name search.)
- Removed the dormant Stable→LIVE connection code: copy-only everywhere until Steve says otherwise.
- Break-it fix: the swipe-up handle now keeps tracking the finger after it leaves the handle (found by the break-it run; test V06-QO-03).
- Tests: 85 app + 4 bridge. Break-it 101/101 (docs/BREAK_IT_v0.6.md).
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
