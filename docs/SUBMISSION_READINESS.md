# Submission readiness

Snapshot: 2026-10-27, locked MVP implementation evidence. **Overall: BLOCKED for official submission / G1 NOT_RUN.** Final doctor passed transport-and-verified-market, not owner acceptance. Current pinned-runtime offline gates, CLI ingestion, built replay, synthetic no-wallet capture UI and separate-process persistence smoke have [actual scoped evidence](../evidence/mvp-2026-10-27/NOTES.md); none establishes real owner execution, publication, whitelist approval or organizer acceptance. Historical outcomes remain historical.

Sources of truth: [STATE](STATE.md), [TASKS](TASKS.md), [submission metadata](../evidence/submission.json), [Feedback index](../feedback/README.md), and [Phase1 desktop replay evidence](../evidence/phase1-2026-10-26/NOTES.md).

Product limits: one isolated EOA public address, one doctor-verified market, 50383 only, smallest valid **1–2 lots**, **1–2 concurrent native stops**, registry-read native deposit, STT faucet gas and paper USDso. The owner may tighten; the payout wallet is not the trading owner. Internal planning, participant and authorization records are omitted.

**Three separate gates:** official rules establish competition requirements; DreamShield's stronger G1 acceptance requires the complete owner-bound opening/fill/position → missing SL → native stop/readback → selected cancel/gap → replacement/readback → residual lifecycle; execution authority controls what may actually run. A doctor PASS, synthetic validator fixture or offline build satisfies neither real G1 nor permission to sign. This ticket forbids a wallet session, signing/trading/funding, mainnet, Submit Build, X publication, organizer contact, Feedback filing and visibility changes.

Planning cutoff: **2026-11-02 06:59 Asia/Shanghai** (sidebar 18:59 UTC−4 = 22:59 UTC). The body says 07:59 Asia/Shanghai / 23:59 UTC; that conflict is preserved, not usable slack. Whitelist remains WAITING_EXTERNAL; no organizer contact was performed.

## Status and source scope

- **PASS**: the specifically scoped artifact or result is evidenced; no broader acceptance implied.
- **FAIL**: a required result/artifact is known to be absent or insufficient.
- **BLOCKED**: verification or completion needs unavailable evidence, access, authorization, or organizer action.

