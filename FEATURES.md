# Driftline: Features and Functions

This sheet is the single reference for what the app does. It feeds three things:
1. **Help file.** Read the "What you see" and "How to use it" lines.
2. **Feature tour.** Use the "Tour" line on each feature; the tour order is at the end.
3. **New features and debugging.** Use the "Rules", "Data", "Code", "Tests" and "Mock" lines.

Status tags:
- **LIVE (Beta v0.6.0-beta.1)** means it is shipped now.
- **v0.7.0 (building)** means it is locked by Steve and being built for v0.7.0-beta.1.
- **Deferred** means agreed but parked.

Mock paths point to `docs/mockups/` in this repo; the source folders are `/workspace/sow-mockups/` on the build box. All mocks use made-up names only.

House rules that apply to every feature:
- Driftline works with the **test copy** sheet only. The live sheet is refused in code (`allowedSheets`).
- No tokens are ever in the build or the repo.
- Every timing and size number lives in `src/config/index.ts`.
- Storage keys always go through `storageKey()`, so they look like `sow-driftline:*` or `sow-driftline-beta:*`.

---

## 1. Shell and navigation

### F-SH-01 Top bar
- **Status:** LIVE. Redesigned in v0.6.1/v0.7 (back arrow on Checklist, class pill, Undo/Redo, ⋮).
- **What you see:** A slim 56px bar with the class pill (class letter and subject ⌄), the Today/Upcoming/Last chip, Undo ↶, Redo ↷ and the ⋮ menu.
- **How to use it:**
  - Tap the class pill to switch class.
  - Tap the date chip to jump the grid back to that date.
  - ⋮ opens the view menu.
- **Rules:**
  - The chip comes from `pickAnchor`: today's date if there is one, else the next upcoming date, else the last date.
  - In v0.7 the sheet chooses the date, and the bar chip is replaced by the date header (F-CL-02).
- **Code:** `src/shell/Bar.tsx`
- **Tests:** `tests/shell.test.tsx`, `tests/d1.test.tsx`
- **Mock:** `docs/mockups/v061/menu-phone-night.png`
- **Tour:** "This is your class. Tap it to switch."

### F-SH-02 Dock
- **Status:** LIVE
- **What you see:** A floating dock with Overview ◎, Checklist ✓ and More ⋯. In v0.7 the order is Overview first, as in the v0.7j mocks.
- **How to use it:** Tap a tab. The highlight pill slides to it; motion is reduced if the device asks for less motion.
- **Code:** `src/shell/Dock.tsx`
- **Tests:** `tests/shell.test.tsx`
- **Tour:** "Three places: your classes, the checklist, and settings."

### F-SH-03 Night / Day / System look
- **Status:** LIVE
- **What you see:** A dark navy Night look and a light Day look; System follows the device.
- **How to use it:** More › Look.
- **Rules:**
  - Remembered on this device (`prefs`).
  - Adding `?side=night|day` to the address forces a look for screenshots.
- **Code:** `App.tsx` (`data-theme`), `store.setSide`
- **Mock:** every `*-day.png` and `*-night.png` pair.

### F-SH-04 Footer line
- **Status:** LIVE. **v0.7.0 (building):** the v0.6.1 lock says no "waiting to save" text.
- **What you see:** "Driftline · Beta · v… · test copy". In v0.7 the save state is shown only by the status dot (F-SY-02).
- **Code:** `App.tsx` (`saveText`)

### F-SH-05 PWA install and auto-update
- **Status:** LIVE
- **Rules:**
  - The app has its own service-worker scope and cache id, so it never touches /sow/ caches.
  - Updates install automatically.
- **Code:** `vite.config.ts`, `main.tsx`

---

## 2. Overview (v0.7j: your class list)

