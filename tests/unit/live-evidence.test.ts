import { describe, expect, it, vi } from 'vitest';
import { orderBookEventsAbi, perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { encodeFunctionData } from 'viem';
import { snapshotFingerprint } from '../../packages/domain/index.js';
import { validateLiveEvidence, type EvidenceOperation, type EvidenceRead } from '../../packages/domain/live-evidence.js';
import type { Snapshot } from '../../packages/domain/types.js';
import { stopEventsAbi } from '../../packages/protocol/sdk-abi.js';
import { createSyntheticLiveEvidence, syntheticEventLog, type SyntheticLiveEvidence as Fixture } from '../fixtures/live-evidence.js';

const unknownRead: EvidenceRead<never> = { status: 'unknown', value: null, block: null, consistency: 'unavailable', error: 'Official pinned read not supported' };
const a = (digit: string) => `0x${digit.repeat(40)}`;
function action(f: Fixture, name: 'initial' | 'cancel' | 'replacement'): EvidenceOperation {
  return f.lifecycle.operations.find(row => row.operation.id === `synthetic-${name}`)!;
}
function source(f: Fixture, name: 'initial' | 'cancel' | 'replacement', mutate: (snapshot: Snapshot) => void): void {
  const row = action(f, name); const s = JSON.parse(row.operation.draft.fingerprint.slice('snapshot-v1:'.length)) as Snapshot;
  mutate(s); row.operation.draft.fingerprint = snapshotFingerprint(s); row.proof!.intent.draftFingerprint = row.operation.draft.fingerprint;
}
function rejected(f: Fixture, path?: string): void {
  const result = validateLiveEvidence(f.doctor, f.lifecycle);
  expect(result.valid).toBe(false); expect(result.eligibility).toEqual({ realPerpsOrder: false, nativeProtectionReadback: false });
  expect(result.errors.length).toBeGreaterThan(0);
  if (path) expect(result.errors.join('\n')).toContain(path);
}

describe('captured G1 semantic evidence', () => {
  it('accepts the complete synthetic lifecycle as historical file evidence only', () => {
    const f = createSyntheticLiveEvidence(); const original = structuredClone(f);
    expect(validateLiveEvidence(f.doctor, f.lifecycle)).toEqual({ valid: true, errors: [], status: 'CAPTURED_COMPLETE', eligibility: { realPerpsOrder: true, nativeProtectionReadback: true }, fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true });
    expect(f).toEqual(original);
    expect(f.lifecycle.observations[3]!.snapshot.position!.signedSize).toBe('100');
  });
  it('uses capture-time freshness, not the later download clock', () => {
    const f = createSyntheticLiveEvidence(); const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2040-01-01T00:00:00.000Z'));
    try { expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true); expect(clock).not.toHaveBeenCalled(); }
    finally { clock.mockRestore(); }
  });
  it('accepts fresh API draft reads distinct from earlier durable observations', () => {
    const f = createSyntheticLiveEvidence();
    expect(action(f, 'initial').operation.draft.fingerprint).not.toBe(snapshotFingerprint(f.lifecycle.observations[1]!.snapshot));
    expect(action(f, 'cancel').operation.draft.fingerprint).not.toBe(snapshotFingerprint(action(f, 'initial').proof!.snapshot));
    expect(action(f, 'replacement').operation.draft.fingerprint).not.toBe(snapshotFingerprint(f.lifecycle.observations[2]!.snapshot));
    expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true);
  });
  it('accepts residual exposure, stops, resting orders and signed unlocked bank collateral without claiming cleanup', () => {
    const f = createSyntheticLiveEvidence(); const r = f.lifecycle.observations[3]!.residuals!;
    if (r.restingOrders.status === 'known') r.restingOrders.value.push({ id: '27', owner: f.lifecycle.identity.owner, pool: f.lifecycle.identity.pool, isBid: false, quantity: '10' });
    expect(r.bankUnlockedCollateral.value).toBe('-7'); expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true);
  });
  it('does not count an unsigned discarded draft as a chain action', () => {
    const f = createSyntheticLiveEvidence(); const discarded = structuredClone(action(f, 'initial'));
    discarded.operation = { ...discarded.operation, id: 'discarded-draft', idempotencyKey: 'discarded-key', state: 'Cancelled', txHash: null, error: 'Owner discarded unsigned draft' }; discarded.proof = null;
    f.lifecycle.operations = [...f.lifecycle.operations, discarded]; expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true);
  });
  it('allows an official OrderPlaced tuple before final fill accounting without assuming log order', () => {
    const f = createSyntheticLiveEvidence(); const opening = f.lifecycle.observations[0]!.opening!;
    opening.receipt.logs[2] = syntheticEventLog(orderBookEventsAbi, 'OrderPlaced', { orderId: 7n, placedOrder: { orderId: 7n, isBid: true, owner: f.lifecycle.identity.owner, userData: 0n, price: 200000n, fullQuantity: 100n, quantityRemaining: 100n, expireTimestampNs: 0n } }, f.lifecycle.identity.pool, 2);
    expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true);
  });
  it('accepts a discovery-selected doctor only with its extra required discovery check', () => {
    const f = createSyntheticLiveEvidence(); f.doctor.poolConfigured = false; f.doctor.selectedMarket.selectionSource = 'discovery'; f.doctor.requiredChecks.push({ name: 'marketDiscovery', status: 'passed' });
    expect(validateLiveEvidence(f.doctor, f.lifecycle).valid).toBe(true);
  });
  it('returns missing-reference errors rather than accepting a flag or receipt-only claim', () => {
    expect(validateLiveEvidence(null, null)).toMatchObject({ valid: false, status: 'MISSING', eligibility: { realPerpsOrder: false, nativeProtectionReadback: false } });
    expect(validateLiveEvidence(null, createSyntheticLiveEvidence().lifecycle).errors.join('\n')).toContain('missing referenced doctor');
  });
  it.each([null, undefined, true, 42, '{}', [], {}, { schemaVersion: 1 }, { observations: [null] }])('fails closed on malformed unknown input %#', value => {
    const f = createSyntheticLiveEvidence();
    expect(() => validateLiveEvidence(f.doctor, value)).not.toThrow(); expect(validateLiveEvidence(f.doctor, value).valid).toBe(false);
    expect(() => validateLiveEvidence(value, f.lifecycle)).not.toThrow(); expect(validateLiveEvidence(value, f.lifecycle).valid).toBe(false);
  });
  it('distinguishes replay and historical wrappers from live lifecycle evidence', () => {
    const f = createSyntheticLiveEvidence(); const replay = { ...f.lifecycle, provenance: { ...f.lifecycle.provenance, mode: 'replay' } };
    expect(validateLiveEvidence(f.doctor, replay)).toMatchObject({ valid: false, status: 'HISTORICAL_OR_REPLAY' });
    expect(validateLiveEvidence(f.doctor, { artifactType: 'dreamshield-evidence-manifest' })).toMatchObject({ valid: false, status: 'HISTORICAL_OR_REPLAY' });
  });
  it('never returns valid or eligible for a top-level replay marker on otherwise complete proof', () => {
    const f = createSyntheticLiveEvidence(); const result = validateLiveEvidence(f.doctor, { ...f.lifecycle, mode: 'replay' });
    expect(result).toMatchObject({ valid: false, status: 'HISTORICAL_OR_REPLAY', eligibility: { realPerpsOrder: false, nativeProtectionReadback: false } });
    expect(result.errors.join('\n')).toContain('replay');
  });
});

