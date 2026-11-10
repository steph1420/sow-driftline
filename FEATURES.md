# Driftline: Features and Functions

This sheet is the single reference for what the app does. It feeds three things:
1. **Help file.** Read the "What you see" and "How to use it" lines.
2. **Feature tour.** Use the "Tour" line on each feature; the tour order is at the end.
3. **New features and debugging.** Use the "Rules", "Data", "Code", "Tests" and "Mock" lines.

Status tags:
- **LIVE (Beta v0.8.0-beta.N)** or **LIVE** means it is shipped now.
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
- **Status:** LIVE (Beta v0.8.0-beta.1), G5d look (L-20261108b).
- **What you see:** A slim bar with the two-line class chip ("KG-A English · HW", topic under it, ⌄, save dot), a search magnifier and ⋮. Under it on Checklist: Pending · 1|2 (phone) · bare Undo ↶ / Redo ↷.
- **How to use it:**
  - Tap the class chip to switch class / subject.
  - Tap the magnifier to search names (F-CL-06).
  - ⋮ opens the view menu (Weeks · Quick overview · More…).
- **Rules:**
  - The topic is the checklist's focused date (`focusColumn`: the picked date, else today → next → last).
  - Dates on phone 1|2 is remembered on this device (default 1).
- **Code:** `src/shell/Bar.tsx`, `src/screens/ChecklistControls.tsx`
- **Tests:** `tests/shell.test.tsx`, `tests/v08.test.tsx` (V08-P1-01/02)
- **Mock:** `docs/mockups/v08/G5d-slim.png`
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
- **Status:** LIVE. **v0.7.0-beta.1:** the v0.6.1 lock says no "waiting to save" text.
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

### F-OV-01 Class cards (O2g)
- **Status:** LIVE (Beta v0.8.0-beta.2), L-OVERVIEW O2g. Replaces the v0.7j squircle cards.
- **What you see:** "Overview" with today's date ("Wed 4 Nov"), then one card per class + subject + type:
  - title "KG-A · English HW", with an amber dot when an older date still has copies to come in;
  - a big "14/24" for today (a dash when the date is still ahead);
  - the topic ("Next: …" when ahead);
  - date tabs: today and this week's dates ahead (max 3; else the first one ahead), the first underlined; ＋; All ›.
- **Rules:**
  - Cards with a date today come first; the order is otherwise stable.
  - Weekday names are always generated from the date.
- **Data:** read-only from `SheetState`.
- **Code:** `src/screens/Overview.tsx`, `src/screens/OverviewCard.tsx`, `src/data/overview.ts` (`overviewCards`)
- **Tests:** `tests/v07.test.tsx` (V07-OV-01..06), `tests/v08.test.tsx` (V08-P4-01..03)
- **Mock:** `docs/mockups/v08/O2g-overview.png`

### F-OV-02 Tap a card or a date to open its checklist
- **Status:** LIVE (Beta v0.8.0-beta.2)
- **What you see:** Tapping the card opens Checklist on its current date; tapping a date tab opens that exact date.
- **Rules:** The open action carries both the class and the session (`store.openSession`).
- **Tests:** V06-OV-02, V08-P4-05

### F-OV-03 Filter chips
- **Status:** LIVE (Beta v0.8.0-beta.2)
- **What you see:** All · each class · a divider · each type (CW, HW, Test). One class and one type can be on together; tapping an on chip turns it off; All clears both.
- **Rules:** Chips come from the sheet; nothing is hard-coded. Not remembered between visits.
- **Tests:** V08-P4-04

### F-OV-04 All dates (O2e; replaces the week path)
- **Status:** LIVE (Beta v0.8.0-beta.2), L-OVERVIEW O2e. The v0.7 week path sheet and its corner icon are gone.
- **What you see:** "KG-A · English HW", "All dates · newest first", ＋ Add date and Share; dates grouped by month and week ("This week · 2–8 Nov") on a timeline. Today is blue with a Today tag, older dates with copies still to come in are amber, dates ahead are hollow with a dash, finished ones read "24 ✓".
- **How to use it:** All › on a card or All dates in the hold menu; tap a row to open that date; ‹ goes back to Overview.
- **Code:** `src/screens/AllDates.tsx`, `src/data/overview.ts` (`allDates`)
- **Tests:** `tests/v07.test.tsx` (AD-01..03), V08-P4-09/10
- **Mock:** `docs/mockups/v08/O2e-alldates.png`