Official requirements below come from [2026-10-24 rule verification](../research/competition-verification.md), particularly its rules matrix and sources A/B: [Details](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) and [Tracks](https://dorahacks.io/hackathon/dreamdex-perps-bounty/tracks). These pages were not refetched and no submission flow was opened for this update. Two local reports are a Phase2 minimum, not an official Feedback quota. Native readback, complete opening/fill/residual proof and Node-pinned offline checks are project gates, not additional organizer rules. Exact authenticated Build labels, character limits and media constraints are unestablished; the [draft](SUBMISSION_DRAFT.md) does not invent them.

## Official MVP requirements and local materials

| Requirement / source | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| README purpose, intended audience, run instructions — rules matrix README row | PASS | [README](../README.md) identifies isolated testnet perps owners, purpose and local commands | Preserve truthful scope when updating materials |
| GitHub repository identified — rules matrix Repo row | PASS (identity/visibility only) | Delivery repository `https://github.com/peterpeter228/dreamshield-public` observed PUBLIC with authenticated viewer permission ADMIN on 2026-10-27, remote main `8e85e468a231350ebacbb2dbce0f5c746d47bd66` | ADMIN does not establish reviewer access or an updated sync. |
| Actual reviewer reproduction/source access | BLOCKED | `reviewerRepositoryAccess: false`; no reviewer-access confirmation. Inherited proof-root historical logs contain absolute workstation paths; WP3 selected fallback is NOT_PUSHED local delivery plus contamination disclosure/separate clean candidate | Final artifact/result identities not recorded at this docs checkpoint; do not rewrite history, change visibility or equate local PR-ready with access/sync |
| Matching DoraHacks email whitelisted — rules matrix Eligibility row | BLOCKED / WAITING_EXTERNAL | `whitelistVerified: false` means unverified, not rejected; no participant/contact records included | Actual whitelist outcome is external; no organizer contact was performed. |
| Real perps orders on Somnia Tokyo — rules matrix Real testnet activity / Evaluation rows | FAIL | `realPerpsOrder: false`; no actual order/hash evidence supplied | Resolve G0/G1 prerequisites, then authorized owner execution with inspectable evidence; no simulation substitute |
| Demo/building evidence — rules matrix Evaluation row | PASS | `demoReady: true` is limited by `demoScope` to local desktop replay captures; [demo assets](DEMO_ASSETS.md), [90-second script](DEMO_SCRIPT.md) | No deployed demo, video, wallet or live acceptance claimed |
| README X posts section — rules matrix README row, section presence only | PASS | [README X posts](../README.md#x-posts) has explicit unpublished placeholders | Section completion does not meet actual publication requirement |
| 2–3 real X links tagging `@DreamDEXSomnia` — rules matrix README row | FAIL | Zero posts; `xPost1: null`, `xPost2: null`; [drafts are not posts](SUBMISSION_DRAFT.md#x-drafts-not-posted) | Separately authorized publication, recheck official tag, then record real URLs |
| User value, differentiation and accurate scope — rules matrix Evaluation row | PASS | [Differentiation](DIFFERENTIATION.md), [demo script](DEMO_SCRIPT.md), README; documentation exists, not an organizer score | Do not claim competitor features absent or predict selection |

Reactivity/Agents are optional pluses, not implemented/claimed here. Public hosting, a third post, a fixed-length video, fills, minimum trade counts or mainnet actions are not asserted as additional official prerequisites. Fills/nonzero position and the full residual lifecycle are required by the project's stronger G1 bar. Future mainnet/$200 prize conditions are separate owner authorization and risk decisions, out of this scope.

## Feedback track

| Requirement / source | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| Phase2: at least two local non-security reports and index | PASS | [Feedback index](../feedback/README.md), [SDK diagnostic report](../feedback/001-sdk-ws-eai-again.md), [deadline report](../feedback/002-deadline-timezone-conflict.md); organizer-template fields and existing evidence | Local files only, not external filings |
| Reproducible finding — rules matrix Feedback row | BLOCKED | Historical SDK failure and recorded deadline comparison; procedures provided, current reproduction **NOT_RUN** | Reproduce against the pinned current environment; preserve non-sensitive evidence; do not infer continuing outage |
| First valid / nonduplicate report — rules matrix Feedback row | BLOCKED | `feedback.dedup: "NOT_RUN"`; no organizer novelty decision | Check existing reports and organizer eligibility before authorized filing |
| Exclude public security disclosures — rules matrix Security row | PASS | This Feedback pack contains diagnostic and documentation reports only; unverified security hypotheses are not findings, and DreamShield's own remediation records are not externally submitted findings | Security findings require private handling and separate authorization, not publication as Feedback in this pack |
| Current deadline resolution and SDK diagnostic attribution | BLOCKED | Deadline body 23:59 UTC vs sidebar 18:59 UTC−4 = 22:59 UTC; historical SDK nested DNS cause, defect attribution inconclusive | Organizer clarification/current reproduction required; no DST cause, early closure or deployment mismatch proven |

## Project acceptance gates

| Gate | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| G0 installed/build/read-only integration | PASS read-only / BLOCKED owner | Final Node v24.22.1 [doctor](../evidence/g0/doctor-2026-10-27T05-32-53.000Z.json) 2026-10-27T05:32:53.000Z: readonly PASS / transport-and-verified-market, exit 0; BTC/USDso verified, owner NOT_CONFIGURED, `g0Complete: false`, no signing/send; [command/exit log](../evidence/tests/mvp-doctor-final-2026-10-27.txt) | Diagnosed market is not accepted owner scope or owner-machine reachability. Actual owner/session/accepted pool absent; locked 1–2-lot units versus min13000/lot1000 remain unresolved and BLOCKED, no automatic switch or larger amount |
| G1 complete real lifecycle | FAIL / BLOCKED_EXTERNAL | `realPerpsOrder: false`, `nativeProtectionReadback: false`, `liveEvidence: null`; STATE stays **NOT_RUN** | Separately authorized isolated owner execution, real same-scope artifacts and path-backed validation; receipt is not fill/readback proof |
| G2 offline core and pinned Node verification | PASS / OFFLINE_READY | Final original-source Node **v24.22.1** typecheck/test/build exit0; **401 tests across16 files**; existing large lazy protocol-chunk warning. Prior399/16 wrapper and original391/15/initial incidental assertion failure remain historical | [Final original-source input/log map](../evidence/mvp-2026-10-27/classification-verification.json), [notes](../evidence/mvp-2026-10-27/NOTES.md); independent refreshed-distribution measurements/IDs are root external receipts, not live observer/reorg or G1 acceptance |
| Classification CLI and historical capture smoke | PASS (engineering only) | Final16 actual invocations accept matching synthetic live-owner exit0; replay/read-only/actual replay download HISTORICAL_OR_REPLAY, missing metadata/files MISSING, malformed/unsupported input INVALID, each exit2 with shared file-only/nonattestation fields and false rejection eligibility. Prior six/14-case CLI and built synthetic capture/persistence remain historical | [Classification CLI](../evidence/tests/mvp-classification-cli-2026-10-27.txt), [evidence note](../evidence/mvp-2026-10-27/NOTES.md); synthetic consistency cannot establish real owner sessions, transactions, current coverage or origin authenticity |
| G3 built desktop replay | PASS (replay only) | Actual Chromium CSS1376×771 DPR1: all 12 scenarios, unsigned preview/signing disabled, selected cancellation disabled, exact-body download, 15-second aging/read-failure revocation; [browser record](../evidence/mvp-2026-10-27/browser.json) | No wallet Connect/Review; actual owner reserve/export/discard/live surface, physical mobile/touch and exact375px at100% remain NOT_RUN/unverified; historical responsive results not rerun |
| G4 independent remediation | PASS (historical/offline only) | [Argon verification](../review/ARGON_VERIFICATION_2026-10-25.md), historical 119-test regression; **OFFLINE_REMEDIATED** only | No formal audit, post-fix Argon approval or live acceptance |
| G5 local materials | PASS (DRAFTS_READY only) | README, readiness, [field-by-field submission draft](SUBMISSION_DRAFT.md), Feedback index | Final live-backed fields and external gates remain blocked; no all-green submission claim |

**Concrete execution-sizing blocker:** the final doctor verified BTC/USDso lot **1000** and minimum quantity **13000** atomic base units, so one minimum order is **13 SDK grid lots**. Preserve the locked **1–2-lot** bound verbatim; do not silently reinterpret it as 1–2 minimum-size orders, round down below minimum, enlarge the budget or switch markets automatically. Actual owner execution remains BLOCKED until the owner clarifies/tightens units or separately accepts a verified alternative market. This does not invalidate the scoped engineering/doctor result; it forbids inferring an executable size. Exact market/deposit/genesis observation is in [STATE](STATE.md#current-read-only-verified-market--not-owner-acceptance).

## External outcomes — not performed or verified

| Outcome | Status | Evidence / meaning | Remaining action |
|---|---|---|---|
| Actual DoraHacks Build submission | FAIL | `buildUrl: null`; checker derives `submitted: false` | Authorized owner submits only after resolving prerequisites, then records real receipt URL; URL is an outcome, not a preexisting readiness prerequisite |
| Feedback externally submitted | FAIL | `feedback.submitted: false` | No report sent; authorization, current reproduction and duplicate review first |
| Feedback organizer acceptance / payment | BLOCKED | `feedback.accepted: false` means **no acceptance recorded**, not rejection; no payment evidence | Organizer decision only; local reports do not establish eligibility or reward |

## Path-backed checker contract

Use Node **24.22.1**. `submission:check [submission-metadata-path]` defaults to `evidence/submission.json`. `verify:evidence [manifest-path] --submission <submission-metadata-path>` preserves historical manifest input and explicitly consumes the same `liveEvidence` references. Those references contain `doctor` and `lifecycle` objects, each with a `path` and raw-file `sha256`; paths are relative to the **metadata file**, not the working directory. The default reference is null, never a fabricated path. Full syntax and checksum distinctions: [OPERATIONS](OPERATIONS.md#evidence-references-and-checkers).

Both checkers use shared semantic and reference/hash validation, distinguishing missing, invalid, historical/replay and captured-complete evidence. They validate identity/chronology/completeness, recomputed assessments and operation/receipt/native-readback links; explicit live claims plus valid proof and existing external gates are required for readiness. Eligibility does not rewrite flags. Their file-only results establish internal consistency, not file-origin authenticity, a new RPC probe, current-chain revalidation or current protection. Unknown residuals and recovered/ambiguous operations cannot satisfy the complete lifecycle or clear owner locks.

Downloaded wrappers containing `lifecycle` require outer `mode: live-owner` before unwrapping. Replay/live-readonly are rejected as `HISTORICAL_OR_REPLAY`; missing/null/unsupported wrapper modes are `INVALID`, even with a valid checksum/complete nested owner proof. Missing/null live metadata or referenced-file ENOENT is `MISSING`; malformed references/JSON, integrity failures and other read errors are `INVALID`. Every loader rejection retains false eligibility, shared historical/file-only fields and explicit nonattestation/current-chain-NOT_RUN fields. A live-owner wrapper cannot promote nested replay; raw durable lifecycle semantics are unchanged. The historical [before-fix reproduction](../evidence/tests/mvp-wrapper-before-2026-10-27.txt)/[post-fix smoke](../evidence/tests/mvp-wrapper-smoke-2026-10-27.txt), [current regressions](../tests/unit/live-evidence-files.test.ts) and [final CLI](../evidence/tests/mvp-classification-cli-2026-10-27.txt) retain that boundary.

```sh
npm run submission:check
npm run verify:evidence -- evidence/manifest.json --submission evidence/submission.json
```

Run independently. Final original-source strict [submission](../evidence/tests/mvp-classification-submission-2026-10-27.txt)/[evidence](../evidence/tests/mvp-classification-evidence-2026-10-27.txt) each exited **2 / BLOCKED**, metadata unchanged, false live claims/reference null and Build null/submitted false. [16 actual CLI cases](../evidence/tests/mvp-classification-cli-2026-10-27.txt) are file-only synthetic/replay engineering checks, not G1; prior six/14-case smoke remains historical. `verify:evidence` reports captured-file validity separately from submission claims; only `submission:check` decides overall readiness. This distribution's `test:judge` remains explicitly offline-only; its final evidence stage uses `--allow-incomplete`, while standalone readiness stays strict. Original checkpoint fingerprints retain historical scope, distinct from exported raw hashes. Root external delivery.json owns final source/sanitized identities and independent refreshed runtime outcomes.

## Historical Phase2 verification and metadata agreement

The following commands and outcomes belong to Phase2, not this implementation. Phase2 ran no doctor, live testnet workflow, current competition-page fetch, wallet or publication.

```sh
npm exec --yes --package=node@24.22.1 -- node --version
npm exec --yes --package=node@24.22.1 -- npm run test:judge
npm exec --yes --package=node@24.22.1 -- npm run typecheck
npm exec --yes --package=node@24.22.1 -- npm test
npm exec --yes --package=node@24.22.1 -- npm run build
npm exec --yes --package=node@24.22.1 -- npm run submission:check
npm exec --yes --package=node@24.22.1 -- npm run verify:evidence
```

`test:judge` is the explicit offline aggregate: **typecheck → existing test suite → production build → evidence-schema verification**, retaining all four stages and `&&` failure propagation. Its final stage alone uses the existing offline mode, `npm run verify:evidence -- evidence/manifest.json --allow-incomplete`. The positional manifest path is required. Valid incomplete live evidence is allowed only for this documented offline aggregate; missing/malformed evidence or schema/project errors still fail. An offline pass is not live acceptance, judge access, publication or submission.

The separately listed typecheck/test/build commands show the individual stages. Run the last two standalone readiness commands independently: both remain strict and are expected to exit **2** while prerequisites remain missing. Do not bypass those standalone live/submission readiness checks with `--allow-incomplete`.

- Observed Phase2 `submission:check`: exit **2**, `status: "BLOCKED"`, `submitted: false`, `buildUrl: null`; missing `whitelistVerified`, `reviewerRepositoryAccess`, `realPerpsOrder`, `nativeProtectionReadback`, `xPost1`, `xPost2`.
- Observed Phase2 `verify:evidence`: exit **2**, `schema: "valid"`, `liveVerified: false`, `liveChecks: "NOT_RUN"`. This script checks schema, not live chain validity or repository hashes.
- Historical Phase2 commands, raw output, exit codes and observed host timestamp are preserved in the [verification log](../evidence/tests/phase2-2026-10-26.txt). The October-26 filename is the phase label; host-clock timestamps are not rewritten. These results do not establish a fresh run of the cleaned tree or its offline aggregate. No new browser or live acceptance claim.
- Historical Phase2 local document/metadata smoke passed: two report files and template/status fields, original submission values preserved, README unpublished slots, **102 local links and 7 heading anchors** resolved, checker/readiness agreement, and no new transaction/block hashes, X URLs or G1-pass claims in that pack. No permanent wording tests or throwaway files added; the in-memory harness correction is disclosed in the log.

Remaining prerequisites are explicit, not authorized actions under this ticket: actual owner/verified-market input and separately authorized G1 execution; whitelist and reviewer-access evidence; separately authorized X publication, Feedback filing and submission. Only a real authorized Build receipt can change submitted status. No absent read establishes residual cleanup. Current-result updates must name actual source identity, artifacts and exercised scope rather than reusing this historical record.
