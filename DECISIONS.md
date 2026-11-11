# DECISIONS (sow-driftline)
Master log: steph1420/agent-common handovers/lfps-sow/DECISIONS.md.
- LOCKED t139u: redesign = r4 mocks + R13 A (phone name column ≈50%, one line + tap toast) + R14 A (Add/Edit class only in Developer options). All PLAN v2 Q-D recommendations are treated as accepted (assumption).
- t140u GO D0: Q-B1 A (create repos sow-driftline + sow-driftline-beta), Q-B2 A (beta repo with BETA_REF, like sow-beta).
- Storage namespace `sow-driftline` (D0-CFG-01), SW scope = Pages base.
- t145u GO D1: read-only checklist on the TEST COPY via the bridge (`pull`), because the copy is not publicly shared (gviz returns a sign-in page). Pairing code, no token in the build.
- t151u/t152u: 1A rail pinned; 2B Beta stays on demo by default; 3A guessed labels; Q-TOK-1 pairing code OR setup file; B-B4-1 must fix; Q-DUP-1 allow duplicates, roll number is the key.
- t153u GO rail + D2; t154u: ship both as ONE Beta release v0.3.0-beta.1.
- t155u/t156u: v0.4.0-beta.1 = grip, hide empty letters, quick sync polling, header fix; device registry deferred (plan in docs).
- t163u GO v0.5: swipe, centre snap, quick search, keyboard, channel switch, device registry (app + COPY bridge prepared, not deployed).
- 02:24 widget: Stable may connect to LIVE (existing bridge, tick cells only); Beta copy-only. t166u: Stable only after a documented break-it pass on Beta (docs/BREAK_IT_v0.5.md) and a LIVE backup.
- Beta storage namespace split from Stable (same origin).
- t168u: Stable release + LIVE cancelled. t169u GO v0.6: Weeks toggle (off by default, desktop + phone landscape), Overview + quick sheet + Share footer, LIVE code removed. Quick overview key = Shift+O because plain letters start a search on desktop (t163u).
- t254u (Steve GO "approved sync mechanisms"; Q-HARM-10 / CRDT_SYNC_PLAN §12+§13): op-log sync built, dormant until SoW › Migrate. Choices made while building, for review:
  one shared core `src/oplog/core.js` embedded verbatim in the bridge (test OL-CORE-00); Migrate's backup uses `ss.copy` (no new Drive scope);
  Base counts as seen by every op (so converted legacy ops with an empty vv still win over Base); a new date on a taken day files under the
  existing session (`alias:`); every tick also sends a `tick.mark` op (marked time stays shared); Remove-a-subject is off after Migrate;
  the compaction trigger is manual only (needs the script.scriptapp scope added by Steve). Conflicts Review UI = mockups only (/workspace/rds2/crdt-review/), awaits Steve's lock.
- 2026-11-11 (t194u–t196u, server sheet v2 answers; Phase 1 GO "You can build the sheet now"):
  Q-SV2-9 name = **"SOW Register"** (SOW = Setting Of Work; Steve picked "Notebook Register" then agreed "SOW Register").
  Q-SV2-3 pupil permanent ID = **admission number** (pupilId `a:<AdmNo>`, set once; no roll-based ids). Q-SV2-6 names only on the Pupils tab.
  Q-SV2-10 **B**: Steve plus any paired phone may update. Q-SV2-11 **third option**: "Start new year" = tick pupils to carry over (stay-backs) and/or add/import a new list; admission numbers kept; old year archived.
  Q-SV2-7 **A**: Load (restore a saved copy) and Rewind (undo back to a time). Q-SV2-8 **A**: display prefs per phone for now, sync later.
  Q-SV2-12 **A**: device label "Register" in change history (id stays `server`; `sheet` accepted).
  Test-copy migration **dropped** (the new Register replaces it). Conflicts review mockups 1 and 2 approved (t195u, t196u).
  Choices made while building, for review: Home tab replaces "Server" (schema/epoch moved to `_Meta`); `_Enrolment` + `_Years` split from `_Pupils`;
  `pupil.adm` op to correct a mistyped Adm No; Rewind writes compensating ops (epoch bump only if "also drop phones' unsent changes" is ticked);
  progress counts use Joined on / Left on; locale en_GB (API refused en_IN). Layout: docs/SOW_REGISTER_LAYOUT.md; dry run: docs/SOW_REGISTER_DRY_RUN.md.