const identityFailures: [string, (f: Fixture) => void][] = [
  ['wrong schema', f => { f.lifecycle.schemaVersion = 2 as 1; }],
  ['wrong artifact kind', f => { f.lifecycle.artifactType = 'manifest' as 'dreamshield-g1-lifecycle'; }],
  ['wrong chain', f => { f.lifecycle.identity.chainId = 1 as 50383; }],
  ['malformed address', f => { f.lifecycle.identity.owner = 'owner'; }],
  ['zero address', f => { f.lifecycle.identity.signer = a('0'); }],
  ['different signer', f => { f.lifecycle.identity.signer = a('9'); }],
  ['retired genesis', f => { f.lifecycle.identity.genesisHash = '0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae'; }],
  ['different observation genesis', f => { f.lifecycle.observations[1]!.identity.genesisHash = `0x${'f'.repeat(64)}`; }],
  ['different snapshot genesis', f => { f.lifecycle.observations[1]!.snapshot.market!.genesisHash = `0x${'f'.repeat(64)}`; }],
  ['missing snapshot genesis', f => { delete f.lifecycle.observations[1]!.snapshot.market!.genesisHash; }],
  ['different bank', f => { f.lifecycle.observations[1]!.snapshot.market!.marginBank = a('9'); }],
  ['different registry', f => { f.lifecycle.observations[1]!.snapshot.market!.stopRegistry = a('9'); }],
  ['different owner', f => { f.lifecycle.observations[1]!.snapshot.position!.owner = a('9'); }],
  ['different pool', f => { f.lifecycle.observations[1]!.snapshot.position!.pool = a('9'); }],
  ['different lockfile', f => { f.lifecycle.observations[1]!.provenance.lockSha256 = 'f'.repeat(64); }],
  ['different source', f => { f.lifecycle.observations[1]!.provenance.source.commit = 'f'.repeat(40); }],
  ['different verifier', f => { f.lifecycle.observations[1]!.provenance.source.verifier = 'unrelated'; }],
  ['unpinned SDK', f => { f.lifecycle.provenance.versions.sdk = '0.33.0'; }],
  ['unpinned runtime', f => { f.lifecycle.provenance.versions.node = 'v20.19.2'; }],
  ['different doctor owner', f => { f.doctor.identity.owner = a('9'); }],
  ['different doctor source', f => { f.doctor.source.commit = 'f'.repeat(40); }],
  ['different doctor lockfile', f => { f.doctor.versions.lockSha256 = 'f'.repeat(64); }],
  ['different market tick', f => { f.doctor.selectedMarket.tickSize = '10'; }],
  ['different native deposit', f => { f.doctor.selectedMarket.stopDeposit = '999'; }],
  ['invalid decimals', f => { f.doctor.selectedMarket.baseDecimals = 256; }],
];
describe('identity and provenance binding', () => {
  it.each(identityFailures)('rejects %s', (_name, mutate) => { const f = createSyntheticLiveEvidence(); mutate(f); rejected(f); });
});

