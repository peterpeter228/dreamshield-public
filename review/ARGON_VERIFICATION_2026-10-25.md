# Argon findings: independent verification and remediation

Date: 2026-10-25 UTC. Historical static review, not a formal security audit or live execution acceptance.
Baseline restored from the original repository's remote main `2d94f34d69a0b45b8f8b074b7c8c154661e279ef`; all 88 textual files matched Git blob hashes. Binary browser artifacts were retained in that original repository, not refetched or revalidated. Local restoration commit is not a GitHub source commit.

## External review receipt
The separately authorized request completed HTTP 200 in 77.892 seconds, beginning 2026-10-25T03:10:20.018325Z. Requested model: gemini-4-argon-high; response modelVersion: null. Backend identity cannot independently be confirmed. Usage: 23,447 input, 6,412 output, 29,859 total tokens. No automatic retry. No additional review call made during remediation.
Input packages and their preparation manifest are omitted from this distribution. Retained artifacts are the [completed request receipt](../evidence/review/argon-2026-10-25/receipt.json), [raw response](../evidence/review/argon-2026-10-25/response.json), [raw review output](../evidence/review/argon-2026-10-25/raw-review.md), [historical persistence receipt](../evidence/review/argon-2026-10-25/persistence.json), [earlier timeout receipt](../evidence/review/argon-final/receipt.json), and [review status](../evidence/review/ARGON_STATUS.md), alongside these conclusions. No API key is stored in these artifacts. Argon reviewed the baseline, NOT these later fixes. Human/model review advice is untrusted until verified; the raw review output is retained unchanged, including advice corrected below.

The completed receipt's `inputSHA256` identifies the omitted historical request, not an available input file. The persistence receipt records the original repository's `605e3eca4a6513dd0023e3221aeed7e260eb61d6` main readback, 29 changed blobs and 95 preserved blobs. Its input-path keys and Git blob IDs remain unchanged as historical transaction evidence; they do not promise current file availability or prove this distribution's commit or bytes.

## Verification matrix
| Finding | Verdict from complete source and tests | Action and evidence |
|---|---|---|
| P1-A: arbitrary old reverted hash can release operation | Confirmed correctness/safety defect in authenticated local-client reports, not demonstrated remote unauthorized exploit. Previously receipt from/to was accepted before inspecting calldata or draft timing. Unknown-first-hash also bypassed recovered provenance. Draft→AwaitingSignature could pre-bind a hash. | Reject hashes before wallet result; first non-Submitted hash is recovered; immutable recovered provenance blocks terminal state. Require server draft observed block, exact transaction hash/from/to/block/calldata/value and creation-time boundary before any terminal result. Eight initial red regressions; actual HTTP routes and journal owner lock tested. |
| P2-A: cancellation accepts nonpending/historical stop | Claimed retained filled-stop path is NOT reachable through current readLiveSnapshot: reader only emits pending chain-confirmed rows. However SDK preflight registry can differ from later factory-bound snapshot, a reproducible stale-target defect. | Explicit pending, owner, pool and registry matching before constructing cancellation. Normal pending cancellation still passes. |
| P2-B: incomplete create readback | Confirmed drift between direct stop readback and later snapshot. ABI has NO order.pool field, so that suggested check is invalid. | Require factory-bound snapshot market/pool/registry; snapshot at least as recent as direct read; match pending stop and all P0 terms again, reject unexpected OCO sibling. Eleven P2 red regressions before fixes; unchanged positive path retained. |
| Related cancel readback drift | Independently reproduced: successful old-registry cancellation plus empty new-registry snapshot previously became Applied. | Explicit cancel snapshot chain/pool/registry validation. Separate red regression retained. |
| Duplicate operation in UI | Conservative stale suppression, not established false-green. | Deferred; no UI precedence change that could discard newer server state. |
| Idempotency lookup before fresh snapshot | Returning original response for identical retry is intentional; recreating a draft would produce fingerprint conflicts. Same requestId with changed inputs is a separate semantics question. | No change. Fresh send preflight and owner lock remain. |
| Evidence “server-signed” | Incorrect wording in external review: export has an unsigned SHA-256 checksum, NOT signature. Export currently omits journal operation details. | Corrected here; standalone export enhancement remains optional and is not represented as fixed. |

## Additional full-source review
Duplicate stop IDs fail closed. Multiple matching SL quantities are not summed. OCO checks distinct reciprocal pending sibling, close direction, opposite operator and untriggered TP. Live reader pins critical reads, checks indexer watermark, registry logs across discovery, book/registry drift and final canonical hash. These source checks are not live acceptance. Dedicated broader reorg/discovery-mutation simulation remains future work.

## Tested scope and results
- 119 offline tests passed (90 existing + 29 new), typecheck passed, production build passed.
- P1 initial regression: 8 failed / 2 passed before correction. Subsequent tests include actual loopback HTTP state/reconcile endpoints with offline RPC, not mocked reconcile outcomes.
- P2 initial regression: 11 failed / 2 passed. Additional cancel readback regression failed before its correction.
- Pure expected call encoding is byte-compared to pinned SDK build-only functions for long SL, short SL and cancel; any attempted RPC/wallet access in parity tests throws.
- Logs: `evidence/tests/argon-2026-10-25/`. Vitest local clock is KST (UTC+09); e.g. 12:19 equals 03:19 UTC. No clock anomaly implied.
- Large lazy protocol chunk warning remains. No dependency or lockfile changes.
- No UI source changes and no new browser QA run. Previous screenshots remain historical; current owner wallet UI/live chain lifecycle has NOT been accepted.

## Trust boundary, migration and remaining gates
The local browser and owner token holder are trusted to report wallet outcomes honestly. No server-side calldata/time check cryptographically authenticates a claimed wallet-returned hash against a malicious local owner; the owner could also falsely assert wallet rejection. Do not present this as protection against a compromised local client.

New drafts carry observedBlock. Existing journal rows remain readable without destructive migration; unanchored legacy drafts stay NeedsReview when reconciled. Never delete the journal to bypass a lock. A recovered hash never becomes terminal automatically. Chain timestamps have whole-second precision: a transaction mined within the draft creation second may stay NeedsReview because timing cannot exclude a pre-creation transaction. This is an intentional conservative unresolved case, not a live pass or an automatic retry invitation.

No new live RPC probe, transaction, signature, deployment, external post or submission was performed. Isolated testnet owner/scope, usable official transport, wallet-confirmed real perps→SL→cancel→rebuild evidence, whitelist/eligibility, and authorized publication/submission remain pending. This review does not establish prize eligibility or probability.
