# Submission readiness

Snapshot: 2026-10-27, locked MVP implementation evidence. **Overall: BLOCKED for official submission / G1 NOT_RUN.** Final doctor passed transport-and-verified-market, not owner acceptance. Current pinned-runtime offline gates, CLI ingestion, built replay, synthetic no-wallet capture UI and separate-process persistence smoke have [actual scoped evidence](../evidence/mvp-2026-10-27/NOTES.md); none establishes real owner execution, publication, whitelist approval or organizer acceptance. Historical outcomes remain historical.

Sources of truth: [STATE](STATE.md), [TASKS](TASKS.md), [submission metadata](../evidence/submission.json), [Feedback index](../feedback/README.md), and [Phase1 desktop replay evidence](../evidence/phase1-2026-10-26/NOTES.md).

Private scope authority: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/MVP_SCOPE.md` (amended `AUTH-20261027-DREAM-LOT-SIZE`); work packages: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/DEV_HANDOFF.md`; amendment: `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/AMENDMENT-LOT-SIZE-20261027.md`; `HO-dreamshield-mvp-1` / `AUTH-20261027-DREAM-MVP-SCOPE`, base `2d316ae517986a7a70372dc9ff582be1c63e9abc`; trading owner `AUTH-20261027-DREAM-G1-AUTO` / `/workspace/web3-bounty/v3-reconcile/evidence/dreamshield-mvp-scope-20261027/G1-OWNER-20261027.md`. The structured handoff records ACCEPTED. Locked product limits are one isolated EOA public address (**DEMO_OWNER** `0x04b0A7AFD4Ab71C5d49c4bd578C2D9B8eA7DF36E`), one doctor-verified **BTC** market, 50383 only, position size = **exactly one market-minimum order** (observed ≈13 grid lots) and **1–2 concurrent native stops**, with registry-read native deposit, STT faucet gas and paper USDso. Do not auto-increase above market-min. The owner may tighten; the payout wallet is not the trading owner. **G1 live signs remain NOT_RUN** (funding in flight).

**Three separate gates:** official rules establish competition requirements; DreamShield's stronger G1 acceptance requires the complete owner-bound opening/fill/position → missing SL → native stop/readback → selected cancel/gap → replacement/readback → residual lifecycle; execution authority controls what may actually run. A doctor PASS, synthetic validator fixture or offline build satisfies neither real G1 nor permission to sign. This ticket forbids a wallet session, signing/trading/funding, mainnet, Submit Build, X publication, organizer contact, Feedback filing and visibility changes.

Planning cutoff: **2026-11-02 06:59 Asia/Shanghai** (sidebar 18:59 UTC−4 = 22:59 UTC). The body says 07:59 Asia/Shanghai / 23:59 UTC; that conflict is preserved, not usable slack. Whitelist ticket **DX-0327 WAITING_EXTERNAL** remains an external blocker; no contact is authorized.

## Status and source scope

- **PASS**: the specifically scoped artifact or result is evidenced; no broader acceptance implied.
- **FAIL**: a required result/artifact is known to be absent or insufficient.
- **BLOCKED**: verification or completion needs unavailable evidence, access, authorization, or organizer action.

Official requirements below come from the repository's [2026-10-24 rule verification](../research/competition-verification.md), particularly its rules matrix and sources A/B: [Details](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) and [Tracks](https://dorahacks.io/hackathon/dreamdex-perps-bounty/tracks). The supplied locked scope and adjacent `FACTS_FOR_DRAFT.md` attribute updated facts to 2026-10-27 official-page scrapes; this documentation task did not refetch them or open a submission flow. Two local reports are a Phase2 minimum, not an official Feedback quota. Native protection readback, complete opening/fill/residual proof and Node-pinned offline checks are project gates, not additional organizer rules. Exact authenticated Build labels, character limits and media constraints are unestablished; the [draft](SUBMISSION_DRAFT.md) does not invent them.

## Official MVP requirements and local materials