### F-OV-01 All-classes list
- **Status:** v0.7.0 (building). It replaces the v0.6 cards, the progress bars and the Done/To go/Waiting block.
- **What you see:** "Your classes", with one squircle card per class and subject. Each card shows:
  - class, subject and a **type pill** (CW/HW/Test) on the title row;
  - the topic;
  - the date line ("Today · Wed, 4 Nov");
  - the to-go counter ("10 to go ›", or "✓ All in").
- **Rules:**
  - Every class on the sheet appears, including finished and future ones.
  - The order is stable, with today's classes first.
  - Each card shows its *current session*: today's, else the earliest future one, else the latest past one.
  - Cards carry **no late chips, warnings, amber, progress bars, avatars or pupil totals** (Steve t82u).
  - Weekday names are always generated from the date.
- **Data:** read-only from `SheetState` (subjects, sessions, ticks, roster).
- **Code (planned):** `src/screens/Overview.tsx`, `src/data/overview.ts` (`overviewCards`)
- **Tests (planned):** `tests/v07.test.tsx` (V07-OV-01..05)
- **Mock:** `docs/mockups/v07j/overview-phone-night.png`, `overview-phone-day.png`, `overview-desktop-night.png`
- **Tour:** "All your classes, one card each. Tap one to start marking."

### F-OV-02 Tap a card to open its checklist
- **Status:** v0.7.0 (building)
- **What you see:** Tapping anywhere on the card opens Checklist on that class *and that exact session*.
- **Rules:** The open action carries both the class and the session. It never falls back to the last-opened date.
- **Code (planned):** `store.openSession(classKey, sessionId)`
- **Tests:** V07-OV-03
- **Mock:** `docs/mockups/v07j/checklist-landing-phone-night.png`

### F-OV-03 Squircle card shape
- **Status:** v0.7.0 (building)
- **Rules:**
  - Each corner is a superellipse drawn as an SVG path, about 26px; no `border-radius`.
  - The same path draws the fill, the 1px outline and the tap highlight, so they always line up.
  - The path is redrawn when the screen is resized.
- **Code (planned):** `src/screens/Squircle.tsx`

### F-OV-04 Week path for one class (corner button)
- **Status:** v0.7.0 (building)
- **What you see:** A small path icon (44×44 tap area) in each card's top-right corner. It opens a sheet showing a thin line through that class's sessions:
  - today is a blue node;
  - past and upcoming sessions are quieter;
  - each stop shows the type, topic and to-go count.
- **How to use it:**
  - Tap a stop to open its checklist.
  - Scroll down for older weeks, which have quiet dividers ("Last week · 26 Oct – 1 Nov", "19–25 Oct").
  - Close with ✕, swipe down, Esc or a tap outside.
- **Rules:**
  - Only that one class (and subject) is shown.
  - The pinned heading follows the week in view.
  - The corner button never triggers the card tap underneath it.
- **Code (planned):** `src/screens/WeekPath.tsx`, `src/data/overview.ts` (`weekPath`)
- **Tests:** V07-WP-01..04
- **Mock:** `docs/mockups/v07j/week-path-phone-night.png`, `week-path-older-phone-night.png`, `week-path-older-phone-day.png`
- **Tour:** "Tap the little path to see this class's week, and scroll for older weeks."

### F-OV-05 + New date
- **Status:** v0.7.0 (building), from the v0.7b lock.
- **What you see:** A quiet "+ New date" action. It opens the date sheet (F-DT-01), already set to the class's next class day.
- **Rules:**
  - It never makes two sessions with the same label (CW/HW/Test) on the same day; it shows the collision note instead (F-DT-05).
  - Classes come from the sheet; nothing is hard-coded.
- **Mock:** `docs/mockups/v07b/add-phone-night.png`, `dup-phone-night.png`, `dates-phone-night.png`

---

## 3. Checklist

### F-CL-01 Ticking grid
- **Status:** LIVE. The v0.6.1/v0.7 look is a single-date card list (see the mock).
- **What you see:**
  - Pupil names in roll order and one tick box per pupil per date.
  - Phone shows 2 dates and desktop shows 3 (9 with Weeks).
  - In v0.7, ticks are **blue**.
