# SOW Register — dry run on paper (11 Nov 2026 IST)

Walked the layout in `docs/SOW_REGISTER_LAYOUT.md` (with `SERVER_SHEET_V2_PLAN.md` underneath) through Steve's scenarios before building. Demo names only. **Breaks** = where the earlier plan did not work; each is already fixed in the layout and the built workbook.

| # | Scenario | Walk-through | Result |
|---|---|---|---|
| 1 | Add a pupil | Steve types `Adm No 4471, Demo Asha, KGA, 23` on a new Pupils row → Update → preview "1 new pupil" → `pupil.add` with target `a:4471`, hidden id filled, `_Pupils` + `_Enrolment` rows, subject tabs redraw. A phone can do the same (Q-SV2-10 B). | OK. **Break 1:** admission numbers like `0471` or `KG/0471` would be turned into numbers/dates by Sheets → **fix:** `Adm No` column is plain text; pupilId is normalised (trim, upper-case, no spaces). |
| 2 | Two phones tick the same box offline | Phone A sets, phone B unsets, both offline; both push later. Concurrent (neither vv saw the other) → Set wins, `_Conflicts` row `set-wins`, Home "Changes to check" = 1. | OK. **Break 2:** the plan's Home counted "unresolved" conflicts but `_Conflicts` had no resolved field → **fix:** `resolvedAt`, `resolvedBy` columns added. |
| 3 | Add a date | New Plan row `18/11/2026 KGA Eng CW "Rhymes"` → `session.add`; sessionId `KGA_Eng_CW|2026-11-18`. Same date typed on the subject tab picker too → one add, the other a no-op. A date that subject already has → refused with the locked text. | OK. |
| 4 | Rename | (a) Pupil name corrected on Pupils → `pupil.name` (Register wins on Update). (b) Mistyped admission number `4417`→`4471` after ticks exist. | **Break 3:** with the admission number as the key, fixing a typo would orphan the ticks → **fix:** pupilId is set **once** from the first Adm No and never changes; a correction is a `pupil.adm` op that only changes the shown number. Two pupils may not share an Adm No (warning in the sheet, refused on Update). |
| 5 | Remove a date, then undo | Steve clears a Plan row → preview "1 date removed (12 ticks kept)" → `session.remove` (alive false). Undo last Update → `session.add` on the same id (alive true): the date and its 12 ticks are back. | OK. **Break 4:** a half-cleared row (Date blank, Topic left) was ambiguous → **fix:** a row with an id and no Date is a removal and is listed in the preview; Plan and Pupils are matched by the hidden id, not row position, so sorting/filtering those tabs is safe (subject tabs stay fixed-layout). |
| 6 | Same name, different admission numbers | Two `Demo Riya`s in KGA, Adm 4402 and 4419, rolls 12 and 31. Different pupilIds → no clash. | **Break 5:** Progress "Not yet" listed bare names, so two Riyas were indistinguishable → **fix:** shown as `Name (roll)`. |
| 7 | Load a saved copy | `Load a saved copy…` → `pre-restore` backup → values copied in, epoch unchanged → phones refold on next pull; their unsent ticks apply on top. Refused while a tab has unsaved typing. | OK. Warns if the copy is from an earlier school year. |
| 8 | Rewind to a time | Steve wants "how it was at 10:00 today". | **Break 6:** the plan's Rewind went back to a *saved copy* and dropped phones' work; Steve's meaning is *undo back to a time* → **fix:** Rewind computes the state at that time from `_Base + _Ops` and writes new `server` ops to put every changed box back (one Undo record, nothing deleted, no epoch bump). Older than the 60-day tidy floor → nearest saved copy; added `_Meta.oplogFloorAt`. Dropping phones' unsent work is an optional tick. |
| 9 | New year with stay-backs | April: Start new year → archive copy → `New Year` tab: tick 2 stay-backs, paste 30 new pupils → preview → `enrol.set` for 32; the other 28 become `Moved on` in 2026-27; Pupils shows 2027-28 only. | **Break 7:** the plan kept class/roll/status on the pupil row, so a new year would overwrite last year's class and roll and break the archive → **fix:** split into `_Pupils` (identity, permanent) and `_Enrolment` (class/roll/status per year) plus `_Years`. A re-joining Adm No is matched, not duplicated. |
| 10 | Pupil leaves mid-year | Status `Left`, Left on `15/01/2027` → `left.set` (Register wins). Ticks kept; the pupil moves to the Left block on subject tabs. | **Break 8:** the plan dropped Left pupils from every count, so December percentages changed in January → **fix:** a pupil counts for a date only if `Joined on ≤ date < Left on`; added `Joined on` so a mid-year joiner is not "not yet" for dates before they arrived. |
| 11 | Phone edits while Steve has unsaved typing | Plan rule kept: the dirty tab is not redrawn; Update then applies the watermark/Review rule (Q-SV2-1). | OK. |
| 12 | Device label | Change history writes id `server` (accepts `sheet`); people see **Register** (`_Meta.serverDeviceLabel`). | OK. |

## Also tidied while dry-running
- Front page renamed `Home` and stripped of schema/epoch (now only in `_Meta`).
- "Behind" → "Not yet", "savestate" → "saved copy", "compact" → "tidy old history" on anything Steve sees.
- System tabs formatted as plain text so ISO dates and ids are never auto-converted.
- Protections are warning-only: Steve and the script (running as Steve) are never blocked; accidental typing gets a prompt.

## Still open (needs Steve)
See the report: who may run Load / Rewind / Start new year (Q-REG-2).