const doctorFailures: [string, (f: Fixture) => void][] = [
  ['failed doctor', f => { f.doctor.readonlyResult = 'FAIL'; }],
  ['market-only scope', f => { f.doctor.successScope = 'transport-and-verified-market'; }],
  ['missing owner', f => { f.doctor.ownerConfigured = false; }],
  ['incomplete owner', f => { f.doctor.statuses.owner = 'INCOMPLETE'; }],
  ['failed transport', f => { f.doctor.statuses.transport = 'FAIL'; }],
  ['g0 not accepted', f => { f.doctor.g0Complete = false; }],
  ['nonzero exit', f => { f.doctor.exitCode = 2; }],
  ['failed required check', f => { f.doctor.requiredChecks[0]!.status = 'failed'; }],
  ['omitted mandatory genesis probe', f => { f.doctor.requiredChecks = f.doctor.requiredChecks.filter(c => c.name !== 'genesisBlock1'); }],
  ['omitted discovery check', f => { f.doctor.poolConfigured = false; }],
  ['duplicate required check', f => { f.doctor.requiredChecks.push(f.doctor.requiredChecks[0]!); }],
  ['blocked result', f => { f.doctor.blockers.push('WS unavailable'); }],
  ['signing doctor', f => { f.doctor.signingRequested = true; }],
  ['sending doctor', f => { f.doctor.transactionsSent = 1; }],
  ['stale-at-doctor market', f => { f.doctor.selectedMarket.observedAt = '2026-10-26T23:59:45.750Z'; }],
  ['doctor after supplied opening', f => { f.doctor.completedAt = '2026-10-27T00:00:03.000Z'; }],
];
describe('doctor semantic acceptance', () => {
  it.each(doctorFailures)('rejects %s despite other PASS claims', (_name, mutate) => { const f = createSyntheticLiveEvidence(); mutate(f); rejected(f, 'doctor'); });
});

