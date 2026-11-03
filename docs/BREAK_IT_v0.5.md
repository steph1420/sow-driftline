# Break-it run — v0.5.0-beta.1 on live Beta (Steve t166u)

Target: https://steph1420.github.io/sow-driftline-beta/ (bundle index-CSekdNgM.js), 4 Nov 2026 ~02:35 IST.
Script: /workspace/sow-v05-shots/breakit.cjs (Playwright + Chrome). Demo data with made-up names; the test-copy path uses a stand-in bridge (page.route) with the real ping/pull/push/pairClaim rules. No real sheet was contacted; the LIVE sheet was not touched.
Viewports 412×915 (touch) and 1440×900, Night and Day.

## Run 1: 68/69
- FAIL RELOAD-MIDSAVE: turned out to be a harness bug, not an app bug. The stand-in bridge was still in 'slow' mode when the reloaded page re-sent, so the resend was aborted too; the app then retries after `saveRetryMs` (15 s), which is longer than the 5 s the check waited. The queued tick was never lost (it stays in the outbox until the bridge confirms it). Harness fixed (bridge back to normal as the reload starts); no app change needed.

## Run 2: 69/69 pass

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
| UNDOSTORM-desktop-night | PASS | on 119 → undo×21 120 → redo×21 119 |
| SWIPE-desktop-night | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-desktop-night | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-desktop-night | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-desktop-night | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-desktop-night | PASS | row mid 436 vs 458 |
| AZ-PINNED-desktop-night | PASS | 104 → 104 |
| SEARCH-desktop-night | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Ruhi Anand); Esc closes=true |
| KEYS-desktop-night | PASS | ArrowDown→row 1; Space true→false |
| GRIP-desktop-night | PASS | drag → left edge; tap → back right |
| LONGNAMES-desktop-night | PASS | horizontal overflow 0px |
| CHANNEL-desktop-night | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-desktop-night | PASS |  |
| RAPID-desktop-day | PASS | 21 fast taps → flipped once net |
| UNDOSTORM-desktop-day | PASS | on 119 → undo×21 120 → redo×21 119 |
| SWIPE-desktop-day | PASS | rows 2–5 = false; rows 6–8 untouched: [true,true,false] |
| SWIPE-UNDO1-desktop-day | PASS | one Ctrl+Z reverts the whole swipe |
| AZ-HIDDEN-desktop-day | PASS | ABDEFHIKLMNORSTYZ |
| AZ-EDGES-desktop-day | PASS | Zoya Imran / Aarav Rohan Fenwick |
| AZ-CENTRE-desktop-day | PASS | row mid 436 vs 458 |
| AZ-PINNED-desktop-day | PASS | 104 → 104 |
| SEARCH-desktop-day | PASS | typo→Mohammed Elias Thornbury; initials npm→Sienna Priya Maddox; no-match keeps last (Ruhi Anand); Esc closes=true |
| KEYS-desktop-day | PASS | ArrowDown→row 1; Space true→false |
| GRIP-desktop-day | PASS | drag → left edge; tap → back right |
| LONGNAMES-desktop-day | PASS | horizontal overflow 0px |
| CHANNEL-desktop-day | PASS | https://steph1420.github.io/sow-driftline/ https://steph1420.github.io/sow-driftline-beta/ |
| NOERRORS-desktop-day | PASS |  |
| PAIR-COPY | PASS | Driftline · Beta · v0.5.0-beta.1 · test copy · all saved |
| DUPNAMES | PASS | #3,#4 |
| TWOTABS-DIFF | PASS | server r1=true r2=true |
| TWOTABS-SEEN | PASS | each tab shows the other tab’s tick |
| TWOTABS-SAME | PASS | A=false B=false server=false |
| OFFLINE-QUEUE | PASS | Driftline · Beta · v0.5.0-beta.1 · test copy · offline · 1 waiting → server r7=true |
| RELOAD-GRACE | PASS | server r9=true after reload within the 3 s grace |
| RELOAD-MIDSAVE | PASS | server r11=true after reload while a push was in flight |
| DEVICES-GRACEFUL | PASS | old bridge → calm note |
| SETUPFILE-BAD | PASS | That file is not a setup file / The setup file points somewhere unexpected / This bridge is not the test copy · Beta works with the test copy only / token stored: 0 |
| LIVE-GUARD-BETA | PASS | This bridge is not the test copy · Beta works with the test copy only; pushes 5→5 |

## Notes
- Typing a no-match on desktop: the first letter acts as an A–Z jump (single letter = A–Z, by design), so the highlight stays on that letter's first name; the pill stays open.
- Retry after a failed save is 15 s (`CONFIG.timing.saveRetryMs`); going back online, focusing, or reopening the app re-sends at once.
- Not covered here: a real device on the real test copy (needs Steve to pair), real touch hardware/haptics.
