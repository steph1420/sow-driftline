# SoW Driftline
The Driftline redesign of SoW (Setting of Work). Design LOCKED t139u (round-4 mocks).
- Stable: https://steph1420.github.io/sow-driftline/ (this repo, master, non-prerelease versions only)
- Beta: https://steph1420.github.io/sow-driftline-beta/ (repo steph1420/sow-driftline-beta builds the tag in its BETA_REF)
- The old app stays live at /sow/ and /sow-beta/. This app uses its own storage namespace (`sow-driftline:*`), IndexedDB name and service-worker scope.
- Build plan: DRIFTLINE_BUILD_PLAN.md (in the agent workspace) · Decisions: DECISIONS.md · Bugs: BUGS.md
Stack: React 19 · Vite 8 · TypeScript · zustand · framer-motion 12.43.0 · Driftline kit v0.3.0 tokens (vendored in src/vendor/driftline) · Vitest.
D0 = empty shell with demo data only. It makes no sheet calls.
