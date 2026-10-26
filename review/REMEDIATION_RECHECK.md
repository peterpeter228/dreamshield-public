# Independent initial review and subsequent self-validated remediation

Review date: 2026-10-24 UTC. Scope: current local recovery, desk assessment, API, owner UI, and focused regression tests. No external service, signing, or credential use. Remote baseline verification was recorded separately; the review checkout did not contain that commit object, so this review does not attest a local Git diff against it.

## Updated result: conservative remediation passes implementer-run offline checks

The blockers below were found during the independent review and then fixed by the same reviewer following an explicit implementation request. The current result is a fail-closed recovery inspection path, not a complete original-transaction provenance/unlock workflow.

### Changes made after findings

- `Operation.hashProvenance` records newly recovered hashes. Recovering an `AwaitingSignature` operation atomically sets both stored state and body to `Unknown`.
- Domain transitions reject cancellation carrying a known hash. Recovered operations cannot become `Applied` or `Failed`, even with server proof flags.
- Protocol reconciliation checks canonical receipt scope but returns `NeedsReview` for recovered hashes whether receipt status is success or reverted. This explicitly avoids mistaking an old same-parameter transaction for the original operation.
- Existing genuinely wallet-returned journal hashes retain their prior receipt/read-back behavior. Rebinding that same already-known hash does not downgrade its existing provenance.
- The owner lock remains held throughout recovered uncertainty. There is no automated release until an original-operation provenance workflow is implemented. This limitation must be stated in the UI and handoff, not represented as successful end-to-end recovery.

### Final validation

`npm run typecheck` passed. `npm test` passed 90 tests across 7 files, including two mocked canonical recovered receipt statuses, journal lock/terminal-proof regressions, and existing API recovery checks. The HTTP test now additionally rejects cancellation and public failure terminalization after hash recovery. No live transaction or external RPC was performed.

Production changes: `packages/domain/index.ts`, `packages/domain/types.ts`, `packages/storage/index.ts`, `packages/protocol/index.ts`. Tests changed: `tests/integration/journal.test.ts`, `tests/integration/owner-recovery-api.test.ts`. New test: `tests/unit/recovered-provenance.test.ts`.

## Initial findings (resolved conservatively)


The two original fixes substantially improved behavior, but the initial review found these two unsafe unlock paths. The changes above now close them conservatively.

### High: a recovered hash can still be cancelled as unsigned

`packages/storage/index.ts:29-33` permits hash binding while state is `AwaitingSignature` and preserves that state. `packages/domain/index.ts:121-134` permits `AwaitingSignature -> Cancelled`, without rejecting an existing transaction hash. The public state endpoint accepts that transition. `Cancelled` is terminal for reservation locking.

Bounded offline reproduction against the actual Journal succeeded:

1. Reserve a cancellation draft.
2. Transition to `AwaitingSignature`.
3. Bind a valid-format recovered transaction hash.
4. Transition to `Cancelled` (succeeds).
5. Reserve another operation for the same owner (succeeds as `Draft`).

This releases an operation with a known, unverified transaction hash without reconciliation. The normal recovery button subsequently attempts `Unknown`, but the backend safety invariant must not depend on that client sequence; a concurrent original wallet flow or direct authorized local request can reach the unsafe transition. Reject cancellation whenever a hash exists, and/or atomically move recovered `AwaitingSignature` into `Unknown`. Add Journal and HTTP regression coverage proving the owner lock persists.

### High: unrelated reverted receipt can release the original uncertain operation

`packages/protocol/index.ts:143-148` checks chain, canonical block, receipt sender and recipient, then immediately returns `Failed` for any reverted receipt. It does not retrieve or compare transaction calldata/value to the reserved action, stop ID, pool or draft, or establish that the transaction belongs to this operation rather than an older same-owner registry call. A mistyped but valid hash of another reverted transaction from the same owner to the registry therefore becomes server-authorized `Failed`, releasing the original operation's lock. Hash recovery makes this especially relevant because its input is explicitly unverified.

Do not terminalize recovered uncertainty from receipt scope alone. Verify transaction identity against the original prepared action, including calldata/value and an operation-origin freshness anchor; if identity cannot be established, retain `Unknown`/`NeedsReview` and the lock. Add a deterministic offline protocol test with an unrelated same-owner/same-registry reverted receipt and a matching-original case. The success path also deserves old/reused transaction rejection, not only parameter matching. This finding is code-path verified, not a live-chain execution claim.

## Confirmed improvements

- Hash binding validates syntax, configured owner/pool and original operation scope; does not send; rejects replacement hashes and terminal-state recovery; same-hash recovery is idempotent.
- Restarted null-hash `Unknown` operations have a UI path to enter a hash and reconcile the same operation rather than resend.
- Desk assessment suppresses `VERIFIED` for matching unresolved create/cancel operations, clears numeric coverage and marks coverage unknown.
- Server desk and evidence use the same operation-aware assessment. Browser overlay includes the local pending operation, covering the interval before a desk reload.
- Snapshot read failures and staleness continue to fail closed. Terminal operations do not independently imply protection; a fresh snapshot assessment is still required.

## Initial pre-remediation validation

Command: `npm test -- tests/integration/journal.test.ts tests/integration/desk-assessment.test.ts tests/integration/owner-recovery-api.test.ts`

Result: 3 test files, 28 tests passed. Actual Journal unsafe-cancellation reproduction also ran successfully and returned `Cancelled`, then a new `Draft`. These tests use offline fixtures/local HTTP; they are not live workflow or wallet evidence. No browser interaction or end-to-end real-wallet reconciliation was performed in this recheck.


## Final remediation outcome and independence boundary

This reviewer independently found the two initial defects, then became the implementer following an explicit implementation request. The final checks below are therefore self-validation of these fixes, not an independent second review or independent approval.

Final commands and results:

- `npm run typecheck`: passed.
- `npm test`: 90 tests passed across 7 files after production fixes and new regression tests.
- After adding the final HTTP assertions, `npm test -- tests/integration/owner-recovery-api.test.ts`: 3 tests passed. The earlier 28-test run and successful unsafe-unlock reproduction above describe the pre-remediation state only.

Precise production guards:

- `packages/domain/types.ts`: adds optional `Operation.hashProvenance: 'recovered'`.
- `packages/storage/index.ts`: records recovered provenance for a newly bound hash; atomically updates state and body to `Unknown`; preserves an existing original hash and rejects replacement.
- `packages/domain/index.ts`: rejects `Cancelled` when a hash is present; rejects `Applied` and `Failed` for recovered provenance even when reconciliation proof flags are provided.
- `packages/protocol/index.ts`: after canonical receipt and owner/registry checks, returns `NeedsReview` for recovered hashes regardless of successful or reverted status, before either terminal outcome can be inferred.

Regression files: updated `tests/integration/journal.test.ts` and `tests/integration/owner-recovery-api.test.ts`; added `tests/unit/recovered-provenance.test.ts`. Only this report was edited during the follow-up documentation correction.

Closed invariants: recovery never resends; hash replacement remains rejected; delayed cancellation cannot unlock the recovered operation; recovered success/revert cannot release the lock; unresolved operations remain non-green through the operation-aware assessment.

Unresolved capability: the application does not establish that a manually recovered hash belongs to the original wallet request, rather than an older identical call. Recovery currently enables hash persistence and scoped receipt inspection, not automatic original-operation proof or lock release. No claim is made of live-chain execution, real-wallet reconciliation, or independent review of these newly implemented guards.
