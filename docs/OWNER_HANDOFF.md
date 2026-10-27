# DreamShield consolidated owner handoff

Updated: 2026-10-27. Private engineering handoff; **G1 NOT_RUN / NOT SUBMITTED**. The delivered-history section below retains its original identities and results; it is not a current implementation verification claim.

## Locked authority and current boundary

Scope: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/MVP_SCOPE.md` (amended `AUTH-20261027-DREAM-LOT-SIZE`); work packages: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/DEV_HANDOFF.md`; amendment: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/AMENDMENT-LOT-SIZE-20261027.md`; `HO-dreamshield-mvp-1` / `AUTH-20261027-DREAM-MVP-SCOPE`, base `2d316ae517986a7a70372dc9ff582be1c63e9abc`. Acceptance is already recorded in the adjacent structured handoff. One isolated EOA public address, one doctor-verified **BTC** market, chain **50383**, position size = **exactly one market-minimum order** (observed ≈13 grid lots), max **1–2 concurrent native stops**; the owner may tighten. No signing/trading/funding, wallet session, mainnet, Submit Build, X publication, organizer contact, Feedback filing or visibility changes are authorized by this ticket. G1 live signs still wait for owner isolated EOA.

Final semantic [doctor](../evidence/g0/doctor-2026-10-27T05-32-53.000Z.json) under Node v24.22.1 on 2026-10-27T05:32:53.000Z: **PASS / transport-and-verified-market, exit 0**, BTC/USDso verified, owner NOT_CONFIGURED/G0 false/G1 NOT_RUN, no signing/send. Latest [wrapper verification/input map](../evidence/mvp-2026-10-27/wrapper-verification.json): Node v24.22.1 typecheck/test/build exit 0, **399/399 tests/16 files**, 8 new regressions, existing lazy chunk warning. `scripts/live-evidence-files.ts` accepted otherwise valid nested synthetic owner proof under replay/live-readonly wrappers because it ignored outer mode; one-line fix rejects non-`live-owner` wrappers before unwrapping, direct raw lifecycle validation unchanged. [Six actual CLI invocations](../evidence/tests/mvp-wrapper-cli-2026-10-27.txt): both checkers reject replay/live-readonly wrappers (exit 2), accept matching synthetic live-owner proof (exit 0), defaults unchanged false/null. Earlier 391/15, initial incidental assertion failure, 14-invocation CLI, browser/synthetic capture/persistence results remain historical in [notes](../evidence/mvp-2026-10-27/NOTES.md); browser/UI/server source bytes unchanged, no new browser/persistence run claimed. No real owner/session/reserve/discard or G1 was run; residuals unknown. [STATE](STATE.md) records verified market/deposit and sizing blocker. Registration REGISTERED; **DX-0327 WAITING_EXTERNAL**/reviewer access unresolved. Proof remote observed PUBLIC/ADMIN main `8e85e468a231350ebacbb2dbce0f5c746d47bd66`, not reviewer access. Product PRIVATE; no publication/send authorized.

Historical tested implementation code/evidence commit: **`90e590d233dacbca6869a1409bbd11221f1485a5`**, local/NOT_PUSHED, including unchanged tested UI bytes omitted from the earlier partial commit. [Original input inventory](../evidence/mvp-2026-10-27/verification.json), source-inventory SHA-256 **`e3912a5062b6c06a19ac4cc49df63d77583e7a8fa734f6b893273af06711d4c4`**, belongs to that 391/15 checkpoint, not the latest wrapper-fixed code. Latest measured inputs are in `wrapper-verification.json`; final tested/source/sanitized IDs are recorded externally after source/docs commit, not guessed here. Historical integration-owner [document check](../evidence/mvp-2026-10-27/document-links.json): **237 local links / 18 heading anchors / 0 errors**, not a check of this delta or reviewer/live acceptance.

WP3's **prior local fallback was independently verified / NOT_PUSHED**: [STATE](STATE.md#wp3-verified-local-distribution--not-remote-acceptance) retains historical 169-file archive, af6/e1 sanitized identities and proofs under `/workspace/dreamshield-distribution-20261027/`. They predate wrapper fix and are not final 399/16 delivery. Canonical root `delivery.json` points to refreshed final artifacts/identities under `wrapper-refresh/`, including `product/`, `clean-source/`, `bundle/clean/`, `bundle/local-only/`, `verification/` and `branch-identities.json`, populated after source/docs commit/runtime verification. Original root artifacts remain historical. Final private HEAD belongs in existing `HO-dreamshield-mvp-1.json` beside locked scope. Prior snapshot `c73642e91f46c7fdae81a9ae60bf8e4757f23040` contains historical tested code, not latest code. Ordinary patch/history remain **LOCAL ONLY / NOT FOR PUBLICATION**: inherited absolute paths in ten historical logs fail sanitization and remain in patch removal context. Preferred sync was not attempted; history rewrite, force-push/replacement not authorized. Clean candidate is parentless, not fast-forward sync; PUBLIC/ADMIN is not reviewer access. WP5 stays **DRAFTS_READY / NOT SUBMITTED**.

## Historical delivery and verification

- Tested implementation commit: `de3cfe50b5517278e72a4b9a06806af0f22cc342`.
- Verified main metadata commit: `a05e52cf970f92f00d9ea828f4a4559aa8c1ead9` (later documentation-only commits may follow).
- 90 offline tests, typecheck and production build passed: `evidence/tests/offline-2026-10-24.txt`.
- Desktop replay interactions and actual downloads: `tests/browser/QA-2026-10-24.md`, `evidence/browser/`.
- English README and runnable private quickstart: `README.md`.
- 90-second recording script: `docs/DEMO_SCRIPT.md`.
- Actual demonstration screenshots and downloaded JSON: `docs/DEMO_ASSETS.md`. These are the delivered demonstration materials; no video or live-transaction footage is claimed.
- Three English X drafts and full narrative/form working draft: `docs/SUBMISSION_DRAFT.md`. Drafts are not posted. Required factual fields are explicitly marked rather than invented.
- Independent review and conservative remediation record: `review/INDEPENDENT_REVIEW.md`, `review/REMEDIATION_RECHECK.md`.
- Latest Argon static review: `evidence/review/argon-2026-10-25/receipt.json`; independent corrections and 119 offline tests: `review/ARGON_VERIFICATION_2026-10-25.md`. Previous timeout preserved historically. No post-fix Argon or formal audit claim.

## Read-only and unsigned owner prerequisites

Supply only the public address of a disposable isolated EOA you control; never a seed/private key and never an inferred registration payout wallet. Both application and doctor use **`DEMO_OWNER_ADDRESS` / `DEMO_POOL_ADDRESS`**. The market must be doctor-verified for chain/genesis, pool/bank/registry/code binding, decimals, tick, lot, minimum quantity and valid mark. Derive the executable size as **exactly one market-minimum order** on the verified BTC grid (observed ≈13 grid lots), using bigint/decimal serialization; do not silently round or size above market-min. Use STT faucet gas and paper USDso, and read native-stop deposit from the verified registry, not the exchange TP/SL 0.15 STT note.

A current pinned Node 24.22.1 doctor capture may report PASS or FAIL+cause; historical DNS/refusal failures are not a current transport diagnosis. Keep genesis guards intact. A verified market without complete configured-owner reads is not G0 owner acceptance, and sandbox reachability is not proof of owner reachability. Missing owner, pool, balances or coherent reads must stay unknown/blocked.

The diagnosed BTC minimum is **13000** atomic base units with lot **1000**: **13 SDK grid lots**. Per `AUTH-20261027-DREAM-LOT-SIZE`, that market-minimum **is** the locked position size; keep BTC; do not switch markets or auto-increase above min. Concurrent native stops remain max **1–2**. The old 1–2-lot size-cap / BLOCKED-pending-clarification language is retired. No amount/trade is approved by the doctor PASS; G1 still needs a separate owner isolated EOA + sign auth.

The no-send sequence is **Preview stop → Reserve fresh owner draft → inspect/export → Discard unsigned draft**, never **Review in owner wallet**. Reservation/discard currently requires an already established exact-owner wallet identity; establishing it is not authorized here, so the actual browser owner path remains NOT_RUN. Do not click Connect to enable it. The separate local-owner **Capture owner evidence · no signing** control needs no wallet connection: it reads/persists an existing opening hash or missing-SL/gap/residual observation only. See [LIVE_HANDOFF](LIVE_HANDOFF.md) and [OPERATIONS](OPERATIONS.md#evidence-references-and-checkers) for the guarded capture, side-effect-free export and file-reference commands. Offline stubbed smoke is engineering proof only.

Only separate owner execution authorization can permit the real sequence below; no current procedure signs, trades or funds on the owner's behalf.

Required live evidence:

1. Actual Tokyo50383 opening perps order, canonical receipt, decoded owner-bound fill and non-zero position.
2. Complete fresh missing-SL observation; separately owner-confirmed initial native reduceOnly SL, original operation/call binding and independent matching native readback.
3. Explicit selected-stop cancellation, receipt/events, direct absence plus nonzero exposure/protection gap, then distinct linked replacement SL and readback.
4. End residual position, stops, resting orders, wallet STT/collateral and bank unlocked/locked collateral, with observation block/hash and per-read completeness/errors. Unknown or unpinnable reads cannot be relabelled zero/cleared.

An uncertain transaction must be reconciled before another send. A manually recovered hash remains NeedsReview because this version cannot prove original-request provenance or unlock it automatically. Read-only observation remains available. Do not delete the journal to bypass the lock.

Path-backed checkers validate captured-file consistency, not file origin or current-chain protection. `liveEvidence` stays null and live flags false until real matching artifacts and separately authorized claims exist. Checksums are not signatures; historical full evidence does not establish today's coverage. Default strict checks should remain exit 2 / BLOCKED with absent G1/external evidence; current command outcomes are not claimed here.

## Separate external gates — not authorized here

- Whitelist: registration is not whitelist approval. **DX-0327 WAITING_EXTERNAL** is unresolved, not rejected; no organizer message or whitelist chase is authorized. No internal entrant contact details belong in public proof or paste-ready copy.
- Review access/distribution: public proof identity is supplied, but actual access/reproduction and any sanitized delta sync must be evidenced separately. A local PR-ready/NOT_PUSHED bundle is not remote persistence or judge access. Never change visibility or copy private ancestry/internal scaffolding into distribution.
- Public communications: three English X drafts remain unposted; no X URLs exist. Publication requires separate authorization and a current tag/requirements check.
- Submission: [SUBMISSION_DRAFT](SUBMISSION_DRAFT.md) is **DRAFT ONLY / NOT SUBMITTED / G1 NOT_RUN**, with explicit field blockers, not guessed team/entrant facts or form limits. Planning cutoff is **2026-11-02 06:59 Asia/Shanghai**; the conflicting 07:59 body time is not slack. Only separately authorized submission and a real Build URL/receipt establish submitted status.
- Public hosting, if chosen under separate authorization, must be replay/live-readonly without signing keys, private journal or owner mutation routes. A public URL/video is not assumed mandatory.
- Local Feedback reports are unfiled, current reproduction/dedup NOT_RUN, and organizer acceptance unrecorded. Filing needs separate authorization. Mainnet and its later prize condition are out of scope.

## Acceptance still not established

Real wallet/signing lifecycle; live indexer/reorg behavior; automatic recovered-hash provenance resolution; physical mobile-device/touch behavior and exact 375px at 100% zoom. Real tablet 768px, narrow desktop 485px and zoomed-desktop CSS323px checks are recorded separately in tests/browser/RESPONSIVE_QA.md, without claiming a real phone test. Current limitations and network evidence remain in `docs/KNOWN_LIMITATIONS.md` and `evidence/g0/`.

No submission, whitelist request, message, post, deployment or financial action occurs merely by reading or following the local replay quickstart.

### Latest recovery caveat (2026-10-25)
Legacy unanchored drafts and same-second transaction timing ambiguity remain locked for review. These guards do not authenticate a malicious local client. Current owner/protocol remediation has offline coverage only; the older browser evidence is not new wallet acceptance.