### F-OV-05 + New date
- **Status:** LIVE (Beta v0.8.0-beta.2): ＋ on each Overview card, Add date in the hold menu and on All dates, and "＋ New" in the date sheet strip.
- **What you see:** New date, already set to the class's next class day.
- **Rules:**
  - It never makes two sessions with the same label (CW/HW/Test) on the same day; it shows the collision note instead (F-DT-05).
  - Classes come from the sheet; nothing is hard-coded.
- **Tests:** V08-P4-06
- **Mock:** `docs/mockups/v07b/add-phone-night.png`, `dup-phone-night.png`, `dates-phone-night.png`

### F-OV-06 Press and hold a card (O2g-hold)
- **Status:** LIVE (Beta v0.8.0-beta.2)
- **What you see:** Hold a card (about half a second) or right-click it: the card lifts, the page blurs, and a menu shows Share, All dates, Add date, Reschedule.
- **Rules:** Moving the finger cancels the hold (scrolling stays free); the tap that ends a hold does not also open the card; Esc or a tap outside closes. Share and Reschedule act on the card's current date.
- **Code:** `src/screens/CardMenu.tsx`, `src/ui/useHold.ts` (`CONFIG.timing.holdMs`)
- **Tests:** V08-P4-07/08
- **Mock:** `docs/mockups/v08/O2g-hold.png`

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

### F-CL-02 Glass column tabs (replaced the date header, calendar button and split counter)
- **Status:** LIVE (Beta v0.8.0-beta.1), G5d lock.
- **What you see:** Above each date column, a glass tab: "14/24" over a day + date chip "Wed 4 ⌄". Past dates are amber; the focused date has a soft contained blue glow.
- **How to use it:** Tap the count for the still-to-come names of that date (quick overview). Tap the chip to open the date sheet (F-DT-01).
- **Code:** `src/screens/ColumnTab.tsx`, `Checklist.tsx`
- **Tests:** `tests/v08.test.tsx` (V08-P1-03/06), `tests/v07.test.tsx` (S6)
- **Mock:** `docs/mockups/v08/G5d-slim.png`

### F-CL-03 Slim columns and header glow
- **Status:** LIVE (Beta v0.8.0-beta.1), G5d lock.
- **What you see:** 84 px tick columns on the phone (names get the rest), no column tint, a faint header glow that fades by row 3, and a fading divider under the tabs.
- **Tests:** `tests/v08.test.tsx` (V08-P1-07)

### F-CL-04 Swipe to tick
- **Status:** LIVE
- **How to use it:**
  - Press a box and swipe sideways along that name's row (t119u/t121u); with two dates showing, every box you cross takes the first box's new value. Up and down scrolls.
  - The whole swipe is one Undo step.
  - A small wobble still counts as a tap.
- **Rules:** It engages after 10px (`swipeEngagePx`). Once engaged the box keeps the pointer, so the swipe still counts when the finger ends off the box; past either end of the row the end box counts (v0.8.0-beta.4, B-P10-SWIPE). Developer option: Swipe to tick.
- **Tests:** V05-SW-01..03, BK-SW-01/02
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
- **Status:** LIVE; v0.8.0-beta.1 moved it behind the bar magnifier (thin row with "n of 24" and ✕).
- **How to use it:** Tap the magnifier, press `/`, or (on desktop) just start typing.
- **Rules:**
  - Matches are ranked in this order: roll number, first name, other word, several words, initials, part of a name, letters in order, one typo.
  - It ranks names but never hides any.
  - A single letter jumps like the A–Z rail.
  - The found name is centred and flashes.
  - Esc or Enter closes the search.
- **Code:** `src/data/quickSearch.ts`, `src/screens/SearchRow.tsx`, `src/screens/scroll.ts`
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