const snapshotFailures: [string, (f: Fixture) => void][] = [
  ['incomplete snapshot', f => { f.lifecycle.observations[1]!.snapshot.complete = false; }],
  ['known-ids-only', f => { f.lifecycle.observations[1]!.snapshot.scope = 'knownIdsOnly'; }],
  ['read error', f => { f.lifecycle.observations[1]!.snapshot.readError = 'RPC timeout'; }],
  ['fixture position', f => { f.lifecycle.observations[1]!.snapshot.position!.source = 'fixture'; }],
  ['missing block hash', f => { f.lifecycle.observations[1]!.snapshot.market!.blockHash = null; }],
  ['unknown stop discovery consistency', f => { delete f.lifecycle.observations[1]!.snapshot.stopDiscovery; }],
  ['mutation during discovery', f => { f.lifecycle.observations[1]!.snapshot.stopDiscovery!.mutationFree = false; }],
  ['indexer watermark behind', f => { f.lifecycle.observations[1]!.snapshot.stopDiscovery!.indexerWaitedThrough = '1'; }],
  ['indexer watermark ahead', f => { f.lifecycle.observations[1]!.snapshot.stopDiscovery!.indexerWaitedThrough = '999'; }],
  ['invalid feed', f => { f.lifecycle.observations[1]!.snapshot.market!.feedValid = false; }],
  ['floating atoms', f => { f.lifecycle.observations[1]!.snapshot.position!.signedSize = '1e2'; }],
  ['noncanonical negative zero', f => { f.lifecycle.observations[1]!.snapshot.position!.signedSize = '-0'; }],
  ['zero missing-SL exposure', f => { f.lifecycle.observations[1]!.snapshot.position!.signedSize = '0'; }],
  ['zero cancellation-gap exposure', f => { f.lifecycle.observations[2]!.snapshot.position!.signedSize = '0'; }],
  ['stale at capture', f => { const s = f.lifecycle.observations[1]!.snapshot; s.market!.observedAt = s.position!.observedAt = new Date(Date.parse(s.capturedAt) - 15000).toISOString(); }],
  ['future observation', f => { const s = f.lifecycle.observations[1]!.snapshot; s.market!.observedAt = s.position!.observedAt = new Date(Date.parse(s.capturedAt) + 1001).toISOString(); }],
  ['duplicate observation ID', f => { f.lifecycle.observations[1]!.id = f.lifecycle.observations[0]!.id; }],
  ['different lifecycle', f => { f.lifecycle.observations[2]!.lifecycleId = 'other-lifecycle'; }],
  ['reordered stages', f => { f.lifecycle.observations = [f.lifecycle.observations[0]!, f.lifecycle.observations[2]!, f.lifecycle.observations[1]!, f.lifecycle.observations[3]!]; }],
  ['missing residual', f => { f.lifecycle.observations = f.lifecycle.observations.slice(0, 3); }],
  ['duplicate gap stage', f => { f.lifecycle.observations = [...f.lifecycle.observations, { ...f.lifecycle.observations[2]!, id: 'extra-gap' }]; }],
  ['envelope before residual', f => { f.lifecycle.provenance.capturedAt = f.lifecycle.observations[0]!.provenance.capturedAt; }],
];
describe('complete fresh chronological observations', () => {
  it.each(snapshotFailures)('rejects %s', (_name, mutate) => { const f = createSyntheticLiveEvidence(); mutate(f); rejected(f); });
  it('recomputes a gap instead of trusting a client-provided assessment', () => {
    const f = createSyntheticLiveEvidence(); const gap = f.lifecycle.observations[2]!;
    gap.snapshot.stops = action(f, 'replacement').proof!.snapshot.stops.map(s => ({ ...s, observedBlock: gap.snapshot.market!.observedBlock }));
    const claimed = { ...f.lifecycle, observations: f.lifecycle.observations.map(o => o.kind === 'gap' ? { ...o, assessment: { verdict: 'NEEDS_PROTECTION' } } : o) };
    const result = validateLiveEvidence(f.doctor, claimed); expect(result.valid).toBe(false); expect(result.errors.join('\n')).toContain('recomputed NEEDS_PROTECTION');
  });
});

