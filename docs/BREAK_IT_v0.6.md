# Break-it run — v0.6.0-beta.1 (Steve t166u/t169u)

Target: https://steph1420.github.io/sow-driftline-beta/ (bundle index-CA-coebI.js), 4 Nov 2026 ~03:20 IST. Script: docs/breakit.cjs (all v0.5 checks + new V06 checks). Demo data + stand-in bridge; no real sheet contacted; LIVE untouched; Stable untouched.
Viewports: 412×915 phone, 915×412 phone landscape (V06 checks), 1440×900 desktop; Night and Day.

## Earlier runs (local build)
- Run 1: harness used date column 6 on desktop, which no longer exists with Weeks off (3 dates) → harness fixed.
- Run 2: **real bug** — swipe-up on the quick-overview handle did nothing in a real browser (the finger leaves the 24 px handle, moves stop arriving). Fixed with pointer capture; failing test first (V06-QO-03, seen red then green).
- Run 3: harness clicked the scrim behind the tall sheet → now uses the sheet's own handle. 101/101.

## Final run on live Beta: 101/101 pass

| Check | Result | Note |
|---|---|---|
| RAPID-phone-night | PASS | 21 fast taps → flipped once net |
| UNDOSTORM-phone-night | PASS | on 34 → undo×21 35 → redo×21 34 |
| SWIPE-phone-night | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-phone-night | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-phone-night | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-phone-night | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-phone-night | PASS | row mid 471 vs 466 |
| AZ-PINNED-phone-night | PASS | 104 → 104 |
| SEARCH-phone-night | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Sienna Priya Maddox); Esc closes=true |
| SEARCH-EMPTY-phone-night | PASS | empty query no crash |
| KEYS-phone-night | PASS | ArrowDown→row 1; Space true→false |
| GRIP-phone-night | PASS | drag → left edge; tap → back right |
| LONGNAMES-phone-night | PASS | horizontal overflow 0px |
| CHANNEL-phone-night | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-phone-night | PASS |  |
| RAPID-phone-day | PASS | 21 fast taps → flipped once net |
| UNDOSTORM-phone-day | PASS | on 34 → undo×21 35 → redo×21 34 |
| SWIPE-phone-day | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-phone-day | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-phone-day | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-phone-day | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-phone-day | PASS | row mid 471 vs 466 |
| AZ-PINNED-phone-day | PASS | 104 → 104 |
| SEARCH-phone-day | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Sienna Priya Maddox); Esc closes=true |
| SEARCH-EMPTY-phone-day | PASS | empty query no crash |
| KEYS-phone-day | PASS | ArrowDown→row 1; Space true→false |
| GRIP-phone-day | PASS | drag → left edge; tap → back right |
| LONGNAMES-phone-day | PASS | horizontal overflow 0px |
| CHANNEL-phone-day | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-phone-day | PASS |  |
| RAPID-desktop-night | PASS | 21 fast taps → flipped once net |
| UNDOSTORM-desktop-night | PASS | on 56 → undo×21 57 → redo×21 56 |
| SWIPE-desktop-night | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-desktop-night | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-desktop-night | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-desktop-night | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-desktop-night | PASS | row mid 464 vs 458 |
| AZ-PINNED-desktop-night | PASS | 104 → 104 |
| SEARCH-desktop-night | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Ruhi Anand); Esc closes=true |
| KEYS-desktop-night | PASS | ArrowDown→row 1; Space true→false |
| GRIP-desktop-night | PASS | drag → left edge; tap → back right |
| LONGNAMES-desktop-night | PASS | horizontal overflow 0px |
| CHANNEL-desktop-night | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-desktop-night | PASS |  |
| RAPID-desktop-day | PASS | 21 fast taps → flipped once net |
| UNDOSTORM-desktop-day | PASS | on 56 → undo×21 57 → redo×21 56 |
| SWIPE-desktop-day | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-desktop-day | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-desktop-day | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-desktop-day | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-desktop-day | PASS | row mid 464 vs 458 |
| AZ-PINNED-desktop-day | PASS | 104 → 104 |
| SEARCH-desktop-day | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Ruhi Anand); Esc closes=true |
| KEYS-desktop-day | PASS | ArrowDown→row 1; Space true→false |
| GRIP-desktop-day | PASS | drag → left edge; tap → back right |
| LONGNAMES-desktop-day | PASS | horizontal overflow 0px |
| CHANNEL-desktop-day | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-desktop-day | PASS |  |
| V06-FIRSTPAGE-phone-night | PASS | Checklist is first |
| V06-WEEKS-phone-night | PASS | default off=false; cols off 2 → on 2 → after reload 2 |
| V06-QUICK-phone-night | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-OVERVIEW-phone-night | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-phone-night | PASS |  |
| V06-FIRSTPAGE-phone-day | PASS | Checklist is first |
| V06-WEEKS-phone-day | PASS | default off=false; cols off 2 → on 2 → after reload 2 |
| V06-QUICK-phone-day | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-OVERVIEW-phone-day | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-phone-day | PASS |  |
| V06-FIRSTPAGE-landscape-night | PASS | Checklist is first |
| V06-WEEKS-landscape-night | PASS | default off=false; cols off 2 → on 6 → after reload 6 |
| V06-QUICK-landscape-night | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-OVERVIEW-landscape-night | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-landscape-night | PASS |  |
| V06-FIRSTPAGE-landscape-day | PASS | Checklist is first |
| V06-WEEKS-landscape-day | PASS | default off=false; cols off 2 → on 6 → after reload 6 |
| V06-QUICK-landscape-day | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-OVERVIEW-landscape-day | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-landscape-day | PASS |  |
| V06-FIRSTPAGE-desktop-night | PASS | Checklist is first |
| V06-WEEKS-desktop-night | PASS | default off=false; cols off 3 → on 6 → after reload 6 |
| V06-QUICK-desktop-night | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-O-VS-SEARCH-desktop-night | PASS | o = search, ⇧O = sheet |
| V06-OVERVIEW-desktop-night | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-desktop-night | PASS |  |
| V06-FIRSTPAGE-desktop-day | PASS | Checklist is first |
| V06-WEEKS-desktop-day | PASS | default off=false; cols off 3 → on 6 → after reload 6 |
| V06-QUICK-desktop-day | PASS | ⇧O 1, Esc closes true, swipe-up 1 |
| V06-O-VS-SEARCH-desktop-day | PASS | o = search, ⇧O = sheet |
| V06-OVERVIEW-desktop-day | PASS | 1 card(s): AKG-A EnglishToday · CW · Wed 4/1110 to go… → opens Checklist; Copy toast 1 |
| V06-NOERRORS-desktop-day | PASS |  |
| PAIR-COPY | PASS | Driftline · Beta · v0.6.0-beta.1 · test copy · all saved |
| DUPNAMES | PASS | #3,#4 |
| TWOTABS-DIFF | PASS | server r1=true r2=true |
| TWOTABS-SEEN | PASS | each tab shows the other tab’s tick |
| TWOTABS-SAME | PASS | A=false B=false server=false |
| OFFLINE-QUEUE | PASS | Driftline · Beta · v0.6.0-beta.1 · test copy · offline · 1 waiting → server r7=true |
| RELOAD-GRACE | PASS | server r9=true after reload within the 3 s grace |
| RELOAD-MIDSAVE | PASS | server r11=true after reload while a push was in flight |
| DEVICES-GRACEFUL | PASS | old bridge → calm note |
| SETUPFILE-BAD | PASS | That file is not a setup file / The setup file points somewhere unexpected / This bridge is not the test copy · the app works with the test copy only / token stored: 0 |
| LIVE-GUARD-BETA | PASS | This bridge is not the test copy · the app works with the test copy only; pushes 5→5 |
