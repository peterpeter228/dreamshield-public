# Tasks

| Gate | Work | State | Evidence / exit condition |
|---|---|---|---|
| G0 | Rules, capabilities and pinned source | PARTIAL | research/competition-verification.md and docs/THIRD_PARTY_NOTICES.md; current whitelist unknown; internal development guide omitted from distribution |
| G0 | SDK and real read-only probes | BLOCKED_LIVE | evidence/g0 contains historical 2026-10-24 DNS/refusal observations; Phase2 did not recheck transport; current reachability unknown; genesis guard unchanged |
| G1 | Same owner/pool real order, SL, cancel, rebuild | BLOCKED_EXTERNAL | docs/LIVE_HANDOFF.md; matching real receipts and readback required |
| G2 | Domain, durable journal, API boundary | OFFLINE_CORE_VERIFIED | Phase1: 156 tests, typecheck/build; evidence/phase1-2026-10-26/NOTES.md; live observer/reorg not accepted |
| G3 | Replay UI and real browser interactions | DESKTOP_REPLAY_VERIFIED | Phase1: all 12 scenarios, friendly reasons, unsigned preview and actual export at CSS1408×871; evidence/phase1-2026-10-26/NOTES.md. Earlier responsive checks historical; physical mobile/touch and wallet/live pending |
| G4 | External static review, independent reproduction and regression | OFFLINE_REMEDIATED | review/ARGON_VERIFICATION_2026-10-25.md; 119 tests; not a formal audit or post-fix Argon pass |
| G5 | README, demo materials, submission drafts | DRAFTS_READY | docs/DIFFERENTIATION.md and updated 90-second docs/DEMO_SCRIPT.md; docs/SUBMISSION_DRAFT.md remains a draft; not posted/submitted |
| G5 | Two local evidence-backed Feedback reports and index | DRAFTS_READY | feedback/README.md; historical observations, current reproduction/dedup NOT_RUN, not externally submitted or accepted |
| G5 | Submission-readiness checklist and README X placeholders | DOC_READY | docs/SUBMISSION_READINESS.md; evidence/submission.json retains false/null external gates; placeholders are not posts |
| Release | Phase2 Node 24.22.1 offline and metadata verification | OFFLINE_VERIFIED | evidence/tests/phase2-2026-10-26.txt: typecheck/test/build exit 0, 156 tests/10 files, existing protocol-chunk warning; submission/evidence checkers each exit 2, BLOCKED and liveChecks NOT_RUN; local metadata/template smoke and 102 links/7 anchors passed; no live acceptance |
| Release | Historical private commit and SHA readback | VERIFIED_HISTORICAL | de3cfe50b5517278e72a4b9a06806af0f22cc342; 92 blob hashes matched then; non-force expected-SHA update; not Phase2 persistence |
| Release | Distribution cleanup and explicit offline judge gate | DOC_READY | Internal input packages omitted; current artifact inventory distinct from historical fingerprints; test:judge uses existing offline schema mode, standalone live/submission checks remain strict; current execution proof recorded outside this distribution |
