# DECISIONS (sow-driftline)
Master log: steph1420/agent-common handovers/lfps-sow/DECISIONS.md.
- LOCKED t139u: redesign = r4 mocks + R13 A (phone name column ≈50%, one line + tap toast) + R14 A (Add/Edit class only in Developer options). All PLAN v2 Q-D recommendations are treated as accepted (assumption).
- t140u GO D0: Q-B1 A (create repos sow-driftline + sow-driftline-beta), Q-B2 A (beta repo with BETA_REF, like sow-beta).
- Storage namespace `sow-driftline` (D0-CFG-01), SW scope = Pages base.
- t145u GO D1: read-only checklist on the TEST COPY via the bridge (`pull`), because the copy is not publicly shared (gviz returns a sign-in page). Pairing code, no token in the build.
