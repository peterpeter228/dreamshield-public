# DreamShield consolidated owner handoff

Historical local-delivery checkpoint: 2026-10-24 23:02 UTC, with the dated review additions below. Not live acceptance or a submitted entry; later verification scope is recorded in [STATE](STATE.md).

## Delivered and verifiable

- Historical tested implementation commit in the original repository: `de3cfe50b5517278e72a4b9a06806af0f22cc342`.
- Historical verified main metadata commit in the original repository: `a05e52cf970f92f00d9ea828f4a4559aa8c1ead9` (later documentation-only commits may follow). These original-repository identities do not identify or prove the delivery repository's root commit.
- 90 offline tests, typecheck and production build passed: `evidence/tests/offline-2026-10-24.txt`.
- Desktop replay interactions and actual downloads: `tests/browser/QA-2026-10-24.md`, `evidence/browser/`.
- English README and runnable local quickstart: `README.md`.
- 90-second recording script: `docs/DEMO_SCRIPT.md`.
- Actual demonstration screenshots and downloaded JSON: `docs/DEMO_ASSETS.md`. These are the delivered demonstration materials; no video or live-transaction footage is claimed.
- Three English X drafts and full narrative/form working draft: `docs/SUBMISSION_DRAFT.md`. Drafts are not posted. Required factual fields are explicitly marked rather than invented.
- Independent review and conservative remediation record: `review/INDEPENDENT_REVIEW.md`, `review/REMEDIATION_RECHECK.md`.
- Latest Argon static review: `evidence/review/argon-2026-10-25/receipt.json`; independent corrections and 119 offline tests: `review/ARGON_VERIFICATION_2026-10-25.md`. Previous timeout preserved historically. No post-fix Argon or formal audit claim.

## One next step: establish the isolated testnet owner scope

Provide the public address of an isolated testnet wallet you control, choose one verified market, and state the maximum test position/notional, gas and stop-deposit budget you authorize. Do not provide a seed phrase or private key. A past wallet address used in another project is not silently adopted.

Before signing, run `npm run doctor:readonly` from a permitted environment that can reach the official endpoints. The 2026-10-24 environments recorded DNS or connection-establishment failures; Phase2 did not recheck transport, so present reachability is unverified and earlier timestamped successful reads are not current approval. Do not disable genesis checks or change security settings to make a probe green. If the public endpoint remains unavailable, continue replay only.

Once transport and scope are ready, follow `docs/LIVE_HANDOFF.md` for the exact same-chain/account/market lifecycle. Native wallet confirmation remains with the owner. The project does not sign, trade or fund an account on the owner's behalf.

Required live evidence:

1. Actual Tokyo50383 perps order, receipt/fill and non-zero position.
2. Missing-SL observation; owner-confirmed native reduceOnly SL and independent native readback.
3. Explicitly controlled cancellation, observed gap, replacement SL and readback.
4. Residual position, orders, stops and balances recorded at the end. No claimed cleanup without checking.

An uncertain transaction must be reconciled before another send. A manually recovered hash remains NeedsReview because this version cannot prove original-request provenance or unlock it automatically. Read-only observation remains available. Do not delete the journal to bypass the lock.

## Separate final external actions, not yet done

- Whitelist: entrant must confirm the organizer's email whitelist and current eligibility. Identity/KYC/payment conditions are unknown, not assumed accepted.
- Review access: arrange and verify specifically approved judges/recipient access or another permitted review mechanism for the delivery repository. Access remains unverified and blocked for submission. No public source publication has been performed.
- Public communications: review the three X drafts, confirm the exact account and chosen text/assets, then authorize posting. No X URLs exist yet.
- Submission: replace `[REQUIRED]` fields with actual live evidence, entrant details, accessible demo/repository and actual post links. Recheck current official rules and deadline. Only the final owner-authorized submission and its real Build URL/receipt can establish submitted status.
- Public hosting, if chosen, must be replay/live-readonly without signing keys or private journal. A public URL is not assumed mandatory; the official evidence review did not establish that rule.
- No mainnet commitment or execution is authorized by this handoff. The organizer's later mainnet reward condition is not already fulfilled.

## Acceptance still not established

Real wallet/signing lifecycle; live indexer/reorg behavior; automatic recovered-hash provenance resolution; physical mobile-device/touch behavior and exact 375px at 100% zoom. Real tablet 768px, narrow desktop 485px and zoomed-desktop CSS323px checks are recorded separately in tests/browser/RESPONSIVE_QA.md, without claiming a real phone test. Current limitations and network evidence remain in `docs/KNOWN_LIMITATIONS.md` and `evidence/g0/`.

No submission, whitelist request, message, post, deployment or financial action occurs merely by reading or following the local replay quickstart.

### Latest recovery caveat (2026-10-25)
Legacy unanchored drafts and same-second transaction timing ambiguity remain locked for review. These guards do not authenticate a malicious local client. Current owner/protocol remediation has offline coverage only; the older browser evidence is not new wallet acceptance.
