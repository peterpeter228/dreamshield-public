# Current state

Updated: 2026-10-27 (distribution cleanup; historical verification remains separately scoped)
Project: DreamShield, testnet-only protection desk.
Historical original-repository tested code and evidence: de3cfe50b5517278e72a4b9a06806af0f22cc342. The original repository's main was updated non-force with expected prior SHA; its remote main and all 92 persisted file blob hashes were read back with no mismatch on 2026-10-24 at 22:59 UTC. These identities do not describe the cleaned delivery repository's root commit.

## Verified facts
- SDK 0.32.1, Node 24.22.1, viem 2.57.11 and lockfile pinned. Typecheck and production build passed after recovery fixes; 90 offline tests passed. Logs: evidence/tests/offline-2026-10-24.txt.
- Earlier timestamped HTTP and WS chain identity 50383, system bytecode, direct pinned system config, 21 indexed markets and one market's risk configuration were observed. They do not establish owner protection or execution.
- On 2026-10-24, the isolated-executor SDK system-config probe and one bounded retry failed with nested WebSocket DNS EAI_AGAIN. A separate cloud-browser-machine probe at 22:50 UTC failed HTTP/WS/SDK with connection refusal. Earlier successful observations and these failures are historical; Phase2 did not recheck transport, so present reachability is unverified. Genesis safety checks remain intact. No verified deployment mismatch has been established.
- Independent review identified and remediated two P1 defects: missing recovered-hash binding and unresolved operations failing to suppress a green headline. Integration verification reran 90 tests, typecheck and build. See review/INDEPENDENT_REVIEW.md.
- Argon HTTP200 static review completed on 2026-10-25; requested model gemini-4-argon-high, response modelVersion null. Findings independently reproduced/corrected; 119 offline tests, typecheck and build pass. See review/ARGON_VERIFICATION_2026-10-25.md. No post-fix Argon or formal audit claim.

## Gate status
- G0 PARTIAL / BLOCKED_LIVE: installed/build/chain observations available; transport observations are historical and current reachability unverified; no configured owner.
- G1 BLOCKED_EXTERNAL / NOT_RUN: no isolated owner, approved test position bounds, wallet session or actual perps order/SL lifecycle.
- G2 OFFLINE_CORE_VERIFIED: domain, durable journal recovery, API boundaries and reconciliation code tested offline. Full live observer/reorg behavior remains unverified; no claim of completed live coverage.
- G3 DESKTOP_REPLAY_VERIFIED: Phase1 rebuilt desk exercised all 12 replay scenarios, friendly reasons, unsigned preview, disabled selected cancellation and actual export at observed CSS1408×871. See evidence/phase1-2026-10-26/NOTES.md. Earlier 8-scenario/aging/read-failure and 768px/485px/zoomed CSS323px checks remain historical, not rerun responsive or owner-flow passes. Physical mobile/touch, exact375px at100% and wallet-signing remain unverified.
- G4 OFFLINE_REMEDIATED: Argon baseline static review plus independent corrections and 119-test regression pass; no formal audit, post-fix external review or live acceptance.
- G5 DRAFTS_READY: English README/quickstart, demo script, X and DoraHacks drafts, [readiness checklist](SUBMISSION_READINESS.md), and [two local Feedback reports](../feedback/README.md). No public deployment, X posts, verified whitelist acceptance, external Feedback filing or submission.

## 2026-10-25 remediation
Source changes: hash-binding and transaction provenance guards, cancellation scope checks, full later native stop readback matching. Evidence logs and raw external review are persisted with that checkpoint. Legacy unanchored drafts and ambiguous same-second transactions conservatively stay NeedsReview; do not bypass their lock. The earlier browser evidence predates those owner/protocol changes; Phase1 adds replay-only verification, not a wallet pass. Historical source digests remain in evidence/manifest.json; Phase1 tested-source/build digests are recorded separately below.