const openingFailures: [string, (f: Fixture) => void][] = [
  ['receipt-only opening', f => { f.lifecycle.observations[0]!.opening!.order = unknownRead; }],
  ['unknown independent position', f => { f.lifecycle.observations[0]!.opening!.position = unknownRead; }],
  ['reverted receipt', f => { f.lifecycle.observations[0]!.opening!.receipt.status = 'reverted'; }],
  ['noncanonical receipt', f => { f.lifecycle.observations[0]!.opening!.receipt.canonicalBlockHash = `0x${'f'.repeat(64)}`; }],
  ['stop transaction misclassified as opening', f => { f.lifecycle.observations[0]!.opening!.transaction.to = f.lifecycle.identity.stopRegistry; }],
  ['zero resulting position', f => { f.lifecycle.observations[0]!.opening!.position.value!.signedSize = '0'; }],
  ['unbound owner', f => { f.lifecycle.observations[0]!.opening!.order.value!.owner = a('9'); }],
  ['no actual fills', f => { f.lifecycle.observations[0]!.opening!.order.value!.fills = []; }],
  ['unbound fill owner', f => { f.lifecycle.observations[0]!.opening!.order.value!.fills[0]!.owner = a('9'); }],
  ['substituted fill tx', f => { f.lifecycle.observations[0]!.opening!.order.value!.fills[0]!.transactionHash = `0x${'f'.repeat(64)}`; }],
  ['wrong filled amount', f => { f.lifecycle.observations[0]!.opening!.order.value!.filledQuantity = '99'; }],
  ['wrong remaining amount', f => { f.lifecycle.observations[0]!.opening!.order.value!.remainingQuantity = '1'; }],
  ['missing official order event', f => { f.lifecycle.observations[0]!.opening!.receipt.logs.pop(); }],
  ['missing official fill event', f => { f.lifecycle.observations[0]!.opening!.receipt.logs.shift(); }],
  ['missing owner position event', f => { f.lifecycle.observations[0]!.opening!.receipt.logs.splice(1, 1); }],
  ['wrong raw event pool', f => { f.lifecycle.observations[0]!.opening!.receipt.logs[0]!.address = a('9'); }],
  ['duplicate raw log indices', f => { f.lifecycle.observations[0]!.opening!.receipt.logs[1]!.logIndex = 0; }],
  ['noncanonical calldata suffix', f => { f.lifecycle.observations[0]!.opening!.transaction.input += '00'; }],
  ['nonzero perps value', f => { f.lifecycle.observations[0]!.opening!.transaction.value = '1'; }],
];
describe('official owner-bound opening proof', () => {
  it.each(openingFailures)('rejects %s', (_name, mutate) => { const f = createSyntheticLiveEvidence(); mutate(f); rejected(f, 'opening'); });
  it('rejects contradictory running remaining quantities even when aggregate quantities match', () => {
    const f = createSyntheticLiveEvidence(); const p = f.lifecycle.observations[0]!.opening!;
    p.receipt.logs[0] = syntheticEventLog(orderBookEventsAbi, 'OrderFilled', { takerOrderId: 7n, makerOrderId: 8n, quantityFilled: 100n, takerRemainingQuantity: 1n, makerRemainingQuantity: 0n, fillPrice: 200000n }, f.lifecycle.identity.pool, 0);
    rejected(f, 'conservation');
  });
  it.each(['orderType', 'selfMatchingOption'] as const)('rejects ABI-encodable but unsupported %s values', field => {
    const f = createSyntheticLiveEvidence();
    f.lifecycle.observations[0]!.opening!.transaction.input = encodeFunctionData({ abi: perpPoolWriteAbi, functionName: 'placeOrder', args: [true, 0n, 200000n, 100n, 0n, field === 'orderType' ? 255 : 1, field === 'selfMatchingOption' ? 255 : 0, a('0') as `0x${string}`, 0n] });
    rejected(f, 'unsupported opening order type or self-matching');
  });
  it('rejects a zero-price raw fill even when quantities and all claimed proofs agree', () => {
    const f = createSyntheticLiveEvidence();
    f.lifecycle.observations[0]!.opening!.receipt.logs[0] = syntheticEventLog(orderBookEventsAbi, 'OrderFilled', { takerOrderId: 7n, makerOrderId: 8n, quantityFilled: 100n, takerRemainingQuantity: 0n, makerRemainingQuantity: 0n, fillPrice: 0n }, f.lifecycle.identity.pool, 0);
    rejected(f, 'opening fill price must be positive');
  });
  it('rejects another official placed-order event instead of selecting a convenient order ID', () => {
    const f = createSyntheticLiveEvidence(); const receipt = f.lifecycle.observations[0]!.opening!.receipt;
    receipt.logs.push(syntheticEventLog(orderBookEventsAbi, 'OrderPlaced', { orderId: 9n, placedOrder: { orderId: 9n, isBid: true, owner: f.lifecycle.identity.owner, userData: 0n, price: 200000n, fullQuantity: 100n, quantityRemaining: 0n, expireTimestampNs: 0n } }, f.lifecycle.identity.pool, 3));
    rejected(f, 'exactly one owner-bound official OrderPlaced');
  });
});