### F-CL-10 Quick overview cards
- **Status:** LIVE (Beta v0.8.0-beta.2), L-QUICK-SHARE (Q2e) and L-20261108b (Q3-since).
- **How to use it:**
  - Open it by swiping up on the handle above the dock, pressing ⇧O, ⋮ › Quick overview, or tapping a column tab's count.
  - Close it by swiping down, pressing Esc, tapping ✕ or tapping outside.
- **What you see:** One card per visible date (two side by side with 1|2 = 2): the day pill (amber when past), done/total, "+N since …" and Share.
- **Code:** `src/screens/QuickOverview.tsx`, `src/ui/Sheet.tsx`
- **Tests:** `tests/v08.test.tsx` (V08-P3-01..03), V06-QO-*, S3, S3b

### F-CL-11 "+N since" cycle and Share sheet
- **Status:** LIVE (Beta v0.8.0-beta.2)
- **What you see:**
  - "+N since 10:40" counts ticks since the app opened; tap to cycle to "this hour" (since the top of the IST hour) and "today" (since IST midnight). Three dots show which one.
  - Share opens a sheet stacked on top: an editable message (Reset brings the list back), Copy, and WhatsApp · Keep · SMS · More where the device has them.
- **Rules:** Ticks with no time are never counted. The message is the shipped list template (numbering waits for the Phase 7 templates).
- **Code:** `src/data/since.ts`, `src/screens/ShareSheet.tsx`, `src/data/share.ts`
- **Tests:** `tests/since.test.ts` (SN-01..06), V08-P3-02/03
- **Mock:** `docs/mockups/v08/Q2e-share.png`, `Q3-since-cycle.png`

### F-CL-12 One-time gesture hints
- **Status:** LIVE (Beta v0.8.0-beta.2)
- **Rules:**
  - Each hint shows once per device and is dismissible: swipe to tick, A–Z grip, quick overview swipe, and press-and-hold on Overview cards (replaces the week path hint).
  - There is no permanent help text.
- **Data:** `storageKey('hints')`
- **Mock:** `docs/mockups/v061/hint-phone-night.png`

---

## 4. Late submissions and back-date (v0.7d lock)

### F-LT-01 Late rule
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **Rules:**
  - A copy is **late** if it is marked after **midnight IST at the end of the session's scheduled day**.
  - This is re-checked whenever dates, ticks or sync change, because a scheduled date can move.
  - Ticks with no known marked time are never guessed to be late.
- **Code (planned):** `src/data/late.ts` (`dueEndMs`, `isLate`, `markedDay`)
- **Tests:** V07-LT-01..06

### F-LT-02 Mode pill: "Marking late submissions" / "Marking on back-date"
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **What you see:** A small pill above the dock. It appears **only** when the open session's due time has passed.
- **How to use it:** Tap the pill to switch between "Marking late submissions" (the default) and "Marking on back-date".
- **Rules:**
  - The pill goes back to late mode when you open another date, except when you only quickly switch dates (Steve t79u 2.2).
  - "Quickly" means you return to a date within `config.timing.modeKeepMs` of leaving it.
- **Mock:** `docs/mockups/v07d/late-blue-phone-night.png`, `back-blue-phone-night.png`, `quick-blue-phone-night.png`

### F-LT-03 Late Submission toast
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **What you see:** A "Late Submission" toast that can be swiped away whenever you tick in late mode.

### F-LT-04 Amber notch on late ticks
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **What you see:** A small amber corner notch on a blue tick that was marked late.
- **Rules:** The notch appears only on ticks, never on cards (F-OV-01).

### F-LT-05 Mark on back-date
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **Rules:**
  - In back-date mode, a tick is recorded as marked on the scheduled day, so it is **not late**.
  - Use it when the copy was handed in on time but you didn't mark it before the due date.
- **Data:** a per-tick marked day (`markedOn`), kept separately from `updatedAt` so that the "newer wins" sync rule is untouched. See the plan for where it is stored.

---

## 5. Dates (v0.7f/g lock)

