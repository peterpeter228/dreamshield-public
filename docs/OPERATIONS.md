# Local operation and handoff

Product limits: one isolated public owner address, one verified market, chain 50383, smallest valid **1–2 lots**, **1–2 concurrent native stops**; owner may tighten. These procedures do not authorize a wallet session, signature, send, funding, mainnet, publication, organizer contact or Submit Build. [Original implementation evidence](../evidence/mvp-2026-10-27/NOTES.md) and [STATE](STATE.md) distinguish live-readonly diagnosis, offline/replay/synthetic smoke and real-owner NOT_RUN.

## Reproducible startup

Use Node **24.22.1** and the pinned package-lock.json. Use the delivery repository in the README quickstart; never paste authentication tokens into commands or the project. `.env.example` is documentation only: process environment is authoritative. Doctor and application both use **`DEMO_OWNER_ADDRESS` / `DEMO_POOL_ADDRESS`**, without aliases. Supply an isolated EOA public address only, never a seed/key or inferred payout wallet. Select a pool only after doctor verification of chain/genesis, pool/registry/code binding, decimals, tick, lot, minimum quantity and valid mark.

After changing application source, run `npm run build` again before starting Express (`npm run demo:replay` for replay). It serves `dist/web`, not live Vite source. Final original-source classification-normalized Node24.22.1 typecheck/test/build each exited0, **401 tests/16 files**; [measured input/log index](../evidence/mvp-2026-10-27/classification-verification.json). Prior399/16 wrapper and original391/15 remain historical, not fresh clone or independent transformed-copy claims. Original replay and separate prior02fdeb replay re-exercise covered12 scenarios, unsigned preview/signing disabled, exact download and aging/read-failure revocation; UI/server source bytes are unchanged, not a final-source browser rerun. [Evidence notes](../evidence/mvp-2026-10-27/NOTES.md) and root external delivery.json distinguish actual checkpoints; replay is not live G1.

## Read-only doctor result

`npm run doctor:readonly` uses the shared DEMO owner/pool variables and preserves network/genesis guards. The report has `readonlyResult: PASS` or `FAIL`, `successScope: transport-and-verified-market` without an owner or `transport-market-and-owner` with one; `statuses.transport`/`statuses.market` are PASS/FAIL, while `statuses.owner` is NOT_CONFIGURED/COMPLETE/INCOMPLETE. `requiredChecks`, `blockers`, `ownerAcceptanceBlockers`, `g0Complete` and `exitCode` keep transport success separate from owner acceptance. Exit 0 is only the stated read-only scope; exit 2 reports failed/blocked required checks. A no-owner readonly PASS is still **not G0 complete or G1**. Capture/setup/cleanup failures remain in the artifact; cleanup cannot erase the primary cause.