| Requirement / source | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| README purpose, intended audience, run instructions — rules matrix README row | PASS | [README](../README.md) identifies isolated testnet perps owners, purpose and local commands | Preserve truthful scope when updating materials |
| GitHub repository identified — rules matrix Repo row | PASS (identity/visibility only) | Product `https://github.com/peterpeter228/dreamshield` PRIVATE; proof `https://github.com/peterpeter228/dreamshield-public` observed PUBLIC/ADMIN by integration-owner read-only `gh` check on 2026-10-27, remote main `8e85e468a231350ebacbb2dbce0f5c746d47bd66` | ADMIN does not establish reviewer access or an updated implementation/sync |
| Actual reviewer reproduction/source access | BLOCKED (prior local fallback VERIFIED) | `reviewerRepositoryAccess: false`; no reviewer-access confirmation. [WP3 identities/proofs](STATE.md#wp3-verified-local-distribution--not-remote-acceptance) retain historical 169-file archive/patch/candidate, not final wrapper-fixed delivery. Canonical `/workspace/dreamshield-distribution-20261027/delivery.json` points to refreshed final source/sanitized identities/artifacts under `wrapper-refresh/` after source/docs commit/runtime verification; original root artifacts remain historical | Preferred sync not attempted: inherited ordinary-history absolute paths fail sanitization; ordinary patch/history LOCAL ONLY / NOT FOR PUBLICATION. Separate clean candidate is not fast-forward sync. No history rewrite, force-push, replacement or visibility change authorized; local delivery does not establish reviewer access |
| Matching DoraHacks email whitelisted — rules matrix Eligibility row | BLOCKED / WAITING_EXTERNAL | Registration is recorded as REGISTERED; **DX-0327 WAITING_EXTERNAL**, `whitelistVerified: false` means unverified, not rejected | Actual whitelist outcome is external; no organizer contact under this ticket |
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
| Exclude public security disclosures — rules matrix Security row | PASS | This pack contains diagnostic and documentation reports only; HUNT hypotheses/private remediation excluded | Security findings require private handling and separate authorization, not publication in this pack |
| Current deadline resolution and SDK diagnostic attribution | BLOCKED | Deadline body 23:59 UTC vs sidebar 18:59 UTC−4 = 22:59 UTC; historical SDK nested DNS cause, defect attribution inconclusive | Plan against the earlier 06:59 Asia/Shanghai cutoff; no DST cause, early closure, continuing outage or deployment mismatch proven; no organizer contact authorized |

## Project acceptance gates

| Gate | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| G0 installed/build/read-only integration | PASS read-only / BLOCKED owner | Final Node v24.22.1 [doctor](../evidence/g0/doctor-2026-10-27T05-32-53.000Z.json) 2026-10-27T05:32:53.000Z: readonly PASS / transport-and-verified-market, exit 0; BTC/USDso verified, owner NOT_CONFIGURED, `g0Complete: false`, no signing/send; [command/exit log](../evidence/tests/mvp-doctor-final-2026-10-27.txt) | Diagnosed market is not accepted owner scope or owner-machine reachability. Actual owner/session/accepted pool absent. Size locked to BTC market-min (~13 grid lots) per `AUTH-20261027-DREAM-LOT-SIZE`; stops max 1–2; no automatic switch or amount above market-min |
| G1 complete real lifecycle | FAIL / BLOCKED_EXTERNAL | `realPerpsOrder: false`, `nativeProtectionReadback: false`, `liveEvidence: null`; STATE stays **NOT_RUN** | Separately authorized isolated owner execution, real same-scope artifacts and path-backed validation; receipt is not fill/readback proof |
| G2 offline core and pinned Node verification | PASS / OFFLINE_READY | Latest Node **v24.22.1** typecheck/test/build exit 0; **399/399 tests across 16 files**, including 8 wrapper-loader regressions; existing large lazy protocol-chunk warning. Earlier 391/15 and initial 390-pass/1-fail incidental assertion outcome remain historical, not latest tested code | [Actual notes/logs](../evidence/mvp-2026-10-27/NOTES.md), [latest measured input map](../evidence/mvp-2026-10-27/wrapper-verification.json), [historical map](../evidence/mvp-2026-10-27/verification.json); no full live observer/reorg or G1 acceptance |
| CLI wrapper correction / historical persistence and owner smoke | PASS (engineering only) | Loader ignored outer mode and accepted otherwise valid nested synthetic owner proof under replay/live-readonly wrappers. One-line fix rejects non-live-owner wrappers before unwrapping; raw lifecycle validation unchanged. [Six actual CLI invocations](../evidence/tests/mvp-wrapper-cli-2026-10-27.txt): each checker rejects replay/live-readonly (exit 2), accepts matching synthetic live-owner (exit 0); defaults remain false/null. Earlier 14-invocation CLI, no-wallet capture UI and restart/NeedsReview evidence are historical against unchanged UI/server source | [Evidence note](../evidence/mvp-2026-10-27/NOTES.md); synthetic proof cannot establish owner session, executed transactions, current coverage or origin authenticity; no new persistence/UI run claimed |
| G3 built desktop replay | PASS (historical replay only) | Earlier actual Chromium CSS1376×771 DPR1: all 12 scenarios, unsigned preview/signing disabled, selected cancellation disabled, exact-body download, 15-second aging/read-failure revocation; [browser record](../evidence/mvp-2026-10-27/browser.json). Browser/UI/server source bytes unchanged by wrapper delta, not a new browser run against final tested code | No wallet Connect/Review; actual owner reserve/export/discard/live surface, physical mobile/touch and exact375px at100% remain NOT_RUN/unverified; historical responsive results not rerun |
| G4 independent remediation | PASS (historical/offline only) | [Argon verification](../review/ARGON_VERIFICATION_2026-10-25.md), historical 119-test regression; **OFFLINE_REMEDIATED** only | No formal audit, post-fix Argon approval or live acceptance |
| G5 local materials | PASS (DRAFTS_READY only) | README, readiness, [field-by-field submission draft](SUBMISSION_DRAFT.md), Feedback index | Final live-backed fields and external gates remain blocked; no all-green submission claim |

**Locked executable sizing (`AUTH-20261027-DREAM-LOT-SIZE`):** the final doctor verified BTC/USDso lot **1000** and minimum quantity **13000** atomic base units, so one minimum order is **13 SDK grid lots**. That market-minimum **is** the locked position size; keep BTC; max concurrent native stops remain **1–2**. The old 1–2-lot size-cap and BLOCKED/needs-clarification treatment of min-vs-1–2 are abolished. Do not round below minimum, auto-increase above market-min, or switch markets. Actual G1 execution remains BLOCKED_EXTERNAL until an owner-supplied isolated EOA and separate sign auth exist — sizing is no longer the blocker. Exact market/deposit/genesis observation is in [STATE](STATE.md#current-read-only-verified-market--not-owner-acceptance).

## External outcomes — not performed or verified

| Outcome | Status | Evidence / meaning | Remaining action |
|---|---|---|---|
| Actual DoraHacks Build submission | FAIL | `buildUrl: null`; checker derives `submitted: false` | Authorized owner submits only after resolving prerequisites, then records real receipt URL; URL is an outcome, not a preexisting readiness prerequisite |
| Feedback externally submitted | FAIL | `feedback.submitted: false` | No report sent; authorization, current reproduction and duplicate review first |
| Feedback organizer acceptance / payment | BLOCKED | `feedback.accepted: false` means **no acceptance recorded**, not rejection; no payment evidence | Organizer decision only; local reports do not establish eligibility or reward |

## Path-backed checker contract

Use Node **24.22.1**. `submission:check [submission-metadata-path]` defaults to `evidence/submission.json`. `verify:evidence [manifest-path] --submission <submission-metadata-path>` preserves historical manifest input and explicitly consumes the same `liveEvidence` references. Those references contain `doctor` and `lifecycle` objects, each with a `path` and raw-file `sha256`; paths are relative to the **metadata file**, not the working directory. The default reference is null, never a fabricated path. Full syntax and checksum distinctions: [OPERATIONS](OPERATIONS.md#evidence-references-and-checkers).

Both checkers use shared semantic and reference/hash validation, distinguishing missing, invalid, historical/replay and captured-complete evidence. They validate identity/chronology/completeness, recomputed assessments and operation/receipt/native-readback links; explicit live claims plus valid proof and existing external gates are required for readiness. Eligibility does not rewrite flags. Their file-only results establish internal consistency, not file-origin authenticity, a new RPC probe, current-chain revalidation or current protection. Unknown residuals and recovered/ambiguous operations cannot satisfy the complete lifecycle or clear owner locks.

```sh
npm run submission:check
npm run verify:evidence -- evidence/manifest.json --submission evidence/submission.json
```

Run independently. Actual default [submission](../evidence/tests/mvp-submission-2026-10-27.txt) and [evidence](../evidence/tests/mvp-evidence-2026-10-27.txt) checks each exited **2 / BLOCKED** with absent live references and false eligibility; Build null/submitted false, metadata unchanged and current-chain revalidation **NOT_RUN**. The [14-invocation CLI smoke](../evidence/tests/mvp-cli-smoke-2026-10-27.txt) consumed synthetic relative references and rejected tampering/missing stages/recovered/replay/missing files; valid synthetic proof did not override false submission claims. `verify:evidence` can report captured-file validity independently of explicit submission claims; only `submission:check` decides overall readiness. Neither authenticates origin or makes synthetic captures real. Any retained `--allow-incomplete` is **offline-schema-only**; `test:judge` may exit 2 after green offline gates. Historical fingerprints remain attached to their original checkpoints.

## Historical Phase2 verification and metadata agreement

The following commands and outcomes belong to Phase2, not this implementation. Phase2 ran no doctor, live testnet workflow, current competition-page fetch, wallet or publication.

```sh
npm exec --yes --package=node@24.22.1 -- node --version
npm exec --yes --package=node@24.22.1 -- npm run typecheck
npm exec --yes --package=node@24.22.1 -- npm test
npm exec --yes --package=node@24.22.1 -- npm run build
npm exec --yes --package=node@24.22.1 -- npm run submission:check
npm exec --yes --package=node@24.22.1 -- npm run verify:evidence
```

Run the last two independently: both are expected to exit **2** while prerequisites remain missing. Do not bypass them with `--allow-incomplete`.

- Observed `submission:check`: exit **2**, `status: "BLOCKED"`, `submitted: false`, `buildUrl: null`; missing `whitelistVerified`, `reviewerRepositoryAccess`, `realPerpsOrder`, `nativeProtectionReadback`, `xPost1`, `xPost2`.
- Phase2 observed `verify:evidence`: exit **2**, `schema: "valid"`, `liveVerified: false`, `liveChecks: "NOT_RUN"`. At that historical checkpoint the script checked schema, not live chain validity or historical hash freshness; the current path-backed contract above must not be confused with that older behavior.
- Phase2 commands, raw output, exit codes and observed host timestamp are preserved in the [verification log](../evidence/tests/phase2-2026-10-26.txt). The October-26 filename is the phase label; host-clock timestamps are not rewritten. No new browser or live acceptance claim.
- Local document/metadata smoke passed: two report files and template/status fields, original submission values preserved, README unpublished slots, **102 local links and 7 heading anchors** resolved, checker/readiness agreement, and no new transaction/block hashes, X URLs or G1-pass claims in the new pack. No permanent wording tests or throwaway files added; the in-memory harness correction is disclosed in the log.

Remaining prerequisites are explicit, not authorized actions under this ticket: actual owner/verified-market input and separately authorized G1 execution; whitelist and reviewer-access evidence; separately authorized X publication, Feedback filing and submission. Only a real authorized Build receipt can change submitted status. No absent read establishes residual cleanup. Current-result updates must name actual source identity, artifacts and exercised scope rather than reusing this historical record.