- **How to use it:** Tap a box to tick or untick it.
- **Rules:**
  - A tick is one cell, identified by session and roll.
  - When two changes meet, the newer `updatedAt` wins.
  - Future dates show soft empty boxes.
- **Data:** `tick(sessionId, roll)` writes through the one write path (F-SY-01).
- **Code:** `src/screens/Checklist.tsx`, `src/data/model.ts` (`toChecklist`, `toGo`, `pickAnchor`, `visibleCols`)
- **Tests:** `tests/d1.test.tsx`, `tests/d2.test.tsx`
- **Mock:** `docs/mockups/v07d/late-blue-phone-night.png`, `checklist-desktop-night.png`
- **Tour:** "Tap a box when a copy comes in."

### F-CL-02 Date header and calendar button
- **Status:** v0.7.0 (building), from the v0.7d lock.
- **What you see:** The subject as a heading, "HW · Wednesday 4 November" under it, and a calendar button that opens the date sheet (F-DT-01).
- **Mock:** `docs/mockups/v07d/late-blue-phone-night.png`

### F-CL-03 Split counter: Done | To go
- **Status:** v0.7.0 (building), from the v0.6.1 lock.
- **What you see:** One curved pill split in two, "14 Done ⌄" and "10 To go ⌄". Each half is a button that opens a tidy names panel with "Show all N".
- **Rules:** Done plus To go always equals the number of active pupils for that session.
- **Mock:** `docs/mockups/v061/qo2-phone-night.png`, `qo3-phone-night.png`

### F-CL-04 Swipe to tick
- **Status:** LIVE
- **How to use it:**
  - Press a box and drag up or down the same column; every box you cross takes the first box's new value.
  - The whole swipe is one Undo step.
  - A small wobble still counts as a tap.
- **Rules:** It engages after 10px (`swipeEngagePx`). Developer option: Swipe to tick.
- **Code:** `src/screens/paint.ts`, `Checklist.tsx`
- **Tests:** `tests/v05.test.tsx`

### F-CL-05 A–Z rail and grip
- **Status:** LIVE
- **What you see:** A letter strip in its own gutter, showing only letters that have names, with a bubble while you scrub and a three-line grip above it.
- **How to use it:**
  - Tap or scrub a letter to jump to the first name with that letter (an empty letter goes to the next one).
  - Tap the grip, or drag it sideways, to move the strip to the other side.
- **Code:** `src/screens/AzRail.tsx`
- **Tests:** `tests/rail.test.tsx`

### F-CL-06 Find a name (quick search)
- **Status:** LIVE
- **How to use it:** Tap "Find a name", press `/`, or (on desktop) just start typing.
- **Rules:**
  - Matches are ranked in this order: roll number, first name, other word, several words, initials, part of a name, letters in order, one typo.
  - It ranks names but never hides any.
  - A single letter jumps like the A–Z rail.
  - The found name is centred and flashes.
  - Esc or Enter closes the search.
- **Code:** `src/data/quickSearch.ts`, `src/screens/scroll.ts`
- **Tests:** `tests/quickSearch.test.ts`, `tests/v05.test.tsx`

### F-CL-07 Name toast and twins
- **Status:** LIVE
- **How to use it:** Tap a shortened name to see it in full.
- **Rules:** Pupils with the same name are told apart by roll number: a small #roll shows, and the toast includes it (Q-DUP-1).

### F-CL-08 Keyboard
- **Status:** LIVE
- **Keys:**
  - Arrows, Home, End, PgUp and PgDn move between boxes.
  - Space or Enter ticks.
  - Ctrl/Cmd+Z undoes; Ctrl+Y or Ctrl/Cmd+Shift+Z redoes.
  - `/` opens search.
  - ⇧O opens the quick overview.
