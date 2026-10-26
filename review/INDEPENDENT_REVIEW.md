# DreamShield independent code review

Reviewed 2026-10-24 UTC. Baseline HEAD ff6e7c43090c97a7fc407d0abd6f6c72972e7c96 plus the working tree (most implementation files were untracked). This is a targeted independent code review, not a formal security audit or live-chain acceptance. Initial review was read-only. Following a subsequent explicit implementation request, the reviewer implemented the two remediations documented below. Those fixes are reviewer-authored, not independently audited.

## Scope and evidence

Read historical execution guidance (omitted from this distribution), docs/STATE.md, docs/TASKS.md, domain model and assessment/state transitions, protocol reader/sender/reconciler, SQLite journal, Express API/config, owner hook and protection/repair/timeline UI, associated tests, and pinned SDK declarations relevant to native stop cancellation. No keys, Argon calls, wallet requests, transactions, or external network requests were used. The only HTTP requests were to a temporary loopback test server. Temporary SQLite data was removed after testing.

Baseline verification: `npm test` passed 4 files / 69 tests. The existing suite covers important fail-closed behavior, but the two gaps below are not covered. Targeted reproduction was executed using `node --import tsx --input-type=module` with a synthetic protected fixture and a temporary local owner instance. No claim about live SDK or wallet behavior follows from those offline tests.

## P1-01: recovered unknown operation cannot accept a recovered transaction hash

Locations: packages/domain/index.ts transitions (around lines 121–130); apps/server/app.ts operation state/reconcile routes; apps/web/src/owner.ts reconcile; OwnerPanel/Timeline lack a recovered-hash input.

Failure path:

1. Reserve a draft, persist AwaitingSignature, then restart. Journal recovery correctly produces Unknown with txHash null.
2. A wallet may have broadcast successfully before the application received/persisted its hash. The owner can obtain the hash from wallet activity.
3. The state API rejects Unknown→Unknown (the owner's hook attempts exactly this) and Unknown→Submitted. The reconcile endpoint does not consume a supplied hash and invokes reconciliation with null.
4. Reconciliation returns TRANSACTION_HASH_MISSING and the operation stays Unknown indefinitely, locking all new operations for that owner. This is safely fail-closed, but prevents the required recovery workflow and may block repair of an unprotected position.

Observed loopback responses:

- POST state {state: "Unknown", txHash: valid 32-byte hex}: HTTP 409 INVALID_TRANSITION:Unknown->Unknown.
- POST state {state: "Submitted", txHash: same hash}: HTTP 409 INVALID_TRANSITION:Unknown->Submitted.
- POST reconcile {txHash: same hash}: HTTP 200, state Unknown, txHash null, error TRANSACTION_HASH_MISSING.

Recommended correction: an explicit recovery-only hash-binding operation (or a validated optional hash on reconciliation) that atomically sets a previously null hash while preserving the unresolved state/owner lock. Validate format; never replace an already stored different hash. Reconciliation must still independently verify chain, transaction sender/target, event identity, and native read-back. Add a clearly labelled UI input for the owner to supply a hash from wallet activity. Never release the lock or resend merely because a hash is supplied.

Required regression tests:

- Restart after AwaitingSignature, recover null-hash Unknown, bind recovered hash, reconcile using that exact persisted hash.
- Reject malformed hash and replacement of a non-null hash; repeated binding of the same hash is harmless/idempotent.
- An arbitrary supplied hash does not itself produce Applied or release the owner lock.
- A null-hash operation remains visibly unresolved with recovery guidance, not a misleading repeated reconcile button alone.

## P1-02: unresolved cancellation can coexist with a green protection headline

Locations: apps/server/app.ts /api/desk and /api/evidence; apps/web/src/App.tsx around line 17; packages/domain/index.ts assessProtection takes no operation context.

The API computes assessment from the snapshot alone, then separately returns journal operations. The UI recomputes assessment from that snapshot alone as well, ignoring both returned unresolved operations and the owner hook's current operation. A cancellation in AwaitingSignature, Submitted, Unknown, Reconcile, or NeedsReview can therefore leave "Configuration verified" green while its outcome is explicitly unresolved in a lower timeline panel. Immediately after initiating a cancellation, the displayed snapshot may also predate the request, even if its age is still under 15 seconds.

Concrete offline evidence: a protected fixture plus a recovered Unknown cancel-stop journal operation still evaluates VERIFIED through the same assessment call the API/UI use. The actual temporary journal/HTTP reproduction for P1-01 contained this cancellation; `assessProtection(protectedSnapshot).verdict` returned VERIFIED because operation context is never consulted. This is code-path evidence, not a browser screenshot.

Recommended correction: introduce a desk-level assessment that combines freshness/completeness assessment with matching owner/pool unresolved operations. Suppress green and communicate PENDING/UNKNOWN/NEEDS_REVIEW until the original operation is reconciled. Do not falsify the historical snapshot: retain its observed stop details as historical/configuration evidence. Apply consistent composition to API, UI, and evidence exports. Include local ownerFlow.operation immediately, since the persisted journal may be newer than the last desk refresh.

Required regression tests:

- A protected snapshot plus each unresolved cancel state never yields a green overall verdict.
- Unknown creation and NeedsReview operations are also visibly unresolved under the chosen consistent policy.
- Unrelated owner/pool operations do not suppress this desk's assessment.
- Terminal operation plus fresh protected snapshot can return VERIFIED; stale snapshot remains UNKNOWN regardless of operation status.
- UI must suppress green as soon as AwaitingSignature is persisted, before an eventual wallet response or refresh.

## Positive observations and remaining limits

- Testnet ID 50383 is explicitly gated; public replay/read-only mutation routes are blocked.
- Atomic math uses bigint and exact decimal conversion. Whole-at-trigger quantity zero is preserved.
- Reader checks indexer coverage, bounded pagination, duplicate identities, registry mutations during discovery, pinned critical reads, and canonical block hash.
- Unknown/NeedsReview operations retain the owner lock; receipt success alone cannot directly mark Applied through public state updates.
- UI recomputes freshness on a timer; failed reads are fed into assessment rather than interpreted as zero exposure.
- Single-stop cancellation semantics were consistent with the pinned SDK documentation: cancelling one leg leaves its sibling pending but unlinked, rather than cancelling both.

Live owner lifecycle, signer confirmation, real indexer/reorg race behavior, and native transaction outcomes remain unverified. Existing G1 external blockers are not resolved by the passing offline tests. No P0 was established in this review. P1 findings above should be fixed and independently rechecked before calling local owner recovery/no-green behavior complete.


## Remediation executed after review

Following the explicit implementation request, the reviewer addressed both concrete findings. Changes were limited to:

- packages/storage/index.ts: transactional bindRecoveredHash, preserving original operation state and owner lock; exact owner/pool, unresolved state, hash format, and immutable existing-hash checks.
- apps/server/app.ts: local-owner/CSRF-protected recover-hash endpoint using configured owner/pool and explicit operation ID; unified desk assessment on desk/evidence/readiness paths.
- packages/domain/desk.ts (new): shared assessDesk composition suppressing green when matching owner/pool operations remain unresolved. Historical snapshot fields are retained.
- apps/web/src/App.tsx: assessDesk includes the current local operation immediately, rather than waiting for a desk refresh.
- apps/web/src/owner.ts, OwnerPanel.tsx, Timeline.tsx: recovered-hash input bound to the original operation, with visible operation ID/owner/pool/action, and recovery followed by read-only reconciliation. No new transaction is sent by recovery. Null-hash timeline actions open recovery rather than repeatedly reconciling a missing hash.
- tests/integration/journal.test.ts, desk-assessment.test.ts, owner-recovery-api.test.ts: recovery binding/immutability/scope/lock tests; unresolved state/no-green tests; loopback local-owner/CSRF/API tests with explicitly offline mocked protocol read/reconcile.

Post-remediation verification (2026-10-24 UTC): 6 test files / 85 tests passed; TypeScript typecheck passed; production Vite/server build passed. Build emits a large dynamically loaded protocol chunk warning (approximately 1.44 MB minified / 356 KB gzip), not a failed build. No dependency changes were made by this reviewer.

Recovery is not authenticated by a new cryptographic wallet signature at the server: it follows the existing local owner + CSRF trust boundary and UI exact-wallet gate. A recovered hash is explicitly unverified data until the existing protocol reconciler verifies the transaction and native read-back. Hash recovery cannot mark Applied or Failed by itself, cannot replace an existing different hash, and cannot release the lock. Unknown operations with no discoverable hash intentionally remain blocked; the UI now explains that limitation.

The previously reproduced P1-01 and P1-02 code paths are addressed by these regression tests. No real-browser interaction or live-chain transaction was performed in this remediation pass. The reviewer authored the fixes, so a separate fresh reviewer remains appropriate before describing them as independently re-audited. G1 still requires separately authorized live evidence.