### F-DT-01 Reschedule sheet (was Change date)
- **Status:** LIVE (Beta v0.8.0-beta.1): opens from a column's date chip, dials always showing (dial3).
- **What you see:**
  - A short sheet with the existing-date chip strip (tap one to open that date until something has changed); "＋ New" is the last chip.
  - The quiet line "14 ticks · Letters M & N ✎".
  - Three wheels in the order **Month | Date | Day**, the year "2026 ⌄" centred above the headings, and Cancel next to the action button.
- **Rules:**
  - The button stays dim until something changes. Then it reads "Move to Fri 6 Nov" or "Save topic".
  - Tapping outside the sheet cancels it.
  - The edited chip updates live and has a dashed outline.
  - Ticks move with the date, and a toast appears after saving.
- **Mock:** `docs/mockups/v08/G5d-datepanel-dial3.png`; older `docs/mockups/v07g/untouched-phone-night.png`, `edited-*`, `topic-editing-*`, `cross-year-*`, `collision-*`; `docs/mockups/v07f/*`

### F-DT-02 Wheels: Month | Date | Day
- **Status:** LIVE (Beta v0.7.0-beta.1)
- **Rules:**
  - Every wheel spins.
  - Spinning the **Day** wheel moves to that weekday in the same week (Monday to Sunday).
  - Tapping a value that isn't centred snaps it to the centre and selects it.
  - The Date wheel is clamped to the length of the month.
- **Code (planned):** `src/data/dial.ts` (`spinMonth`, `spinDate`, `spinDay`)
- **Tests:** V07-DL-01..06

### F-DT-03 Year pill
- **Status:** LIVE (Beta v0.7.0-beta.1)
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
- **Status:** LIVE (Beta v0.7.0-beta.1)
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
- **Rules:** Kept on the device across restarts, up to 200 steps. A swipe counts as one step. Date moves, new dates and topic edits are undo steps too, and (from v0.8.0-beta.4) Redo brings them back in order with ticks; any new action clears Redo.
- **Tests:** V05-SW-03, BK-STORE-01/02
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

## 7. Settings, share templates, Day theme and sessions (v0.8 Phases 6–9)

### F-ST-01..10 Settings (S1)
- **Status:** LIVE (Beta v0.8.0-beta.3), locked-20261108c S1. Replaces More (F-MO-01..04); the dock is Overview · Checklist · Settings.
- **What you see:** quiet grouped rows with chevrons, each opening a full page with ‹ back:
  - Appearance: Theme Night | Day | Auto; Contrast (Standard | High).
  - Sync & pairing: Sync (status dot only; code, setup file, demo note); Pair a device (device name, devices).
  - Session & names: Session (only with the Past sessions flag); Share templates. The shorthands row waits for Phase 5.
  - Backups: Snapshots (latest time; Restore rows); Back up now.
  - App: Updates (dot when a new version is ready); Developer options (A–Z side, Swipe to tick, Letter bubble, Past sessions (preview), Release channel); About (version · Stable/Beta).
- **Code:** `src/screens/settings/` (`Settings.tsx`, `rows.tsx`, `SyncPages.tsx`, `AppPages.tsx`), `src/ui/PageHead.tsx`, `src/shell/theme.ts`
- **Tests:** `tests/settings.test.tsx` (V08-P6-01..11)
- **Mock:** `docs/mockups/v08/S1-settings.png`, `S1-settings-day.png`

