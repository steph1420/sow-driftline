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