- **Code:** `src/screens/keyboard.ts`, `App.tsx`

### F-CL-09 Weeks view
- **Status:** LIVE (off by default)
- **Rules:**
  - Turn it on in ⋮ › Weeks.
  - It works on desktop or a phone held sideways, showing up to 9 dates with a thin line where each week starts.
  - It is remembered on this device (`view`).
- **Code:** `model.dateColsFor`
- **Tests:** `tests/v06.test.tsx`

### F-CL-10 Quick overview sheet
- **Status:** LIVE. The v0.6.1 look adds a ✕ close button and a swipe up from the tab.
- **How to use it:**
  - Open it by swiping up on the handle above the dock, pressing ⇧O, or ⋮ › Quick overview.
  - Close it by swiping down, pressing Esc, tapping ✕ or tapping outside.
- **What you see:** The class and date, the split counter (F-CL-03), "Still to come in" names, and Share.
- **Code:** `src/screens/Overview.tsx` (`QuickSheet`, `Summary`)
- **Tests:** `tests/v06.test.tsx` (V06-QO-*)
- **Mock:** `docs/mockups/v061/qo-phone-night.png`, `qo2-*`, `qo3-*`

### F-CL-11 Share the list
- **Status:** LIVE
- **How to use it:** Tap Share to use the phone's share sheet (WhatsApp on desktop). Copy puts the pending list on the clipboard.
- **Code:** `src/data/share.ts`

### F-CL-12 One-time gesture hints
- **Status:** v0.7.0 (building), from the v0.7d lock.
- **Rules:**
  - Each hint shows once per device and is dismissible: swipe to tick, A–Z grip, quick overview swipe, and the week path.
  - There is no permanent help text.
- **Data:** `storageKey('hints')`
- **Mock:** `docs/mockups/v061/hint-phone-night.png`

---

## 4. Late submissions and back-date (v0.7d lock)

### F-LT-01 Late rule
- **Status:** v0.7.0 (building)
- **Rules:**
  - A copy is **late** if it is marked after **midnight IST at the end of the session's scheduled day**.
  - This is re-checked whenever dates, ticks or sync change, because a scheduled date can move.
  - Ticks with no known marked time are never guessed to be late.
- **Code (planned):** `src/data/late.ts` (`dueEndMs`, `isLate`, `markedDay`)
- **Tests:** V07-LT-01..06

### F-LT-02 Mode pill: "Marking late submissions" / "Marking on back-date"
- **Status:** v0.7.0 (building)
- **What you see:** A small pill above the dock. It appears **only** when the open session's due time has passed.
- **How to use it:** Tap the pill to switch between "Marking late submissions" (the default) and "Marking on back-date".
- **Rules:**
  - The pill goes back to late mode when you open another date, except when you only quickly switch dates (Steve t79u 2.2).
  - "Quickly" means you return to a date within `config.timing.modeKeepMs` of leaving it.
- **Mock:** `docs/mockups/v07d/late-blue-phone-night.png`, `back-blue-phone-night.png`, `quick-blue-phone-night.png`

### F-LT-03 Late Submission toast
- **Status:** v0.7.0 (building)
- **What you see:** A "Late Submission" toast that can be swiped away whenever you tick in late mode.

### F-LT-04 Amber notch on late ticks
- **Status:** v0.7.0 (building)
- **What you see:** A small amber corner notch on a blue tick that was marked late.
- **Rules:** The notch appears only on ticks, never on cards (F-OV-01).

### F-LT-05 Mark on back-date
- **Status:** v0.7.0 (building)
- **Rules:**
  - In back-date mode, a tick is recorded as marked on the scheduled day, so it is **not late**.
  - Use it when the copy was handed in on time but you didn't mark it before the due date.
- **Data:** a per-tick marked day (`markedOn`), kept separately from `updatedAt` so that the "newer wins" sync rule is untouched. See the plan for where it is stored.