## 2026-10-26 Phase1 offline differentiation
- Added `tp-only`, `wrong-side-sl`, `trigger-met` and `residual-stops`; retained all eight original scenarios. TP-only/wrong-side diagnostics explain missing SL coverage without relaxing assessment guards. Friendly labels preserve raw codes in evidence.
- Node 24.22.1: `npm run typecheck && npm test && npm run build` passed; 156 offline tests. Production build retains the large lazy protocol-chunk warning. Actual browser outcomes, four screenshots, downloaded export and source/build fingerprints: [Phase1 evidence notes](../evidence/phase1-2026-10-26/NOTES.md).
- [Differentiation matrix](DIFFERENTIATION.md) and [90-second replay script](DEMO_SCRIPT.md) distinguish offline assessment from OrderAnchor's unverified author claims and shared journal/export scope. No wallet, signature, live trade, chain probe, deployment or publication performed. G0/G1 remain blocked; this is not live acceptance or a formal audit.

## 2026-10-26 Phase2 local Feedback and readiness pack
- Added two non-security reports from existing evidence: historical SDK nested WS EAI_AGAIN diagnostic attribution (provisional normal severity; SDK-defect attribution inconclusive) and official-page deadline timezone conflict (18:59 UTC−4 = 22:59 UTC, one hour earlier than body 23:59 UTC). [Index and provenance](../feedback/README.md). Current reproduction and duplicate checks NOT_RUN; not submitted or organizer accepted. OCO no-fill behavior remains unvalidated, not filed as a defect.
- Added the [PASS/FAIL/BLOCKED readiness checklist](SUBMISSION_READINESS.md), explicit unpublished README X placeholders, and additive local-material paths in [submission metadata](../evidence/submission.json). Existing false/null live, whitelist, reviewer-access, X and Build fields are unchanged. `feedback.accepted: false` records no acceptance, not rejection.
- Node **v24.22.1**: `npm run typecheck && npm test && npm run build` exited 0; **156 offline tests across 10 files**, large lazy protocol-chunk warning retained. Actual `submission:check` and `verify:evidence` each exited **2**: submission BLOCKED / submitted false / Build URL null; schema valid / liveVerified false / liveChecks NOT_RUN. Local document/metadata smoke passed: two reports, template/status fields, original metadata values unchanged, 102 local links and 7 heading anchors resolved. [Actual commands/output, smoke notes and host timestamp](../evidence/tests/phase2-2026-10-26.txt); date in filename is the phase label, not a rewritten capture clock. No Phase2 browser, chain probe, owner/wallet, signature, trade, competition-page fetch, external message, publication, submission, commit or persistence readback performed. G0/G1 remain blocked; G5 is materials-only.

## Current chain and release state
Owner: null. Accepted pool: null (observed market is not a chosen owner scope). Transactions: none. Residual positions/balances: unknown, not asserted cleared. Build URL: null. Submitted: false. No mainnet activity.

## Next executable step
Resume G0/G1 only with working transport and the isolated owner's public address, selected market, explicit test limits and native wallet confirmation. Missing external inputs do not make replay a live pass.

## Historical original-repository persistence
Code, Argon review artifacts and remediation in the original private repository: `605e3eca4a6513dd0023e3221aeed7e260eb61d6`. Its main readback and all 29 changed blobs were verified, 95 unchanged blobs preserved. Non-force expected prior main `2d94f34d69a0b45b8f8b074b7c8c154661e279ef`. See evidence/review/argon-2026-10-25/persistence.json. Its deleted-input path keys, blob IDs and counts remain historical transaction records, not current distribution inventory or proof of the new copy.

## Distribution cleanup and offline gate
Internal execution guidance, the development guide and Argon input packages are omitted from this distribution. Retained Argon receipts, response, raw review output and conclusions preserve their historical scope; no post-fix external approval is implied. The manifest's active artifact inventory is refreshed separately from historical source/build/input/readback fingerprints.

`npm run test:judge` runs typecheck, offline tests, build and the existing evidence schema verifier with an explicit manifest path and `--allow-incomplete`. This is an offline gate, not live/submission readiness. Standalone `verify:evidence` and `submission:check` remain strict; owner, transport, live, access and submission blockers are unchanged. New-copy root identity and verification receipts are recorded outside the distributed tree.
