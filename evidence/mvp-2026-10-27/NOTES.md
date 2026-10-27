# MVP engineering evidence — no live G1 execution

## Scope

Implements the [product scope and safety boundaries](../../docs/STATE.md#product-scope-and-safety-boundaries). Single isolated owner, single doctor-verified market, chain 50383. No wallet session, permission request, signature, transaction, funding, external message, X publication, submission, mainnet or visibility change was performed.

## Current live-readonly evidence

- Node v24.22.1; SDK 0.32.1; viem 2.57.11; unchanged lock digest `61890044899ef64ddfb2404e39e20979aac2dcd3a404abacddf39e84d3ea5c21`.
- Final [doctor JSON](../g0/doctor-2026-10-27T05-32-53.000Z.json), [command/output/exit](../tests/mvp-doctor-final-2026-10-27.txt): **PASS / transport-and-verified-market / exit 0**. HTTP, actual WS, SDK, existing genesis guard and verified BTC market passed in this environment.
- Owner NOT_CONFIGURED; owner acceptance blocked, G0 incomplete, G1 NOT_RUN. Verified market diagnosis does not select an owner scope or establish owner-machine reachability.
- BTC minimum quantity 13000 and lot grid 1000 imply 13 grid lots per minimum order. Locked 1–2-lot sizing is unresolved; no reinterpretation or trade was authorized. See [LIVE_HANDOFF](../../docs/LIVE_HANDOFF.md).
- Earlier [baseline](../g0/doctor-2026-10-27T05-16-33.861Z.json) retained: old exit 0 did not establish semantic completeness.

## Final classification normalization and original-source verification

- Every loader rejection now returns shared status/file-only/nonattestation fields with false rejection eligibility. Missing/null live metadata or referenced-file ENOENT is `MISSING`; replay/live-readonly wrappers are `HISTORICAL_OR_REPLAY`; malformed metadata, unsupported/absent wrapper modes and other loader errors are `INVALID`. Raw lifecycle semantics/live-owner validation are unchanged; no trading/authentication change or G1 promotion.
- [Final original-source checkpoint](classification-verification.json): **52 source hashes**, Node **v24.22.1**, [typecheck](../tests/mvp-classification-typecheck-2026-10-27.txt), [tests](../tests/mvp-classification-tests-2026-10-27.txt) and [build](../tests/mvp-classification-build-2026-10-27.txt) exit **0**, **401 tests / 16 files**. Existing large lazy protocol-chunk warning remains. Prior399/16 wrapper and original391/15 remain historical.
- [16 actual CLI invocations](../tests/mvp-classification-cli-2026-10-27.txt): matching synthetic live-owner accepted exit0; replay/read-only/actual replay download HISTORICAL_OR_REPLAY, missing metadata/files MISSING, malformed/unsupported input INVALID, each exit2. Shared historical/file-only flags remain true; origin authentication/current-chain revalidation remain false, NOT_ESTABLISHED/NOT_RUN. Synthetic completeness never promotes default claims or establishes real G1.
- Final strict [submission](../tests/mvp-classification-submission-2026-10-27.txt)/[evidence](../tests/mvp-classification-evidence-2026-10-27.txt) each exit **2 / BLOCKED**, metadata unchanged, live claims false/reference null, Build null/submitted false. **G1 NOT_RUN**.
- Separate built replay re-exercise at prior `02fdeb8229b31e063e7660eef4c31a350b967f9f`, before the CLI-only classification correction: all12 scenarios, unsigned trigger2900/signing disabled, actual download, **15546 ms** aging and injectedHTTP503 revocation to Unknown; browser/service closed, no wallet Connect/Review. The final checkpoint's explicit external-delivery reference identifies `completion-verification/browser.json`, not an archive member. UI/server bytes are unchanged; this is not a final-source browser/persistence rerun.
- New evidence exports are labelled derivatives; original/exported raw hashes are separate. All original-source input maps retain their measured checkpoint scope and are not rewritten to impersonate transformed distribution bytes. The manifest hashes actual admitted exported artifacts. Root external delivery.json owns final source/result IDs and independent refreshed-distribution runtime outcomes.

## Historical wrapper correction checkpoint — 399/16

- [Before-fix reproduction](../tests/mvp-wrapper-before-2026-10-27.txt) accepted complete synthetic owner proof inside replay/live-readonly wrappers. The earlier guard rejects every non-live-owner wrapper before unwrapping; [post-fix smoke](../tests/mvp-wrapper-smoke-2026-10-27.txt) retains live-owner file validation.
- [Wrapper checkpoint](wrapper-verification.json): Nodev24.22.1 typecheck/tests/build exit0, **399 tests/16 files**, including8 regressions; [six CLI invocations](../tests/mvp-wrapper-cli-2026-10-27.txt) exercise both checkers. Strict [submission](../tests/mvp-wrapper-submission-2026-10-27.txt)/[evidence](../tests/mvp-wrapper-evidence-2026-10-27.txt) exit2; live claims false/reference null, Build null/submitted false. Those results predate final classification normalization.
- Earlier391/15, browser/UI/persistence and14-case CLI remain historical. Unchanged UI/server bytes do not imply reruns after either loader correction or live owner/G1 acceptance.

## Historical offline implementation gates

[Historical exact commands, exit codes and source SHA-256 inventory](verification.json); [wrapper-verification.json](wrapper-verification.json) records historical399/16, while [classification-verification.json](classification-verification.json) records final original-source401/16 inputs.

Historical tested-code checkpoint: `90e590d233dacbca6869a1409bbd11221f1485a5`; its measured bytes match the original inventory at that checkpoint. The wrapper-loader fix and 8 new tests came later. Final source and delivery identities are external receipts, not inferred from historical input hashes.

- Typecheck and production build: exit 0. Existing large lazy protocol-chunk warning remains.
- Corrected historical suite: **391 tests / 15 files passed**, [output](../tests/mvp-test-final-2026-10-27.txt), followed by historical399/16 and final original-source401/16 above. Initial [390-pass/1-fail output](../tests/mvp-test-2026-10-27.txt) retained: a newly added exact event-object assertion rejected an optional diagnostic field. Removed incidental event-shape and serialization-count assertions, retaining persistence, immutable-history, rollback and lock behavior checks. No production change was needed for that historical assertion correction.
- Strict [submission checker](../tests/mvp-submission-2026-10-27.txt) and [evidence checker](../tests/mvp-evidence-2026-10-27.txt): each exit 2 / BLOCKED. Default live claims remain false, `liveEvidence: null`, Build URL null and submitted false.
- [Manual live entrypoint](../tests/mvp-live-refusal-2026-10-27.txt): exit 2 refusal; no key loaded or broadcast.

## Historical exercised nontrading surfaces

The following captures and 14-invocation CLI smoke belong to the earlier checkpoint; unchanged UI/server bytes do not turn them into post-wrapper-fix reruns.

- Built Express replay application served `dist/web`; real Chromium at observed CSS **1376×771, DPR 1**. [Browser results](browser.json): all 12 scenarios, unsigned preview, disabled signing/selected cancellation, 15-second aging revocation and injected read-failure revocation. [Preview](replay-preview.png), [read failure](replay-read-failure.png).
- Actual [downloaded replay JSON](replay-evidence.json) is the exact server response, not a client assertion wrapper. Its raw SHA-256 is `2bed7101c5512cc38764a1b447fd05d8a38b9b48481c89d0812a87322a389743`. Replay is not live proof.
- [Synthetic owner UI](owner-ui.json), [screenshot](owner-capture-synthetic.png): explicit offline protocol stub, opening and missing-SL capture through the actual built UI, duplicate-stage rejection, zero prepared/sent operations, no wallet Connect/Review click. This is **not a real owner session or chain observation**.
- [Separate-process built HTTP smoke](persistence-smoke.json): two server PIDs, opening/missing-SL/gap/residual capture, local persistence, restart, side-effect-free export, incomplete residuals and retained NeedsReview owner lock. Protocol send/wallet methods throw. **Offline engineering proof only, not G1.**
- [Actual CLI reference ingestion](../tests/mvp-cli-smoke-2026-10-27.txt): 14 invocations over synthetic complete proof, false explicit claims, raw-byte tampering, missing gap, recovered NeedsReview, actual replay download and missing file. Paths resolve from alternate metadata directories. Synthetic complete files exercise semantics only and do not modify default metadata, authenticate origin or revalidate current chain state.

## Untested and blocked

Actual owner browser reserve/export/discard, live-owner reads, opening/fill/position, native stop placement/readback, selected cancellation/gap/replacement, final balances/residuals and owner-machine reachability: **NOT_RUN**. Residual positions/stops/orders/balances remain unknown, not cleared. Whitelist and reviewer access remain unverified. No formal audit claim. Distribution identities and scoped verification are recorded separately in STATE and the external local delivery receipt.
