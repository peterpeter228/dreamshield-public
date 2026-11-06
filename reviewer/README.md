# DreamShield

> **Published composite source.** Reviewed EOA SDK code from local commit `75c2ffb6f73899397f519ab33259fbda43892a09` was incorporated into public composite `78c94e6347bb3009daabd6a03f3660d5065bd2a3` (parent `a37ad13967d582cda51ad8d9eea0730329127a3e`). The earlier public baseline did not include this SDK; frozen archive/pre-publication metadata retain their historical labels. This projection contains four exact SDK code files and sanitized [LOCAL_SDK](docs/LOCAL_SDK.md). Frozen pre-publication inventory: 105 reviewer text files (106 including root README), stored outside the payload; generated compatibility reference is additional. Those archived hashes are not restamped by this separate docs-only clarification. November 5 review PASS0 / 22 focused checks / parent94 are historical local-code proof, not this packaging smoke. New MVP NOT_SUBMITTED; G1 NOT_RUN.

A native perps stop-protection desk for DreamDEX on Somnia Tokyo testnet (chain **50383**). For account owners checking whether native stop settings match their position after a position or stop changes.

## Current status

Open the [read-only reviewer demo](https://dreamshield-read-only-reviewer-demo-read-only-7qstzfkd68.openbot.site). It offers synthetic scenarios and the historical November 4 recording, with no wallet connection or transaction entrypoint. The recording remains UNKNOWN / READ_FAILED, not G1. Hosting expires on December 5, 2026 at 09:11 UTC.

DreamShield reads position/stop observations, explains coverage gaps, prepares unsigned native stop calls and reconciles canonical readback instead of treating a receipt as a fill. Public mode is read-only. Local owner mode has no server signing key.

The browser also implements a narrow **direct EOA-controller → threshold-1 Safe → operation-0 create-SL** path using the pinned official accounts SDK. Preparation and explicit wallet execution are separate. The code path can be checked offline; the user's currently controlled direct-owner provider and eligible state are **not established**; existing bounded testnet consent does not establish either prerequisite. DreamShield has never signed or broadcast a stop in the supplied evidence. **No DreamShield-originated real order, G1 or completed submission is claimed.**

The included November 4 real-chain recording is a historical known-ID supplement around a failed aggregate read. Coverage stays **UNKNOWN / READ_FAILED**, with a separate warning about the observed absolute **0.1 USDso** SL trigger. The opening was user-created through the official DreamDEX UI, not this app.

For the API-free reviewer build, use the [static reviewer guide](docs/REVIEWER_STATIC.md). The normal local Express app instructions below remain unchanged; the composite `reviewer/` package including this SDK was published at `78c94e6347bb3009daabd6a03f3660d5065bd2a3`; the earlier `a37ad13967d582cda51ad8d9eea0730329127a3e` baseline omitted it.

Text-only publication projects the approved compatibility gzip into `scripts/materialize-reviewer-reference.mjs`. `npm test` (via `pretest`) and `npm run build:reviewer` restore `evidence/compatibility-2026-11-03/evm-results.json.gz`: exactly **6680 bytes**, SHA-256 **2ae79da9d2e8ad7e50f4b967043f970a664a350c28f3fb48c01640c373077e5a**. The Node-built-in-only helper checks embedded bytes, leaves an identical existing reference untouched and refuses to overwrite a different file. No postinstall hook, dependencies or network scripts; the original source archive/private gzip and normal app behavior are unchanged. See the static guide for inventory scopes.

## Run locally

Use Node **24.22.1**, npm and the committed `package-lock.json`. Extract this composite archive into an empty directory and enter `reviewer/`. The public composite `78c94e6347bb3009daabd6a03f3660d5065bd2a3` includes the SDK; the earlier `a37ad13967d582cda51ad8d9eea0730329127a3e` public baseline did not. Generic `npm ci` instructions below were not exercised by this closeout; extraction validation reused the existing exact-lock dependency installation. No wallet, API key or secret is required for replay.

```sh
npm ci
npm run typecheck
npm test
npm run build
APP_MODE=replay HOST=127.0.0.1 PORT=4311 READ_ONLY=true node dist/server/apps/server/index.js
```

Open http://127.0.0.1:4311. Express serves the built web app; rebuild and restart after source changes. Choose **Synthetic scenario** for fictional examples or **Recorded · real capture 2026-11-04** for the historical capture. Neither is live execution evidence. No wallet Connect/Review action is needed for this journey.

Synthetic cases: missing SL, whole-position SL, partial coverage, short position, stale snapshot, broken OCO, no position, incomplete discovery, take-profit only, wrong-side SL, trigger already met, and residual stops. Recheck, inspect the reasons and download snapshot-bound evidence. Switching source clears the previous recorded context; a stale cross-tab export is rejected.

## Recorded evidence

[Sanitized captured chain evidence](evidence/recorded/opening-2026-11-04.sanitized.json) preserves the failed aggregate, supplied known-ID reads, opening transaction/receipt/account proof and verifier rejection. [Runtime fixture](fixtures/recorded/opening-2026-11-04.json) references its actual SHA-256 and records each limitation. Neither contains a new chain query.

| Historical observation | Captured fact |
|---|---|
| Supplement | 2026-11-04T17:57:07.889Z; block 41611728, `0x7506808dbf220e10934ae0033d7bc11ea631bdddd8477094a41725f05335f918` |
| Original aggregate | 2026-11-04T17:55:56.423Z; `REGISTRY_CHANGED_DURING_DISCOVERY_RETRY_READONLY`; null market/position, unavailable discovery, incomplete |
| Account / pool | Wallet1 `0xDb19191c710E9279612134F8746F0E42A78a3182` / BTC pool `0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0` |
| Position / mark | Long 13000 atomic = 0.00013 BTC; entry 80501.1; mark 80323.2173540062065 USDso |
| Known TP | ID `7581611814294625727582`; sell/reduceOnly, fixed 13000; GTE 80976.5 |
| Known SL | ID `5091301364343836259423`; sell/reduceOnly, fixed 13000; LTE **0.1 USDso**, one tick above zero |
| Known linkage / payment | Reciprocal OCO; each historical `somiPaid` 0.15 STT, **not** a current registry deposit requirement |
| Opening | `0x9cdbdb182c83e3080b09019ce56897019d33cfb5dc69df80a0b9b5f91eaf8140`, block 41609102; official-UI user Safe execution |
| Strict verifier | Operation **1**, MultiSend DELEGATECALL to `0xb4fbd4db0490831b99dda6761cd20393fd9611ae`; rejected `ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED` |

Open the recorded source and download evidence. Endpoint, browser and export interpret the same historical capture time; current age is displayed separately. The replay wrapper has empty operations/transactions, null lifecycle, `liveWorkflowVerified:false` and `realSendProof:'NONE'`. The failed aggregate is exported separately from the known-ID supplement. It cannot pass the G1 evidence classifier.

The SL distance is **9999 bps** (integer floor) from the recorded mark. This is a price-distance observation, not verified covered exposure. Absolute 0.1 is not 0.1%. DreamShield's local display policy flags distances above **2000 bps**; this is not a protocol or organizer rule. Only an otherwise genuinely complete/fresh VERIFIED result is downgraded to NEEDS_REVIEW. A warning never upgrades UNKNOWN or overrides an unresolved operation.

## Modes

- `replay` (default): synthetic and recorded historical sources. Mutation endpoints are denied on the server, including forged client requests. `/api/recorded` is unavailable on live instances.
- `live-readonly`: `APP_MODE=live-readonly DEMO_OWNER_ADDRESS=<public-address> DEMO_POOL_ADDRESS=<verified-pool>`. Reads current testnet state; no signer or transaction routes. Failed reads never fall back to a replay fixture.
- `live-owner`: isolated loopback only, with explicit `READ_ONLY=false ALLOW_TESTNET_WRITES=true`. Configuration is **not** execution authorization. Never expose this mode through a tunnel or reverse proxy. No signing key belongs on the server.

Environment is read from the process; no env file is automatically loaded. `DEMO_OWNER_ADDRESS` and `DEMO_POOL_ADDRESS` are public identifiers, not secrets. Older F36E/`0x04b0A7AF…` owner statements in historical materials are not the Wallet1 account or current authority. A read-only doctor is available via `npm run doctor:readonly`; it performs network reads and was **not rerun** for this frozen-capture delivery.

## What protection means

A fresh complete snapshot must match owner, chain, pool, registry, side, reduce-only intent and trigger direction. Quantity **0** means the whole remaining position at trigger time; fixed quantities do not grow with exposure. TP alone is not SL. Several mismatched stops are not summed into invented protection. Configuration does not guarantee triggering, fills or protection from loss.

Stale, incomplete, mismatched or uncertain observations withdraw verification. Canonical pin checks do not establish complete discovery. The recorded fixture therefore omits `stopDiscovery` and a genesis hash, and leaves current `stopDeposit:null`.

## Owner execution boundary

Unsigned Safe preparation/export never requests a wallet or emits executable outer calldata. The separate direct-controller review reads an already-selected injected EIP-1193 account and chain, requires the explicitly selected current direct EOA owner of a supported threshold-1 Safe, and reconstructs the exact single CALL through official accounts SDK 0.4.0 `planExecution` / `prevalidatedExecution`. It performs no permission request, chain switch, relay, key import or automatic operator grant.

Only create-SL is supported by the new Safe path, using whole-position quantity **0**, current deposit/operator permission, canonical account/nonce binding, fresh complete NEEDS_PROTECTION state and a reviewed on-tick trigger. An existing matching SL, incomplete discovery, expired plan, changed provider/nonce/terms or unsupported account blocks sending. Safe cancellation is not added. Existing direct-EOA cancellation stays separately gated.

Execution is a distinct owner-wallet transaction confirmation after revalidation; no Safe message-signature round trip is needed for sender-bound execution. The journal reserves before requesting that transaction and keeps uncertain outcomes locked through restart. Reconcile the original operation; never retry an uncertain send. Receipt alone cannot become Applied. Recovered hashes bind to the monitored Safe, not its controller, and do not clear provenance locks.

After a page reload, unresolved Safe operations remain locked. In the local live-owner account panel, reconnect the same controller on chain 50383 and enter its exact observed address in **Explicit observed controller member**, available even without a selected Draft or stop preview. Then use the timeline to reconcile a known hash or load missing-hash recovery. This only enables read-only recovery for the matching controller/account context; entering an address does not request permissions, send a transaction or remove recovered-hash provenance locks.

## Known limits

- This capture is historical, incomplete and not refreshable live evidence. The known absolute-0.1 SL does not meaningfully bound loss; coverage is unverified.
- The actual operation-1 opening is unsupported by the strict operation-0 verifier. No MultiSend support or relaxed attestation was added.
- No supplied evidence proves the current injected provider controls a historical direct EOA owner on chain50383. Historical owners/code are not present signing authority.
- Actual execution also needs independently eligible fresh state and separately bounded exact payload/account/provider authorization. The captured position already has an SL: do not create another, cancel it or open a position to manufacture eligibility.
- Published composite SDK source `78c94e6347bb3009daabd6a03f3660d5065bd2a3` and the read-only demo are available; frozen pre-publication labels describe archived metadata only. Browser QA remains separate from offline tests and HTTP smoke. These artifacts do not establish a live wallet connection, a DreamShield-originated order, G1, or a completed submission.
- Testnet only. No mainnet, automated trading strategy, custody, guaranteed returns or formal audit claim.

## X posts and submission

| Post | Status | URL |
|---|---|---|
| Product/user value | Published by user | [Post 1](https://x.com/bbchjfgg/status/2118280088601161963) |
| Historical risk/demo evidence | Published by user | [Post 2](https://x.com/bbchjfgg/status/2118280206180094237) |
| Public source/run instructions | Published by user | [Post 3](https://x.com/bbchjfgg/status/2118280270898139369) |

The [official bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) requires a repository, README what/who/run, real Tokyo perps orders and 2–3 genuine posts tagging `@DreamDEXSomnia`. Current corroborated deadline: **2026-11-15T14:30:00Z**. The user published the three posts linked above. Rio checked their public pages and approved content. Hunter maintains the business packet; this documentation update sends no posts.

Published composite SDK source at `78c94e6347bb3009daabd6a03f3660d5065bd2a3`, the read-only demo and the three genuine X links are available; `a37ad13967d582cda51ad8d9eea0730329127a3e` is the earlier baseline without this SDK. A real DreamShield-issued order/readback, G1 and an actual Build receipt remain unmet or unverified. Do not label official-UI reference trades as DreamShield execution. No trading-volume, Arena rank or mainnet funding requirement is inferred for the builder MVP.

```sh
npm run verify:evidence -- evidence/manifest.json --submission evidence/submission.json
npm run submission:check
```

Strict checks remain **BLOCKED / exit 2**. File-only checksum/schema checks do not authenticate origin, revalidate the current chain, edit claims or promote replay into G1.

## Architecture

`packages/domain`: pure bigint coverage, known-order risk and operation rules. `packages/protocol`: pinned Markets SDK 0.32.1, accounts SDK 0.4.0 and strict account/readback adapters. `packages/storage`: durable SQLite journal. `apps/server`: mode/origin boundaries and bound evidence exports. `apps/web`: protection desk and explicit browser owner flow. `fixtures`: labelled synthetic and historical data. `evidence/recorded`: sanitized frozen provenance.

Dependencies/ABIs follow the committed lockfile. [Third-party notices](docs/THIRD_PARTY_NOTICES.md). Independent historical reviews are not a formal audit or current live acceptance.

## Closeout evidence boundary

November 5 complete aggregates observed F36 NO_POSITION and Wallet1 NEEDS_REVIEW (existing absolute 0.1 USDso SL); all 15-second views expired. This does not replace the byte-identical November 4 UNKNOWN / READ_FAILED recording. Feedback 50928 Under Review is independent of the new MVP, which remains NOT_SUBMITTED with no Build ID. No extra posts or portal actions are requested.
