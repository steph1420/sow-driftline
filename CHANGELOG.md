# Changelog
## 0.9.0-beta.14 (2026-11-10)
Steve t243u break-it run on the test copy. Beta only; the live sheet was never touched.
- Reschedule then tick (connected): the tick now stays on that date's own sheet row. Before, the sheet got a second date and the app showed two columns.
- A class or subject with no dates yet no longer blanks the app when you open it or add its first date.
- Snapshots now use at most about 1 MB of phone storage. With a term of data, 12 full copies filled the storage, and after that some taps were not saved.
- Back to demo, or connecting again, fully stops the old connection. Before, it kept retrying and showed a save error in demo.
- A sheet request that never answers now gives up after 60 s and retries, so later ticks still save.
- Plain messages for a busy sheet ("unexpected reply") and for an empty or odd setup file. A setup file saved with a BOM now opens.
- Damaged saved settings no longer stop the app from opening.
- Tests: 358 app.
- Rollback: set BETA_REF back to 2c53610 (beta.13); backup branch backup/pre-v0.9.0-beta.14.
## 0.9.0-beta.13 (2026-11-10)
Steve t230u, t234u-t235u, t240u (menu A), t241u "Build". Beta only, demo data.
- Sort names: A-Z, Roll or Pending, each up or down. Settings > Session & names > Sort names, or press and hold # or Names in the table header. The header shows the active sort. Saved per device.
- Export setup file: Settings > Sync & pairing. Save file or Share the same file Sync opens; keep it private. Greyed out in demo mode.
- Tests: 345 app.
- Rollback: set BETA_REF back to 78ec627 (beta.12); backup branch backup/pre-v0.9.0-beta.13.
## 0.9.0-beta.12 (2026-11-10)
Steve t240u. Beta only, demo data.
- All dates: the share icon on each row is gone; press and hold a row for the date menu (Share, Open, Reschedule).
- Date hold menu: compact equal rows (48) with small icons; the oversized Open row is fixed.
- Reschedule and New date: the date pills keep their full height and no longer squish or clip; hidden scrollbar.
- Tests: 330 app.
- Rollback: set BETA_REF back to f35ed5e (beta.11); backup branch backup/pre-v0.9.0-beta.12.
## 0.9.0-beta.11 (2026-11-10)
Steve t227u-t233u, t238u "Proceed". Beta only, demo data.
- Row focus: a tap, A-Z rail jump or search hit now flashes the whole row once and fades away for good; it no longer sticks on (long-standing bug). Motion Off = no flash.
- Reschedule: the yellow "already has" warning sits in a fixed slot and fades in, so the sheet no longer jumps.
- Phone Back: goes back one step inside the app (sheets, hold menus, panels, Settings sub-pages, All dates, name search) instead of leaving the page; leaves only at a tab's root.
- Tests: 322 app.
- Rollback: set BETA_REF back to be2fcbb (beta.10); backup branch backup/pre-v0.9.0-beta.11.
## 0.9.0-beta.10 (2026-11-10)
Steve t224u ("Space wars!"). Beta only, demo data.
- Share sheet: the date pills and the template chips now sit in their own rows, 6 px apart, and never squeeze or clip each other; each row scrolls sideways. The stray "( )" marks (clipped pill edges) are gone.
- Share targets: Keep removed. A phone shows Copy, WhatsApp, Messages and More in one row.
## 0.9.0-beta.9 (2026-11-10)
Steve t212u, t219u-t223u. Beta only, demo data.
- Animations scale: Off, 0.25x, 0.5x, 0.75x, 1x (default), 1.25x, 1.5x, 2x, 3x, 5x. beta.8 values carry over.
- Settings > Appearance > Animations > Motion details: 20 motion moments, each with its own switch (all on by default). Global Off and phone reduce-motion still turn everything off.
- Share any date from Overview: hold a date in a card's strip (Share, Open, Reschedule); date pills in the share sheet to switch the shared date; a share icon on every All dates row.
- Undo toast after Reschedule, New date or a topic change.
- Tests: 303 app.
- Rollback: set BETA_REF back to 81ec5bd (beta.8); backup branch backup/pre-v0.9.0-beta.9.
## 0.9.0-beta.8 (2026-11-10)
Steve t201u (B), t206u, t210u, t211u "Go". Beta only, demo data. Static looks unchanged at rest.
- Quick overview E1 card: the top pager bars sit 8 px below the top edge and 28 px in from the sides, rounded at both ends, so the lit bar's glow is no longer clipped by the corner (glitch B). D4, E2-E4 unchanged.
- Animations (framer-motion, transform/opacity only): page enter, class/subject switch slide, tick pop with rolling counts, spring A-Z disc, dock tab change, quick overview spring open/drag-back with card stagger, alive cards (fill rise, breath, glint, +N count), share sheet stacking over the quick overview.
- Settings > Appearance > Animations: Off, 0.5x, 1x (default), 1.5x, 2x. Scales every duration, delay, stagger and spring; phone reduce-motion forces Off. Saved per device.
- Tests: 292 app.
- Rollback: set BETA_REF back to 1906800 (beta.7) in sow-driftline-beta; backup branch backup/pre-v0.9.0-beta.8.
## 0.9.0-beta.7 (2026-11-10)
Steve t167u: "I told you to fix the edge glow not the fill... Revert the look and also remove the texture." Beta only, demo data.
- Quick overview card: the E1 Tide fill (curved crest + bright line) and the top pager bars are back to exactly the beta.5 look. All five card styles (D4, E1–E4), night and day, render pixel-identical to beta.5 (20 card renders compared). No glow/edge element changed this time.
- Sheets (Quick overview, Reschedule, Share, Session): the grain texture is gone; the faint accent gradient stays.
- Unchanged from beta.6: sheet drag-to-close / spring-back, A–Z rail hide toggle + grab handle, header to the left edge.
- Glitch candidates are annotated in rds2/build-v0.9.0-beta.7/annotated-candidates.png for Steve to pick before anything is changed.
- Tests: 282 app (BETA6-06/07 replaced by BETA7-01: no grain, beta.5 fill and bar values).
- Rollback: set BETA_REF back to f80a108 (beta.6) in sow-driftline-beta; backup branch backup/pre-v0.9.0-beta.7.
## 0.9.0-beta.6 (2026-11-10)
Steve t165u. Beta only, demo data. No layout numbers from beta.4/5 changed.
- A–Z rail: Settings › Hide unavailable letters (off by default, saved with your settings). When on, only letters that have names are shown and they spread over the rail.
- A–Z rail grab handle: a slim faint tab sits beside the current letter; while you scrub it becomes a small accent disc that follows your finger and names the letter, the list jumps, and the phone ticks once per new letter (when haptics are on). Letters stay floating, no pill. The rail's touch strip is 44 px wide.
- Table header: its tint and divider now run to the left screen edge, behind the rail gutter. Nothing moved (columns, #, Names, rail unchanged).
- Quick overview "glitchy edge glow": it came from the E1 Tide card style. The fill that rises with % done had a curved (wave-shaped) top with a bright 1 px line along it, and the top switcher bars glowed and ran into the card's rounded corners. On a nearly full day (Mon 9, 22/24) the wave top sits just under the card edge, so it read as a bright yellow arc on the top of the card. The fill now has a flat, soft top with no line, and the switcher bars stay on the straight part of the top edge. The card's tinted border and ambient glow are unchanged; D4 (default) and E2–E4 were not affected.
- Sheets (Quick overview, Reschedule/date setter, Share, Session): dragging the grab handle moves the sheet with your finger; it closes past 96 px or on a quick downward flick, otherwise it springs back. A finger that rests before letting go is not a flick. A tap on the handle still closes.
- Sheets get a quiet backdrop instead of a flat empty area: a faint accent glow under the handle fading into a slightly raised tone, over a very light static grain. Kit tokens only, no animation, night and day.
- Tests: 283 app (BETA6-01..07: rail letters + hide toggle + persistence, scrub handle/haptics, header extent, sheet drag close / spring back / flick / tap).
- Rollback: set BETA_REF back to a773444 (beta.5) in sow-driftline-beta; backup branch backup/pre-v0.9.0-beta.6.
## 0.9.0-beta.5 (2026-11-10)
Steve t164u: on his phone beta.4 didn't match the sizer — the class chip touched the top and the divider, and the right tick column hugged the screen edge. Beta only.
- Why: the two only match at Display size 100 %. The sizer keeps its own settings (so it ran at 100 %) and wrote the bar height as a fixed 56 px; Beta multiplies the bar by the Display size navigation factor, but the chip was a fixed 45 px. Below 100 % the bar shrank around the chip (at 75 % the chip was taller than the bar). Narrower date columns (dates factor) also brought the right tick box closer to the edge, and a 44 px tick button in a column under 44 px hung off to the right instead of centring.
- The chip is now the bar height minus 5.5 px above and below, so it keeps the sizer's breathing room at every Display size (45 px at 100 %).
- The right-most tick box keeps at least 13 px (the sizer's look) from the screen edge; an extra right inset appears only when Display size makes the column narrower. Tick buttons wider than their column stay centred.
- At 100 % nothing changes: pixel-identical to beta.4 and the sizer at 411×800.
- Tests: 276 app (BETA5-01..03; shared tests/cssEval.ts evaluates the CSS sizes for any Display size).
- Rollback: set BETA_REF back to 2f6ebdc (beta.4) in sow-driftline-beta; backup branch backup/pre-v0.9.0-beta.5.
## 0.9.0-beta.4 (2026-11-10)
Steve t160u ("GO"): his sizer v2 picks become the layout. Beta only, demo data; the sizer panel is not in this build (it lives on dev/sizer).
- Layout (beta.3 → beta.4): top bar 48 → 56 px; class chip inset 8 → 5, height 36 → 45; A–Z rail inset 8 → 7, width 16 → 12, letters 13 → 18 px, no end padding (0), gap to # 8 → 6; header 44 → 46; rows 48 → 47; # column 36 → 20, # → Names 12 → 3; date columns 56 → 52; tick box 24 → 25, corner radius 10 → 6; Quick overview date pill 44 → 32 high; space above the dock 88 → 82. Name font (16) and dock tabs (48) unchanged; everything else as beta.3.
- Every layout size is now a named --sow-* var in one :root block of shell.css (kit-token sums; text sizes still follow Display size › Text, bars/rows/ticks their own factors).
- No accidental text selection: UI chrome (bar, headers, dock, buttons, rail, sheets) can't be selected, shows no grey tap flash and no iOS long-press callout. Student names, inputs and text areas stay selectable.
- Tests: 273 app (BETA4-01 sizes from the CSS, BETA4-02 selection rules; V08-P1-07, V08-P11-07/08, RD-23 updated for the new sizes).
- Rollback: set BETA_REF back to f2e02d5 (beta.3 build) in sow-driftline-beta; backup branch backup/pre-v0.9.0-beta.4.
## 0.9.0-beta.3 (2026-11-10)
Steve t150u: "Give me d4 and e1-4 as dev toggle". Beta only, demo data. Dev-only, easy to remove.
- Quick overview day card in five styles (spec rds2/qo-card-v1 D4, qo-card-v2 E1–E4): D4 Edge pager (default), E1 Tide (the card fills to % done; animates only when motion is allowed), E2 Roll grid (one cell per pupil, bright = new in the window), E3 Ghost numeral (fading count, date down the left edge, corner arc switcher), E4 Recent days (bars for the last 5 dates of the subject, this one lit).
- One card model (data/qoCard.ts: date, done/total, %, +since, every pupil's status, recent dates) and one small component per style (screens/qo/QoCards.tsx). The 3-window switcher (since open · this hour · today) is its own control in every style; "+N since" still cycles it too; share as before.
- Settings › Developer options › QO card style (saved on this device). Press and hold the Quick overview title (500 ms) to step to the next style; a chip names it.
- "+N since" no longer has the dotted underline (all styles, per the mockups).
- Tests: 271 app (QO-01..06 new; V08-P3-02 changed: the switcher is its own control).
- CI: RD-20 (dock-tab pull) pinned its event times; jsdom ignores a passed timeStamp, so on a fast runner a short pull read as a flick (the v0.9.0-beta.3 tag commit failed the Beta deploy test step; Beta is built from the follow-up commit).
- Rollback: set BETA_REF back to v0.9.0-beta.2 in sow-driftline-beta (backup branch backup/pre-v0.9.0-beta.3).
## 0.9.0-beta.2 (2026-11-10)
Steve t145u–t147u on beta.1 ("Looks nice"). Beta only, demo data.
- Columns swapped: the primary (selected) date is the rightmost column, flush right; the second (earlier) date opens to its LEFT. Swipe left on a date header opens it, swipe right closes it; the right-edge grip and the 1/2 shortcut still toggle it. Desktop/landscape already ran oldest → newest, so the newest date is rightmost everywhere.
- Ticks: one clean round-capped check stroke (SVG) in the same filled rounded box, colours and states.
- # and Names sit a little further left (rail→# gap 12→8 px, # column 40→36 px); the class chip starts at the rail inset (8 px).
- Shortcuts ＋ hold is 100 ms (own constant shortcutHoldMs); the class chip and Undo keep 160 ms.
- Undo overlay fix: always solid (the "nothing to redo" state was 60 % see-through), the chip underneath is hidden while it shows, label left and subtext right-aligned with ellipsis; "Nothing to redo" shows cleanly.
- Quick overview: swipe up from the Checklist dock tab pulls the sheet up under the finger; it opens past 96 px or on a quick flick, otherwise snaps back. A tap is still a tab tap; the strip and ⇧O stay. The strip is a bit more visible (wider, thicker, muted colour).
- Fix: the shortcuts container shared the class "sow-quick" with the Quick overview sheet in beta.1, which pinned that sheet top-right; renamed (sow-scs / sow-qo). The day pills no longer wrap.
- Tests: 261 app (RD-18..23 new).
- Rollback: set BETA_REF back to v0.9.0-beta.1 in sow-driftline-beta (backup branch backup/pre-v0.9.0-beta.2).
## 0.9.0-beta.1 (2026-11-10)
Steve t121u–t140u: RDs2 redesign (GO t140u), t80u clean code. Beta only, demo data / COPY sheet only.
- Top bar: class chip "≡ KG-A · English HW ⌄" with scope dots. Tap opens Classes, hold (160 ms) opens Favourites, swipe sideways steps to the next/previous subject in the scope. No sync dot (Settings › Sync shows status). Undo and the shortcuts ＋ on the right.
- Classes panel (v7): left CLASSES strip (All, Fav, each class, LISTS) with a collapse toggle (short labels, no counts); right column lists subjects with done/total and a favourite star; loop toggle top-right. LISTS is empty with "+ New list" disabled: there is no smart-list data yet. Favourites, scope and loop are saved on this device.
- Undo way 2: tap undoes; press and slide down flips the icon to Redo and release redoes (a quick flick down redoes); slide back up for Undo; slide left shows Cancel and release does nothing. A label over the chip names what release will do. One-time hint "Hold or swipe down to redo" after the first undo.
- Shortcuts: ＋ turns to ✕; tap opens Pending (amber), 1/2 (blue, count badge) and Search straight down; tap outside or ✕ closes; hold, slide and release picks one. The 3-dot menu and the controls row are gone.
- Table header (A5): # column, "Names 🔍" (search in place with "n of 24" and ✕), date columns 56 px flush right with the date over done/total (or the topic), no column tints; tap a date for the date dial.
- Col2 drawer: opened by the 1/2 shortcut, a right swipe on the first date header or the 3 px edge grip (faint at 1 column, blue when open). Col2 is the earlier date, ticks green.
- A–Z rail on the left, all letters (missing ones dimmed, current one blue), no pill, ends above the dock; every other letter on short landscape screens. The A–Z side setting is gone.
- Settings › Appearance: Column dates (Date format 10/11 · Tue 10 · 10 Nov; Under the date Count · Topic), Week groups (moved from the removed menu), Haptics (Off · Light · Normal · Strong).
- Removed: ChecklistControls, ColumnTab, SearchRow, the two-line pill chip, the bar sync dot and their CSS.
- Tests: 255 app (RD-01..05, RD-10..17 new; V08-P1, V07, rail, shell, settings, session, v06, d1, displayScale, dayTheme, breakitUi changed for RDs2).
- Rollback: set BETA_REF back to v0.8.0-beta.5 in sow-driftline-beta (backup branch backup/pre-v0.9.0-rds2).
## 0.8.0-beta.5 (2026-11-09)
Steve t81u–t83u: display size ("just smaller scaled, not congested"). Beta only, demo data.
- Settings › Appearance › Display size: Standard | Compact, plus sliders for Overall, Text, Row spacing, Tickboxes, Date headers and Navigation; Reset to default. Standard is today's look.
- Overall shrinks the class bar, date headers and dock too; row spacing is tuned on its own so smaller boxes keep clear gaps. Text stays ≥ 13 px and every tap stays ≥ 44 px.
- Saved on this device, validated and bounded. Tests: 244 app (V08-P11-01..08 new).
- Rollback: set BETA_REF back to v0.8.0-beta.4 in sow-driftline-beta (backup branch backup/pre-v0.8.0-p11).
## 0.8.0-beta.4 (2026-11-09)
Steve t79u: Phase 10 break-it run on v0.8.0-beta.3 (live Beta, demo data and a stand-in bridge; no token, no real sheet). Beta only.
- Swipe to tick: a swipe that ends off the box now counts (it was lost and left a false tick on screen); an overshooting two-date swipe covers both dates.
- Redo brings back undone date moves, new dates and topic edits, in order with ticks.
- Template sync: an edit made during a sync is no longer dropped.
- No text under 13 px anywhere (dock labels, Pending, YOUR CLASS, A–Z, footer); the 1|2 buttons have a 44 px hit area; the template maker's ＋ New is "Add a template" for screen readers.
- Break-it suite: docs/breakit-v08.cjs (16 checks; report docs/BREAK_IT_v0.8.md). Tests: 236 app (BK-SYNC-01/02, BK-STORE-01/02, BK-UI-01/02, BK-TP-01, BK-SW-01/02 new).
- Rollback: set BETA_REF back to v0.8.0-beta.3 in sow-driftline-beta (backup branch backup/pre-v0.8.0-p10).
## 0.8.0-beta.3 (2026-11-09)
Steve: Batch 3 GO (Phases 6–9), t80u clean code; locks locked-20261108c (S1, S2), L-20261108b (O3-session, G5d-past). Beta only, demo/test copy only.
- Settings replaces More (Phase 6): Appearance, Sync & pairing, Session & names, Backups, App; each row opens a page with ‹ back. The class bar shows on Checklist only.
- Updates: a dot on Settings › Updates when a new version is ready, "Restart to update"; it never reloads mid-work (a version found before the first tap applies at once).
- Share templates (Phase 7): template maker with 22 variables, highlighted tokens, tap-to-add chips, live preview, rename/duplicate/default/move/delete/restore; the share sheet gets template pills and a long-message warning. Old templates are adopted once and {class} is migrated. Sync between devices is ready on the app side (newer wins, test copy only); the bridge deploy is Steve's.
- Day theme (Phase 8): glows at half strength on Day; text contrast test (4.5:1) for utopian-day and contrast-day. Includes the B-P4-SHEEN fix (4b2518d): Overview card text no longer washed out on Day.
- Session switch (Phase 9), behind Developer options › Past sessions (preview), off by default: Overview header year opens the Session sheet; past years are amber and view-only (no ticks, dates, topics, undo/redo, restore or snapshots) with a "Viewing 2025–26 | Back to now" pill. Demo data only.
- Tests: 227 app (V08-P6-01..11, TP-01..16, PS-01..06, V08-P7-01..09, V08-P8-01..03, V08-P9-01..09 new; D0-SHL-02/04, D0-STO-02, V05-CH-01, V06-OV-03/04 changed).
- Rollback: set BETA_REF back to v0.8.0-beta.2 in sow-driftline-beta (backup branches backup/pre-v0.8.0-p6 … p9).
## 0.8.0-beta.2 (2026-11-09)
Steve t79u keep going through the phases, t80u clean code; locks L-QUICK-SHARE (Q2e), L-20261108b (Q3-since), L-OVERVIEW (O2g, O2g-hold, O2e). Beta only, demo/test copy only.
- Quick overview (Phase 3): one card per visible date with the day pill, done/total, "+N since 10:40" (tap: this hour → today → since open, three dots) and Share. Tapping a column tab's count opens it.
- Share sheet stacked on top: editable message with Reset, Copy, WhatsApp · Keep · SMS · More.
- Overview (Phase 4): "Overview" with today's date, filter chips (All · classes · CW/HW/Test), one card per class + subject + type with done/total (dash when ahead), topic, this week's date tabs, ＋ and All ›; an amber dot when an older date still has copies to come in.
- Press and hold (or right-click) a card: it lifts over a blurred page with Share, All dates, Add date, Reschedule.
- All dates: newest first by month and week on a timeline (today blue, older open dates amber, ahead hollow, done "24 ✓"); tap a row to open it.
- Removed: the v0.7 week path sheet and corner icon, squircle cards, the old quick sheet (Summary/QuickSheet); the week path hint is now the press-and-hold hint.
- Tests: 171 app (since SN-01..06, V08-P3-01..03, V08-P4-01..10, V07-OV-01..06, AD-01..03 new; V06-QO-01, V06-OV-01, S3/S3b, S4, S6-04 changed; week path tests removed).
- Rollback: set BETA_REF back to v0.8.0-beta.1 in sow-driftline-beta (backup branches backup/pre-v0.8.0-p3, backup/pre-v0.8.0-p4).
## 0.8.0-beta.1 (2026-11-09)
Steve t79u BUILD GO, t80u clean code; locks L-20261108b (G5d, dial3) and locked-20261108c. Beta only, demo/test copy only.
- Checklist chrome (G5d): two-line class chip with the topic, search magnifier and ⋮ in the bar; a second row with Pending · 1|2 · bare undo/redo.
- Glass column tabs: "14/24" over a "Wed 4 ⌄" chip on each date column, amber for past dates, a soft contained glow on the focused one. Tap the count for the still-to-come names; tap the chip for the date sheet.
- 84 px tick columns on the phone, no column tint, a faint header glow fading by row 3, a fading divider.
- Search sits behind the magnifier: a thin row with "n of 24" and ✕ (still ranks and jumps, never hides names).
- The date sheet opens straight on Reschedule with the Month | Date | Day dials showing; the year is centred above the headings; ＋ New is the last chip in the strip.
- Removed: subject heading, calendar button, Done | To go split counter, old search pill; Dates on phone moved out of the ⋮ menu.
- Tests: 161 app (V08-P1-01..07, V08-P2-01..05 new; S6, S7 openChange, S4b-01, PC-02, D1-UI-02, V05-QS-03 changed for the new UI).
- Rollback: set BETA_REF back to v0.7.0-beta.4 in sow-driftline-beta (backup branches backup/pre-v0.8.0-p1, backup/pre-v0.8.0-p2).

## 0.7.0-beta.4 (2026-11-08)
- The ⋮ menu and class menu are solid again, so the content behind them no longer shows through (t123u).
- Includes beta.3: sideways swipe, Dates on phone 1|2, date heading on phone.

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
