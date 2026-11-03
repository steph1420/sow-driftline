# Deploy the device registry to the TEST COPY bridge (Steve only)
File: `bridge/Code.js` in this repo = old bridge 0.46.2 + device registry (additive; the old /sow/ app keeps working — its 63 bridge tests pass on this file).
Only for the TEST COPY sheet `1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI`. Never paste it into the LIVE sheet's script.
1. Open the TEST COPY sheet → Extensions → Apps Script.
2. File `Code.gs`: select all, delete, paste the whole of `bridge/Code.js` (raw: https://github.com/steph1420/sow-driftline/blob/master/bridge/Code.js → Raw). Save (Ctrl+S).
3. Deploy → Manage deployments → pencil (edit) on the existing Web app deployment → Version: **New version** → Deploy. (Editing keeps the same /exec URL, so paired devices keep working.)
4. Check: Driftline Beta › More › Devices now lists devices (after re-pairing a device with a new code). Old bridge: "doesn't list devices yet" = step 3 not done.
5. Rollback: Manage deployments → edit → pick the previous version → Deploy.
New actions: devicesList, deviceRevoke, deviceRename; pairClaim with deviceName returns a per-device key. Only salted hashes are stored (Script Property SOW_DEVICES). The shared token still works.