---

## 5. Dates (v0.7f/g lock)

### F-DT-01 Change date sheet
- **Status:** v0.7.0 (building)
- **What you see:**
  - A short sheet with the existing-date chip strip; the calendar is the last chip.
  - The quiet line "14 ticks · Letters M & N ✎".
  - Three wheels in the order **Month | Date | Day**, a small year pill, and Cancel next to the action button.
- **Rules:**
  - The button stays dim until something changes. Then it reads "Move to Fri 6 Nov" or "Save topic".
  - Tapping outside the sheet cancels it.
  - The edited chip updates live and has a dashed outline.
  - Ticks move with the date, and a toast appears after saving.
- **Mock:** `docs/mockups/v07g/untouched-phone-night.png`, `edited-*`, `topic-editing-*`, `cross-year-*`, `collision-*`; `docs/mockups/v07f/*`

### F-DT-02 Wheels: Month | Date | Day
- **Status:** v0.7.0 (building)
- **Rules:**
  - Every wheel spins.
  - Spinning the **Day** wheel moves to that weekday in the same week (Monday to Sunday).
  - Tapping a value that isn't centred snaps it to the centre and selects it.
  - The Date wheel is clamped to the length of the month.
- **Code (planned):** `src/data/dial.ts` (`spinMonth`, `spinDate`, `spinDay`)
- **Tests:** V07-DL-01..06

### F-DT-03 Year pill
- **Status:** v0.7.0 (building)
- **Rules:** The pill is quiet for the current year and accented for any other year. Tap it to change the year.

### F-DT-04 Existing-date chips
- **What you see:** A strip of chips for the class's existing dates, ending with a calendar chip.
- **How to use it:** Tap a chip to open that date.

### F-DT-05 Collision note
- **Rules:**
  - Moving or adding a session onto a day that already has the same label shows a gentle note, and the button is disabled.
  - Two different labels on the same day are allowed.

### F-DT-06 Edit topic
- **How to use it:** Tap the topic line to edit it in place. Saving it is a separate action from moving the date.

### F-DT-07 Old-date look
- **Status:** v0.7.0 (building)
- **Rules:** Opening a past date uses a clearly different look (amber is locked for old dates), so it's obvious this is old data.

---

## 6. Saving, sync and safety

### F-SY-01 One write path and auto-save
- **Status:** LIVE
- **Rules:**
  - When connected to the copy, ticks go to the engine: an offline queue, one writer across tabs (Web Locks), and a broadcast so every tab hears every tick.
  - Saving starts after a 3-second grace period and retries every 15 seconds.
  - Waiting ticks are sent when the app is hidden or comes back online.
  - In demo mode, ticks stay on the device (`demoTicks`).
- **Code:** `src/sync/engine.ts`, `outbox.ts`, `ops.ts`, `store.write`
- **Tests:** `tests/d2.test.tsx` (D2-TAB-01 and others)

### F-SY-02 Status dot
- **Status:** LIVE
- **What you see:** A small dot on the class pill: saved, saving, offline or not-saved. Its label says which, for screen readers.
- **Rules:** The v0.7 lock removes save text everywhere else.

### F-SY-03 Quick sync
- **Status:** LIVE
- **Rules:**
  - The app pulls every 4 seconds while visible, and right away on focus or when coming back online.
  - Merging is per box, newest wins, and ticks still waiting to save are never overwritten.
- **Code:** `src/sync/poller.ts`, `ops.mergeNewest`

### F-SY-04 Undo / Redo
- **Status:** LIVE
- **Rules:** Kept on the device across restarts, up to 200 steps. A swipe counts as one step.
- **Code:** `src/sync/history.ts`

### F-SY-05 Snapshots and Restore
- **Status:** LIVE
- **Rules:**
  - A snapshot is taken on open and every 10 minutes; 12 are kept.
  - More › Snapshots › Restore saves a "Before restore" snapshot first.