const operationFailures: [string, (f: Fixture) => void][] = [
  ['Applied without proof', f => { action(f, 'initial').proof = null; }],
  ['recovered operation hash', f => { action(f, 'initial').operation.hashProvenance = 'recovered'; }],
  ['recovered proof hash', f => { action(f, 'initial').proof!.intent.hashProvenance = 'recovered'; }],
  ['NeedsReview outcome', f => { action(f, 'initial').operation.state = 'NeedsReview'; }],
  ['Unknown outcome', f => { action(f, 'initial').operation.state = 'Unknown'; }],
  ['immutable ID mismatch', f => { action(f, 'initial').proof!.intent.operationId = 'substituted'; }],
  ['immutable key mismatch', f => { action(f, 'initial').proof!.intent.idempotencyKey = 'substituted'; }],
  ['draft revision mismatch', f => { action(f, 'initial').operation.draft.revision++; }],
  ['substituted exact transaction', f => { action(f, 'initial').proof!.transaction.hash = `0x${'f'.repeat(64)}`; }],
  ['call differs from draft', f => { action(f, 'initial').proof!.transaction.input = action(f, 'cancel').proof!.transaction.input; }],
  ['value differs from draft', f => { action(f, 'initial').proof!.transaction.value = '0'; }],
  ['different proof identity', f => { action(f, 'initial').proof!.identity.owner = a('9'); }],
  ['wrong decoded event type', f => { action(f, 'initial').proof!.event.name = 'PendingOrderCancelled'; }],
  ['wrong decoded event log', f => { action(f, 'initial').proof!.event.logIndex = 99; }],
  ['no raw official event', f => { action(f, 'initial').proof!.receipt.logs = []; }],
  ['receipt tx mismatch', f => { action(f, 'initial').proof!.receipt.transactionHash = `0x${'f'.repeat(64)}`; }],
  ['canonical block mismatch', f => { action(f, 'initial').proof!.receipt.canonicalBlockHash = `0x${'f'.repeat(64)}`; }],
  ['receipt predates draft', f => { action(f, 'initial').proof!.receipt.block.timestamp = '2026-10-27T00:00:08.000Z'; }],
  ['readback before receipt', f => { action(f, 'initial').proof!.nativeReadback.block!.number = '103'; }],
  ['unknown readback', f => { action(f, 'initial').proof!.nativeReadback = unknownRead; }],
  ['wrong readback side', f => { action(f, 'initial').proof!.nativeReadback.value!.isBid = true; }],
  ['wrong readback operator', f => { action(f, 'initial').proof!.nativeReadback.value!.triggerOperator = 0; }],
  ['wrong readback quantity mode', f => { action(f, 'initial').proof!.nativeReadback.value!.quantity = '100'; }],
  ['wrong readback type', f => { action(f, 'initial').proof!.nativeReadback.value!.stopOrderType = 0; }],
  ['wrong readback trigger', f => { action(f, 'initial').proof!.nativeReadback.value!.triggerPrice = '194000'; }],
  ['unexpected sibling linkage', f => { action(f, 'initial').proof!.nativeReadback.value!.siblingId = '99'; }],
  ['missing later snapshot stop', f => { action(f, 'initial').proof!.snapshot.stops = []; }],
  ['later snapshot parameter drift', f => { action(f, 'initial').proof!.snapshot.stops[0]!.triggerPrice = '194000'; }],
  ['selected cancellation still live', f => { action(f, 'cancel').proof!.nativeReadback.value = structuredClone(action(f, 'initial').proof!.nativeReadback.value); }],
  ['cancel wrong stop', f => { action(f, 'cancel').operation.draft.stopId = '12'; }],
  ['incomplete replacement snapshot', f => { action(f, 'replacement').proof!.snapshot.complete = false; }],
  ['source identity drift', f => { source(f, 'replacement', s => { s.position!.owner = a('9'); }); }],
  ['source configuration drift', f => { source(f, 'replacement', s => { s.market!.tickSize = '10'; }); }],
  ['source stale at draft', f => { const row = action(f, 'replacement'); row.operation.draft.createdAt = new Date(Date.parse(row.operation.draft.createdAt) + 15000).toISOString(); row.operation.createdAt = row.operation.draft.createdAt; }],
  ['noncanonical embedded snapshot', f => { const row = action(f, 'initial'); row.operation.draft.fingerprint = row.operation.draft.fingerprint.replace('snapshot-v1:', 'snapshot-v1: '); row.proof!.intent.draftFingerprint = row.operation.draft.fingerprint; }],
  ['missing embedded snapshot', f => { action(f, 'initial').operation.draft.fingerprint = 'snapshot-v1:{}'; action(f, 'initial').proof!.intent.draftFingerprint = 'snapshot-v1:{}'; }],
  ['draft anchor substitution', f => { action(f, 'initial').operation.draft.observedBlock = '1'; }],
  ['initial action after gap', f => { action(f, 'initial').operation.draft.createdAt = f.lifecycle.observations[2]!.provenance.capturedAt; }],
  ['reused operation ID', f => { action(f, 'replacement').operation.id = action(f, 'initial').operation.id; }],
  ['extra unresolved operation', f => { const row = structuredClone(action(f, 'initial')); row.operation = { ...row.operation, id: 'ambiguous', idempotencyKey: 'ambiguous', state: 'Unknown', txHash: null }; row.proof = null; f.lifecycle.operations = [...f.lifecycle.operations, row]; }],
  ['zero post-cancel exposure', f => { action(f, 'cancel').proof!.snapshot.position!.signedSize = '0'; }],
];
describe('original transaction, receipt and independent native reconciliation', () => {
  it.each(operationFailures)('rejects %s', (_name, mutate) => { const f = createSyntheticLiveEvidence(); mutate(f); rejected(f); });
  it('rejects reused opening hashes even with internally consistent operation receipt binding', () => {
    const f = createSyntheticLiveEvidence(); const row = action(f, 'initial'); const hash = f.lifecycle.observations[0]!.opening!.transaction.hash;
    row.operation.txHash = row.proof!.intent.txHash = row.proof!.transaction.hash = row.proof!.receipt.transactionHash = hash; rejected(f, 'distinct transactions');
  });
  it('rejects a reused replacement stop ID even when all raw and decoded readbacks agree', () => {
    const f = createSyntheticLiveEvidence(); const proof = action(f, 'replacement').proof!;
    proof.event.orderId = proof.nativeReadback.value!.id = proof.snapshot.stops[0]!.id = '11';
    proof.receipt.logs[0] = syntheticEventLog(stopEventsAbi, 'PendingOrderCreated', { orderId: 11n, owner: f.lifecycle.identity.owner, isBid: false, quantity: 0n, triggerPrice: 195000n, triggerOperator: 1, orderType: 1, builder: a('0'), builderFeeBpsTimes1k: 0n }, f.lifecycle.identity.stopRegistry, 0);
    rejected(f, 'distinct native stop ID');
  });
  it('rejects a raw native event whose operator contradicts the decoded draft proof', () => {
    const f = createSyntheticLiveEvidence(); const proof = action(f, 'initial').proof!;
    proof.receipt.logs[0] = syntheticEventLog(stopEventsAbi, 'PendingOrderCreated', { orderId: 11n, owner: f.lifecycle.identity.owner, isBid: false, quantity: 0n, triggerPrice: 195000n, triggerOperator: 0, orderType: 1, builder: a('0'), builderFeeBpsTimes1k: 0n }, f.lifecycle.identity.stopRegistry, 0);
    rejected(f, 'official creation event parameters');
  });
  it('rejects ambiguous creation events even when one matches the selected proof ID', () => {
    const f = createSyntheticLiveEvidence(); const proof = action(f, 'initial').proof!;
    proof.receipt.logs.push(syntheticEventLog(stopEventsAbi, 'PendingOrderCreated', { orderId: 99n, owner: f.lifecycle.identity.owner, isBid: false, quantity: 0n, triggerPrice: 195000n, triggerOperator: 1, orderType: 1, builder: a('0'), builderFeeBpsTimes1k: 0n }, f.lifecycle.identity.stopRegistry, 1));
    rejected(f, 'unambiguous official raw receipt log');
  });
  it('requires cancellation reconciliation before gap capture', () => {
    const f = createSyntheticLiveEvidence(); action(f, 'cancel').proof!.reconciledAt = '2026-10-27T00:00:23.000Z'; action(f, 'cancel').operation.updatedAt = '2026-10-27T00:00:23.100Z'; rejected(f, 'gap capture precedes');
  });
  it('requires residual capture after replacement reconciliation', () => {
    const f = createSyntheticLiveEvidence(); action(f, 'replacement').proof!.reconciledAt = '2026-10-27T00:00:33.000Z'; action(f, 'replacement').operation.updatedAt = '2026-10-27T00:00:33.100Z'; rejected(f, 'residual capture precedes');
  });
});

