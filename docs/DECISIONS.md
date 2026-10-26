# Decisions
- 2026-10-24: Native reduceOnly SL first. Official DreamDEX already supports TP/SL; product differentiation is exposure-to-protection assessment, not a missing protocol feature.
- One account and one market. OCO only after verified interface; no synthetic trailing, reverse IOC, market making, arbitrage, mainnet, or revenue forecasts.
- Node 24.22.1 is the actual supported cloud runtime and is pinned in .nvmrc/engines. Use built-in node:sqlite instead of adding a native driver; actual in-memory and file-backed SQLite tests required.
- SDK 0.32.1 fixed. Lockfile owns dependency versions and integrity. No silent upgrades or guessed ABI.
- Public replay/live-readonly has no operation mutation API. Local owner requires explicit flags, loopback bind, strict Host/Origin plus session token. Signing is browser-only and owner identity must match.
- No owner account was supplied for this project. Previous unrelated wallet addresses are not adopted as authorized DreamShield accounts. G1 stays blocked until an isolated owner and actual wallet interaction are available.
- Source guide is a baseline, not live evidence. Competition matrix records observed conflicts and unknown payment/AI/region requirements.

## 2026-10-24 recovery and evidence decisions
- Recovered actual remote implementation baseline 94486c9978809f5913e8e3aa929c60a93a12737e rather than assuming the initial README was latest. Local git HEAD was stale and is not proof of published state.
- Preserve SDK genesis and chain guards. Nested diagnostic proves current DNS failure, not deployment mismatch. No security/network changes or address substitution used.
- No blind Argon retry after an outcome-uncertain request. Internal independent code review continues without claiming Argon approval.
- Recovered wallet transaction hashes must bind to the original unresolved operation and still pass independent chain reconciliation; they cannot establish success by themselves.
- Unresolved matching owner/pool operations suppress a green desk assessment, including before the next snapshot refresh.
