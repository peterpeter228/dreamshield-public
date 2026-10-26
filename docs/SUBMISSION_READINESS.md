# Submission readiness

Snapshot: 2026-10-26, Phase2 local documentation pack. **Overall: BLOCKED for official submission.** Replay, offline verification, and local Feedback reports are not live execution, publication, whitelist approval, or organizer acceptance.

Sources of truth: [STATE](STATE.md), [TASKS](TASKS.md), [submission metadata](../evidence/submission.json), [Feedback index](../feedback/README.md), and [Phase1 desktop replay evidence](../evidence/phase1-2026-10-26/NOTES.md).

## Status and source scope

- **PASS**: the specifically scoped artifact or result is evidenced; no broader acceptance implied.
- **FAIL**: a required result/artifact is known to be absent or insufficient.
- **BLOCKED**: verification or completion needs unavailable evidence, access, authorization, or organizer action.

Official requirements below come from the repository's [2026-10-24 rule verification](../research/competition-verification.md), particularly its rules matrix and sources A/B: [Details](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) and [Tracks](https://dorahacks.io/hackathon/dreamdex-perps-bounty/tracks). These pages were **not fetched again in Phase2**; current organizer requirements and interpretations need rechecking before authorized submission. Two local reports are the Phase2 minimum, not an official Feedback quota. Native protection readback and the Node-pinned offline chain are project acceptance gates, not additional invented organizer rules.

## Official MVP requirements and local materials

| Requirement / source | Status | Evidence / scope | Remaining action |
|---|---|---|---|
| README purpose, intended audience, run instructions — rules matrix README row | PASS | [README](../README.md) identifies isolated testnet perps owners, purpose and local commands | Preserve truthful scope when updating materials |
| GitHub repository identified — rules matrix Repo row | PASS | [Submission draft](SUBMISSION_DRAFT.md#demo-and-repository) identifies the delivery repository | Identity only; this is not proof of judge access |
| Delivery repository readable by judges — repo delivery | BLOCKED | `reviewerRepositoryAccess: false`; access is not verified | Owner arranges specifically authorized access and verifies it |
| Matching DoraHacks email whitelisted — rules matrix Eligibility row | BLOCKED | `whitelistVerified: false` means unverified, not rejected | Owner obtains organizer confirmation; draft request is not confirmation |
| Real perps orders on Somnia Tokyo — rules matrix Real testnet activity / Evaluation rows | FAIL | `realPerpsOrder: false`; no actual order/hash evidence supplied | Resolve G0/G1 prerequisites, then authorized owner execution with inspectable evidence; no simulation substitute |
| Demo/building evidence — rules matrix Evaluation row | PASS | `demoReady: true` is limited by `demoScope` to local desktop replay captures; [demo assets](DEMO_ASSETS.md), [90-second script](DEMO_SCRIPT.md) | No deployed demo, video, wallet or live acceptance claimed |
| README X posts section — rules matrix README row, section presence only | PASS | [README X posts](../README.md#x-posts) has explicit unpublished placeholders | Section completion does not meet actual publication requirement |
| 2–3 real X links tagging `@DreamDEXSomnia` — rules matrix README row | FAIL | Zero posts; `xPost1: null`, `xPost2: null`; [drafts are not posts](SUBMISSION_DRAFT.md#x-drafts-not-posted) | Separately authorized publication, recheck official tag, then record real URLs |
| User value, differentiation and accurate scope — rules matrix Evaluation row | PASS | [Differentiation](DIFFERENTIATION.md), [demo script](DEMO_SCRIPT.md), README; documentation exists, not an organizer score | Do not claim competitor features absent or predict selection |

Reactivity/Agents are optional pluses, not implemented/claimed here. Public hosting, a third post, a fixed-length video, fills, minimum trade counts, or mainnet actions are not invented prerequisites. Future prize/mainnet conditions remain separate authorization and risk decisions.

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
| G0 installed/build/read-only integration | BLOCKED | [Historical G0 evidence](../evidence/g0/SDK_DIAGNOSIS.md); October-24 DNS/refusal observations, no Phase2 chain probe; no owner | Revalidate transport and owner scope; current reachability unknown |
| G1 real order, SL, cancel, rebuild and native readback | FAIL | `nativeProtectionReadback: false`; STATE stays **BLOCKED_EXTERNAL / NOT_RUN** | Isolated owner's public address, selected market, explicit limits, wallet confirmation and real lifecycle readback; receipt is not fill/readback proof |
| G2 offline core and pinned Node verification | PASS | Fresh Node **v24.22.1** `typecheck && test && build` exited 0: **156 tests across 10 files**; [Phase2 output](../evidence/tests/phase2-2026-10-26.txt), large lazy protocol-chunk warning retained | Offline only; full live observer/reorg behavior remains unverified |
| G3 desktop replay | PASS | Phase1 all 12 scenarios at CSS1408×871, export and screenshots; [notes](../evidence/phase1-2026-10-26/NOTES.md) | No new Phase2 browser pass; physical mobile/touch, exact375px at100%, wallet/live flows remain unverified |
| G4 independent remediation | PASS | [Argon verification](../review/ARGON_VERIFICATION_2026-10-25.md), historical 119-test regression; **OFFLINE_REMEDIATED** only | No formal audit, post-fix Argon approval or live acceptance |
| G5 local materials | PASS | README, readiness, [submission draft](SUBMISSION_DRAFT.md), Feedback index; **DRAFTS_READY** only | External blockers above remain; no all-green submission claim |

## External outcomes — not performed or verified

| Outcome | Status | Evidence / meaning | Remaining action |
|---|---|---|---|
| Actual DoraHacks Build submission | FAIL | `buildUrl: null`; checker derives `submitted: false` | Authorized owner submits only after resolving prerequisites, then records real receipt URL; URL is an outcome, not a preexisting readiness prerequisite |
| Feedback externally submitted | FAIL | `feedback.submitted: false` | No report sent; authorization, current reproduction and duplicate review first |
| Feedback organizer acceptance / payment | BLOCKED | `feedback.accepted: false` means **no acceptance recorded**, not rejection; no payment evidence | Organizer decision only; local reports do not establish eligibility or reward |

## Verification and metadata agreement

Use Node **24.22.1**. Phase2 did not run the doctor, live testnet workflows, current competition-page fetches, wallets, or publication. Historical source/build fingerprints describe their original checkpoints; the cleaned retained-artifact inventory is separate and does not recapture historical evidence.

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

Owner-only remaining actions: establish authorized test scope and owner prerequisites; verify whitelist and reviewer access; execute and reconcile the real protection lifecycle; authorize truthful X publication and external Feedback filing; resolve organizer deadline/rule ambiguities; then authorize actual submission. None was performed by this documentation phase.