describe('all required residual reads', () => {
  it.each(['position', 'nativeStops', 'restingOrders', 'walletStt', 'walletCollateral', 'bankUnlockedCollateral', 'bankLockedCollateral'] as const)('exports unknown %s honestly but blocks complete acceptance', name => {
    const f = createSyntheticLiveEvidence(); f.lifecycle.observations[3]!.residuals![name] = unknownRead; rejected(f, `residual.${name}`);
  });
  it('rejects a read whose reported block is not the residual pinned block', () => {
    const f = createSyntheticLiveEvidence(); f.lifecycle.observations[3]!.residuals!.walletStt.block!.number = '114'; rejected(f, 'snapshot pinned block/hash/time');
  });
  it('rejects missing/stale position values hidden behind known flags', () => {
    const f = createSyntheticLiveEvidence(); f.lifecycle.observations[3]!.residuals!.position.value!.observedBlock = '114'; rejected(f, 'residual');
  });
  it('rejects floating or negative unsigned balances without Number coercion', () => {
    const f = createSyntheticLiveEvidence(); f.lifecycle.observations[3]!.residuals!.walletStt.value = '1e20'; rejected(f, 'canonical atomic');
    const other = createSyntheticLiveEvidence(); other.lifecycle.observations[3]!.residuals!.bankLockedCollateral.value = '-1'; rejected(other, 'canonical atomic');
  });
  it('rejects resting orders from a substituted account', () => {
    const f = createSyntheticLiveEvidence(); f.lifecycle.observations[3]!.residuals!.restingOrders.value!.push({ id: '27', owner: a('9'), pool: f.lifecycle.identity.pool, isBid: false, quantity: '10' }); rejected(f, 'resting order identity');
  });
});
