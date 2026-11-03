# Device registry — plan (deferred; needs an Apps Script deploy by Steve)
Goal: revoke one device without cutting off every device (today: one shared token; revoke = rotate = all devices out).
1. Bridge (COPY first, additive): new Script Property `SOW_DEVICES` = list of { id, name, keyHash, salt, createdAt, lastSeen, revoked }.
2. `pairClaim` returns a per-device key (random, 32 bytes) instead of the shared token; only its SHA-256 + salt is stored.
3. Every action accepts `deviceKey` (checked against the registry) OR the old shared token (back-compat for /sow/ v0.47 until D6).
4. New actions `devicesList` / `deviceRevoke` / `deviceRename` (shared-token or an "owner" device only).
5. Driftline: More › Devices list (name, last seen, Revoke); setup files carry a device key, never the shared token.
6. Tests first: fake bridge with registry; revoked key → "This device is no longer paired" + read-only; other devices unaffected.
7. Rollout: COPY bridge deploy (Steve pastes script) → Beta tests → LIVE only at D6 on Steve's go.