### F-ST-11 Display size (v0.8 P11)
- **Status:** BETA (v0.8.0-beta.5), Steve t81u–t83u. Default is today's look (all 100%).
- **What you see:** Settings › Appearance › Display size (Standard / Compact / Custom). Size: Standard | Compact, then Fine-tune sliders: Overall, Text, Row spacing, Tickboxes, Date headers, Navigation (5% steps, value shown), and Reset to default. Changes apply live.
- **Rules:** Each part is Overall × its own factor, applied once through `--sow-k-*` variables on the existing Driftline sizes (no CSS zoom). Bounds: Overall 75–115%, Text 85–120%, Row spacing 50–150%, Tickboxes 75–115%, Date headers 80–115%, Navigation 80–115%; stored values are clamped and snapped, junk falls back to 100%. Text never under 13 px. Tickboxes draw smaller inside a 44 px tap target; row spacing is the gap around the drawn box (rows never under 44 px). Date header chips draw smaller but each keeps a 44 px tap (count reaches up, date reaches down); the dials are unchanged. Navigation shrinks the class bar, the controls row and the dock (all ≥ 44 px). Compact = Overall 85%, Row spacing 110%, Tickboxes 95%, Navigation 95% (smaller, but rows keep their gap). Saved on this device only (not synced).
- **Code:** `src/shell/displayScale.ts`, `src/screens/settings/DisplayPage.tsx`, `src/store/store.ts` (`scale`, `setScale`, `resetScale`), `src/App.tsx`, `src/shell/shell.css` (P11 block)
- **Tests:** `tests/displayScale.test.tsx` (V08-P11-01..08), `tests/v08.test.tsx` (V08-P1-07 updated)

### F-SH-06 Update dot, never reload mid-work
- **Status:** LIVE (Beta v0.8.0-beta.3)
- **Rules:** a new version found before the first tap applies at once; after that it only lights the Updates dot and waits for "Restart to update". Coming back to the app checks for updates.
- **Code:** `src/sync/updates.ts`, `src/main.tsx` (`registerType: 'prompt'`)
- **Tests:** V08-P6-06..09

### F-TP-01..11 Share templates (S2)
- **Status:** LIVE (Beta v0.8.0-beta.3) on the app side. Syncing between devices needs the bridge's prefs actions on the test copy (already in bridge 0.50.0-dl.1; the deploy is Steve's). Until then templates stay on the device.
- **What you see:** Settings › Share templates: template pills ("· Default"), the template text with highlighted variables (unknown ones get a wavy underline), "Tap to add" chips in Basics · Names · Counts, a live preview on the class in hand ("…N more"), ⋯ Rename · Duplicate · Set default · Move · Delete (tap twice) · Restore default templates, a cloud when synced.
- **Variables (22):** {class} {subject} {type} {notebook} {date} {topic}; {names} {notSet} {set} {names.notSet} {names.set} {names.submitted} {names.notSubmitted} {names.active} {names.left}; {count} and the matching counts. Submitted = set (Driftline has no separate submitted mark).
- **Rules:**
  - Seeds: Pending (default, same text as before), Submitted, Completed, Not submitted.
  - Templates are saved under a new key (`share.templates.v2`), so the old app's keys are never overwritten. The old keys are adopted once and migrated: {class} becomes "{subject} {type}" when the class prefix is off, else "{notebook}".
  - Sync: newer wins, pushed 2 s after an edit when paired to the test copy; never on the live sheet.
  - The share sheet has template pills; over 1500 characters it warns that WhatsApp may cut it off; share buttons are off while the message is empty.
- **Code:** `src/data/templates.ts`, `src/data/templateBook.ts`, `src/store/templates.ts`, `src/sync/prefs.ts`, `src/screens/templates/`, `src/screens/ShareSheet.tsx`
- **Tests:** `tests/templates.test.ts` (TP-01..16), `tests/prefsSync.test.ts` (PS-01..06, real bridge Code.js in a vm), `tests/templateMaker.test.tsx` (V08-P7-01..09)
- **Mock:** `docs/mockups/v08/S2-share-template.png`

### F-DY-01/02 Day theme
- **Status:** LIVE (Beta v0.8.0-beta.3)
- **Rules:** Day uses the `utopian-day` tokens; glows run at half strength (`--sow-glow`); every text colour reaches 4.5:1 on the page and on cards (utopian-day and contrast-day).
- **Code:** `src/shell/shell.css` (`--sow-glow`)
- **Tests:** `tests/dayTheme.test.ts` (V08-P8-01..03), V08-P4-11 (card sheen)