- **Code:** `src/sync/snapshots.ts`

### F-SY-06 Connect to the test copy
- **Status:** LIVE
- **How to use it:**
  - Type a 6-digit pairing code from SoW Beta › Setup › Pair a device.
  - Or open a setup file shaped `{"kind":"sow-driftline-setup","bridgeUrl","token"}`.
- **Rules:**
  - The connection is accepted only if the bridge's ping reports the copy's sheet id.
  - The token stays on the device.
  - Adding `?demo` to the address forces demo data.
- **Code:** `src/data/sheetSource.ts`, `setup.ts`, `More.tsx`

### F-SY-07 Devices list
- **Status:** LIVE (needs bridge 0.50.0-dl.1 on the copy)
- **What you see:** More › Devices shows each device's name and when it was last seen, with Remove.
- **Code:** `src/data/devices.ts`
- **Docs:** `docs/DEVICE_REGISTRY_PLAN.md`

### F-SY-08 Save/Load backup file
- **Status:** Deferred (Steve t79u: "save saving for later").

---

## 7. More

### F-MO-01 Data card
Connected or demo state, Refresh, and Back to demo.

### F-MO-02 This device
The device name and the Stable/Beta channel switch.

### F-MO-03 Developer options
A–Z rail side, Swipe to tick, and Letter bubble.

### F-MO-04 Look
Night, Day or System.

---

## 8. Data model (for debugging)

### Sheet state
`SheetState` contains subjects, roster, sessions and ticks (contract 1, bridge 0.46+).
- `sessionId` is `subjectKey|YYYY-MM-DD`.
- `tickId` is `sessionId|roll`.

### Bridge actions the app may call

| Kind | Actions |
|---|---|
| Read | `ping`, `pull`, `pairClaim`, `devicesList` |
| Write | `push`, `deviceRevoke`, `deviceRename` |

The bridge's `push` also accepts `structs` of kind `rename` (moves a session and its ticks) and `delete`. v0.7 adds struct writes for Change date. Adding a date and saving a topic need a bridge update: see `docs/v0.7.0-plan.md` §Bridge.

### Storage keys
All keys are `storageKey(name)`:
`prefs`, `copyToken`, `copyBridge`, `dev`, `demoTicks`, `view`, `deviceName`, `outbox`, `undo-{demo|copy}`, `snapshots-{demo|copy}`, plus `hints` and `marks` in v0.7.

### Screenshot overrides
Add these to the address: `?demo`, `?today=YYYY-MM-DD`, `?side=night|day`.

---

## 9. Debugging checklist
- **Wrong date chosen:** check `pickAnchor` against `?today=`.
- **Wrong weekday shown:** every weekday comes from `fmtDay`/`Intl` on the ISO date; never type one by hand.
- **Tick won't save:** check the status dot, then More › Data for the error text, then `outbox` in storage.
- **A tick "comes back" after Undo:** check `updatedAt` in `mergeNewest`. The time is strictly increasing because of `nowIso`.
- **Late notch wrong:** check `late.isLate(markedAt, sessionDate)`, which uses the end of the day IST (UTC+5:30), not the device's time zone.
- **Release check:** a release counts only when Actions is green **and** the Beta bundle hash has changed.
- **Records:** break-it runs are in `docs/BREAK_IT_*.md` and known bugs are in `BUGS.md`.

---

## 10. Feature tour order (v0.7)
1. F-OV-01 Your classes
2. F-OV-02 Tap to open
3. F-OV-04 Week path
4. F-CL-01 Tap to tick
5. F-CL-04 Swipe to tick
6. F-CL-03 Done | To go
7. F-CL-05 A–Z
8. F-CL-06 Find a name
9. F-LT-02 Late pill
10. F-DT-01 Change date
11. F-CL-10 Quick overview
12. F-SY-02 Status dot