Final semantic doctor ran at 2026-10-27T05:32:53.000Z–05:33:04.770Z under Node v24.22.1, SDK 0.32.1/viem 2.57.11: **readonly PASS / transport-and-verified-market, exit 0**, owner **NOT_CONFIGURED**, `g0Complete: false`, G1 NOT_RUN, signing requested false and transactions sent 0. [Final JSON](../evidence/g0/doctor-2026-10-27T05-32-53.000Z.json), [command/exit log](../evidence/tests/mvp-doctor-final-2026-10-27.txt). BTC/USDso pool `0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0` and registry `0x52E2ccebAeC9332672C247e9A90AA3d61FB615ef` were verified; exact genesis/parameters/deposit and the locked size-unit ambiguity are recorded in [STATE](STATE.md#current-read-only-verified-market--not-owner-acceptance). Owner and accepted owner pool remain null. This is this environment's diagnosis, not owner-machine reachability or permission to trade. Pre-change [baseline JSON](../evidence/g0/doctor-2026-10-27T05-16-33.861Z.json)/[log](../evidence/tests/doctor-baseline-2026-10-27T05-16-32.726686+00-00.txt) are retained, not overwritten.

## Health and readiness

- GET /healthz: process alive and current mode. It is not evidence of chain availability.
- GET /readyz: replay is ready locally; live readiness depends on the latest desk assessment. A live failure remains HTTP 503.
- GET /api/desk: fetches a current snapshot; discovery/read failure must not imply zero exposure.
- GET /api/evidence: side-effect-free export of the selected durable lifecycle (local owner scope only), sanitized operation summaries and current display context. Optional `?lifecycleId=` selects an existing lifecycle ID; the response's `lifecycle` is nested, not a replacement for the snapshot. Downloading does not capture observations, send, reconcile, clear locks or establish current coverage. Replay remains replay and cannot read private owner history.

No automatic restart or background service has been installed. The server handles SIGINT/SIGTERM and closes its SQLite journal. Keep DATA_DIR local and durable for owner mode; do not delete or reset it to clear an unresolved transaction.

## No-send owner boundary

`APP_MODE=live-owner`, loopback, `READ_ONLY=false` and `ALLOW_TESTNET_WRITES=true` enable local owner routes; they do not grant transaction permission. The UI's unsigned reservation/discard controls still require an already established exact-owner wallet identity. This ticket does not authorize establishing that wallet session, so the actual owner browser flow remains **NOT_RUN** when that identity is absent. Do not click Connect to work around it. Replay preview/export and a stubbed no-send harness do not count as a live owner dry run.

In an already separately authorized owner session, the unsigned-only sequence is **Preview stop → Reserve fresh owner draft → inspect owner/pool/registry/action/trigger/native deposit → export → Discard unsigned draft**. Reservation records an unsigned journal draft; discard changes only that unsigned Draft, not a chain stop. Never click **Review in owner wallet** during this implementation. An expired draft is discarded and refreshed, not sent. Never discard, delete or reset an unresolved Submitted/Unknown/NeedsReview operation to bypass its lock.

## Read-only owner evidence capture

`POST /api/owner/evidence/capture` is local-owner-only and requires the existing loopback, exact-Origin and per-process CSRF controls. Its request has `kind: 'opening' | 'missing-sl' | 'gap' | 'residual'`, with `openingTxHash` required only for `opening`. No wallet connection or signature is needed for this read-and-persist action. It does not accept client assertions of verification and cannot prepare or send an order.

The owner UI labels this **Capture owner evidence · no signing** / **Capture observation (read + persist only)**. Opening capture inspects a transaction already sent outside this desk and creates a lifecycle ID; later observations append to the current lifecycle in the same owner/market scope. Supply the real existing opening hash only after separate authorized execution; no opening-order button or lifecycle runner is provided. Missing-SL, gap and residual captures persist chain observations, not a caller's chosen verdict. Initial/replacement stop and selected-cancel proof comes from the durable original operations and reconciliation. Failed/incomplete reads remain unknown; capture/export never promotes recovered or ambiguous operations or unlocks the owner.

Historical no-send capture/persistence smoke is recorded in the [evidence note](../evidence/mvp-2026-10-27/NOTES.md): the built synthetic local-owner UI captured opening/missing-sl with duplicate rejection and zero operations without wallet Connect/Review; a separate built HTTP harness captured all four kinds across two real process PIDs, persisted NeedsReview through restart and exported without mutation. Protocol reads were stubbed and send/wallet methods threw. These original391/15 engineering captures were not rerun after either loader correction; unchanged UI/server bytes do not establish a final-source rerun. Actual owner-session, lifecycle, residuals and reserve/export/discard remain NOT_RUN.

## Evidence references and checkers

The default `evidence/submission.json` keeps `liveEvidence: null`, `realPerpsOrder: false`, `nativeProtectionReadback: false`, `buildUrl: null`, and unchanged external gates. Do not check in a fictional or dangling lifecycle reference. Only real matching files justify a separately authorized metadata update. The reference contract, once those files exist, is:

```text
liveEvidence: {
  doctor:    { path: string, sha256: string },
  lifecycle: { path: string, sha256: string }
}
```

- `submission:check [submission-metadata-path]` defaults to `evidence/submission.json`.
- `verify:evidence [manifest-path] --submission <submission-metadata-path>` keeps the historical manifest as its positional input and explicitly ingests live references; default manifest is `evidence/manifest.json`.
- Referenced paths resolve relative to the containing submission metadata file, **not** the current working directory. Each `sha256` is the SHA-256 of the exact raw referenced file bytes, including whitespace. The browser downloads the exact GET response text, without an extra client wrapper or assessment rewriting.
- The server payload's `sha256` is a different checksum: SHA-256 of the serialized server body excluding its own `sha256`. Raw-file digest, payload checksum and snapshot fingerprint are not interchangeable, signatures or chain attestations.
- Both checkers share semantic and file-reference/hash validation: schema, identity, chronology, completeness, recomputed assessments and operation/receipt/independent-readback links. Every loader rejection returns `valid: false`, both eligibility flags false, a shared `status`, and the same file-only/nonattestation fields. Absent/null `liveEvidence` or a referenced file failing with ENOENT is `MISSING`; malformed references/metadata, invalid JSON, hash/checksum failures and other read errors are `INVALID`. Downloaded wrappers require outer `live-owner` before unwrapping; replay/live-readonly are `HISTORICAL_OR_REPLAY`, other/absent modes `INVALID`. Raw durable lifecycle semantics/live-owner validation are unchanged.
- Shared results retain `historical: true`, `fileOnly: true`, `originAuthenticated: false`, `currentChainRevalidated: false`, `currentChainRevalidation: 'NOT_RUN'` and `originAuthentication: 'NOT_ESTABLISHED'`, including rejection paths. `CAPTURED_COMPLETE` means internally consistent captured history, not a new chain probe or current protection. Source/lock identities, raw-file hashes and payload checksums do not authenticate who produced a file; classification normalization does not promote eligibility, edit claims or change trading/authentication.
- Evidence-derived eligibility does not rewrite metadata. Readiness needs both valid real proof and the explicit claims plus whitelist, reviewer access, demo and published-X gates. Replay, receipt-only, stale-at-observation, incomplete or recovered proof cannot satisfy G1. Historical complete observations are not a current protection verdict.
- Immutable draft lineage uses its canonical embedded `snapshot-v1:` source and validates identity/configuration, chronology and freshness at draft creation. A fresh complete API draft read after the durable observation is allowed; it need not be byte-identical to that earlier capture. An observation copied into another owner/market scope is still invalid.

```sh
npm run submission:check
npm run verify:evidence -- evidence/manifest.json --submission evidence/submission.json
```

Run independently under Node24.22.1. Final original-source default [submission](../evidence/tests/mvp-classification-submission-2026-10-27.txt)/[evidence](../evidence/tests/mvp-classification-evidence-2026-10-27.txt) each exited **2 / BLOCKED**, metadata unchanged, live refs null, real live claims false, Build null/submitted false and no current-chain revalidation. [16 actual CLI invocations](../evidence/tests/mvp-classification-cli-2026-10-27.txt) exercise matching synthetic live-owner exit0, replay/read-only/actual replay download HISTORICAL_OR_REPLAY, missing metadata/files MISSING, and malformed/unsupported input INVALID exit2. Prior six/14-case CLI captures remain historical; synthetic completeness is not real G1. This distribution's `test:judge` remains explicitly offline-only: its evidence stage uses `--allow-incomplete` and reports OFFLINE_SCHEMA_ONLY. Standalone readiness checks remain strict. [`live:testnet`](../evidence/tests/mvp-live-refusal-2026-10-27.txt) exited2 refusal, never a sender.

## Recovery

An interrupted AwaitingSignature or Reconcile operation becomes Unknown on restart and retains the account lock. Recover the original hash from the owner's wallet activity, open that exact operation and use hash recovery/reconcile. A hash is not success evidence; chain scope, canonical receipt and native state must still pass. If no hash can be recovered, stop and investigate. Do not create another stop merely because time passed.

## Release, hosting and judge access

No public app deployment is claimed. The 2026-10-27 read-only check observed `https://github.com/peterpeter228/dreamshield-public` PUBLIC, authenticated viewer permission ADMIN, main `8e85e468a231350ebacbb2dbce0f5c746d47bd66`, not reviewer access or an updated sync. Inherited historical logs retain absolute workstation paths; this update is a disclosed NOT_PUSHED local delta/archive plus separate clean-history candidate, without rewriting existing history. Exported evidence derivatives are labelled and hashed over actual exported bytes. Public demonstrations must use replay/live-readonly, no signer/private owner journal or reachable owner mutation endpoints. Never tunnel owner mode or change repository visibility.

## Remaining live acceptance

Historical SDK DNS/refusal failures are not a current outage or deployment mismatch: the final read-only doctor passed transport/verified-market in this environment, while owner NOT_CONFIGURED keeps G0 owner incomplete/G1 NOT_RUN. Never weaken genesis/completeness guards. No isolated owner or accepted owner pool exists, and owner-machine reachability is unverified. STT faucet gas/paper USDso, verified atomic size/grid and current registry-read native deposit are required; the observed deposit is not a constant or execution approval. Resolve the locked 1–2-lot/minimum-grid ambiguity recorded in STATE before any separately authorized sizing. Real opening → missing SL → native stop/readback → selected cancel/gap → replacement/readback → residual evidence remains NOT_RUN. See [LIVE_HANDOFF](LIVE_HANDOFF.md); replay is not production/live acceptance.