### F-SH-08/09, F-DT-08 Session switch and past years (O3-session, G5d-past)
- **Status:** LIVE (Beta v0.8.0-beta.3) behind Developer options › Past sessions (preview), off by default. Demo data only until the Sheet has past years.
- **What you see:** Overview header "Wed 4 Nov · 2026–27 ⌄" opens the Session sheet (this year ✓, 2025–26, 2024–25, "Past years are view-only"). A past year shows amber: its classes and last week ("Mon 23 Mar"), no ＋, hold menu Share and All dates only, the year in the class bar, read-only ticks, no undo/redo, a date sheet that only flips dates, and a "Viewing 2025–26 | Back to now" pill above the dock.
- **Rules:** school years run April–March. Nothing can be written in a past year (ticks, dates, topics, undo/redo, restore, snapshots); sync updates are ignored and Back to now pulls again. Turning the flag off goes back to now.
- **Code:** `src/data/schoolYear.ts`, `src/data/demoSchool.ts` (`pastSchoolState`), `src/store/store.ts` (`viewing`, `viewYear`), `src/screens/SessionSheet.tsx`, `src/shell/PastPill.tsx`, `src/data/overview.ts` (`pastYearCards`)
- **Tests:** `tests/session.test.tsx` (V08-P9-01..09)
- **Mock:** `docs/mockups/v08/O3-session.png`, `O3-session-open.png`, `O3-session-past2.png`, `G5d-past.png`

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

The bridge's `push` also accepts `structs` of kind `rename` (moves a session and its ticks) and `delete`. v0.7 adds struct writes for Reschedule. Adding a date and saving a topic need a bridge update: see `docs/v0.7.0-plan.md` §Bridge.

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
3. F-OV-06 Hold a card / F-OV-04 All dates
4. F-CL-01 Tap to tick
5. F-CL-04 Swipe to tick
6. F-CL-03 Done | To go
7. F-CL-05 A–Z
8. F-CL-06 Find a name
9. F-LT-02 Late pill
10. F-DT-01 Reschedule
11. F-CL-10 Quick overview
12. F-SY-02 Status dot

---

## 11. RDs2 checklist (v0.9.0, Beta)
- **Status:** BETA (v0.9.0-beta.3), Steve t121u–t150u. Replaces the G5d chrome (F-SH-01, F-CL-02/03/06 controls row, pill chip, ⋮ menu, sync dot in the bar).
- **Top bar:** class chip "≡ KG-A · English HW ⌄" at the rail inset (8 px). Tap: Classes panel (CLASSES strip All · Fav · classes · LISTS, collapsible; subjects with done/total and ★; loop). Hold 160 ms: favourites. Swipe sideways: next/previous subject in the scope (stops at the ends unless loop).
- **Undo:** tap = undo; press and slide down = Redo (icon flips), slide left = Cancel; a solid label over the chip says what release does ("Nothing to redo" when there is none).
- **Shortcuts ＋:** tap opens Pending · 1/2 · Search straight down; hold 100 ms, slide and release picks one.
- **Table (A5):** # · Names 🔍 (search in place, "n of 24") · 56 px date columns flush right, the date over count or topic (Settings › Column dates). Dates run oldest → newest, so the primary (selected) date is always the rightmost column.
- **Second date (phone):** a drawer to the left of the primary: swipe left on a date header, the right-edge grip or the 1/2 shortcut opens it; swipe right or the grip closes it. Its ticks are green.
- **Ticks:** filled rounded box with one round-capped check stroke; blue done, amber late, green in the second date.
- **A–Z rail:** left, all letters (missing ones dimmed, current one blue), ends above the dock.
- **Quick overview:** swipe up from the Checklist dock tab (the sheet follows the finger, opens past 96 px or on a quick flick, else snaps back; a tap stays a tab tap), the strip above the dock, or ⇧O.
- **Settings › Appearance:** Column dates (10/11 · Tue 10 · 10 Nov; Count · Topic), Week groups, Haptics (Off · Light · Normal · Strong).
- **Quick overview card (dev-only, t150u):** five styles D4 · E1 · E2 · E3 · E4 in Settings › Developer options › QO card style, or hold the Quick overview title to step through them.
- **Not yet:** smart lists (LISTS shows only a disabled "+ New list").
