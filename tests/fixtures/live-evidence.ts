import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, type Abi, type AbiEvent } from 'viem';
import { marginBankEventsAbi, orderBookEventsAbi, perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { createCancelDraft, createSlDraft } from '../../packages/domain/index.js';
import { expectedDraftCall } from '../../packages/protocol/index.js';
import { stopEventsAbi } from '../../packages/protocol/sdk-abi.js';
import type { MarketSnapshot, NativeStopSnapshot, Operation, RepairDraft, Snapshot } from '../../packages/domain/types.js';
import type { EvidenceBlock, EvidenceIdentity, EvidenceLog, EvidenceObservation, EvidenceOperation, EvidenceProvenance, EvidenceRead, EvidenceReceipt, EvidenceTransaction, LiveLifecycleEvidence, OperationEvidenceProof } from '../../packages/domain/live-evidence.js';

export interface SyntheticDoctorEvidence {
  schemaVersion:number; artifactType:string; readonlyResult:string; successScope:string;
  statuses:{transport:string;market:string;owner:string}; requiredChecks:{name:string;status:string}[];
  blockers:string[]; ownerAcceptanceBlockers:string[]; g0Complete:boolean;
  selectedMarket:MarketSnapshot & {selectionSource:string}; identity:Omit<EvidenceIdentity,'signer'>;
  versions:EvidenceProvenance['versions'] & {npm:string;lockSha256:string};
  source:{commit:string;verifier:string;doctorSha256:string;dirty:boolean};
  startedAt:string;completedAt:string;ownerConfigured:boolean;poolConfigured:boolean;
  readOnly:boolean;signingRequested:boolean;transactionsSent:number;exitCode:number;
}
export interface SyntheticLiveEvidence {doctor:SyntheticDoctorEvidence;lifecycle:LiveLifecycleEvidence}

// Deliberately synthetic, test-only addresses/hashes. Never a live evidence file.
const a = (digit: string) => `0x${digit.repeat(40)}`;
const h = (digit: string) => `0x${digit.repeat(64)}`;
const start = Date.parse('2026-10-27T00:00:00.000Z');
const at = (milliseconds: number) => new Date(start + milliseconds).toISOString();
const identity: EvidenceIdentity = { chainId: 50383, genesisHash: h('e'), owner: a('4'), signer: a('4'), pool: a('1'), marginBank: a('2'), stopRegistry: a('3') };
const zero = a('0') as `0x${string}`;

/** Encode fixtures from the very same official event declarations used to decode. */
export function syntheticEventLog(abi: Abi, name: string, args: Record<string, unknown>, address: string, logIndex: number): EvidenceLog {
  const event = abi.find(item => item.type === 'event' && item.name === name) as AbiEvent | undefined;
  if (!event) throw new Error(`TEST_EVENT_ABI_MISSING:${name}`);
  const parameters = event.inputs.filter(input => !input.indexed);
  return { address, logIndex, topics: encodeEventTopics({ abi: [event], eventName: name, args }) as string[], data: encodeAbiParameters(parameters, parameters.map(input => args[input.name!])) };
}
function block(number: number): EvidenceBlock {
  return { number: String(number), hash: `0x${number.toString(16).padStart(64, '0')}`, timestamp: at((number - 99) * 2000) };
}
function provenance(capturedAt: string): EvidenceProvenance {
  return { source: { commit: 'a'.repeat(40), verifier: 'synthetic-domain-regression/v1' }, versions: { node: 'v24.22.1', sdk: '0.32.1', viem: '2.57.11' }, lockSha256: 'b'.repeat(64), mode: 'live-owner', capturedAt };
}
function stop(id: string, number: number): NativeStopSnapshot {
  return { id, owner: identity.owner, pool: identity.pool, registry: identity.stopRegistry, intent: 'reduceOnly', isBid: false, quantity: '0', triggerPrice: '195000', triggerOperator: 1, stopOrderType: 1, limitPrice: '0', status: 'pending', siblingId: null, observedBlock: String(number) };
}
function snapshot(number: number, stopIds: string[] = []): Snapshot {
  const b = block(number);
  return { mode: 'live-owner', complete: true, scope: 'indexedSnapshot', readError: null, capturedAt: at((number - 99) * 2000 + 250), stopDiscovery: { fromBlock: b.number, toBlock: b.number, indexerWaitedThrough: b.number, mutationFree: true },
    market: { chainId: 50383, genesisHash: identity.genesisHash, pool: identity.pool, marginBank: identity.marginBank, stopRegistry: identity.stopRegistry, symbol: 'SYNTHETIC / PAPER', baseDecimals: 4, quoteDecimals: 2, tickSize: '5', lotSize: '10', minQuantity: '100', mark: '200000', feedValid: true, observedBlock: b.number, blockHash: b.hash, observedAt: b.timestamp, stopDeposit: '1000000' },
    position: { chainId: 50383, owner: identity.owner, pool: identity.pool, signedSize: '100', entryPrice: '200000', observedBlock: b.number, observedAt: b.timestamp, source: 'chain' }, stops: stopIds.map(id => stop(id, number)) };
}
function known<T>(value: T, number: number): EvidenceRead<T> {
  return { status: 'known', value, block: block(number), consistency: 'pinned', error: null };
}
function receipt(transaction: EvidenceTransaction, logs: EvidenceLog[], number: number): EvidenceReceipt {
  return { transactionHash: transaction.hash, from: transaction.from, to: transaction.to, status: 'success', block: block(number), canonicalBlockHash: block(number).hash, logs };
}
function operation(draft: RepairDraft, id: string, txHash: string, receiptNumber: number, readNumber: number, snapshotNumber: number, stopId: string): EvidenceOperation {
  const expected = expectedDraftCall(draft); const createdAt = new Date(Date.parse(draft.createdAt) + 50).toISOString();
  const tx: EvidenceTransaction = { hash: txHash, chainId: 50383, from: identity.owner, to: identity.stopRegistry, input: expected.data, value: expected.value.toString(), blockNumber: String(receiptNumber), blockHash: block(receiptNumber).hash };
  const cancelled = draft.action === 'cancel-stop';
  const name = cancelled ? 'PendingOrderCancelled' : 'PendingOrderCreated';
  const args = cancelled ? { orderId: BigInt(stopId) } : { orderId: BigInt(stopId), owner: identity.owner, isBid: false, quantity: 0n, triggerPrice: 195000n, triggerOperator: 1, orderType: 1, builder: zero, builderFeeBpsTimes1k: 0n };
  const proof: OperationEvidenceProof = { identity: { ...identity }, intent: { operationId: id, idempotencyKey: `synthetic-key-${id}`, draftFingerprint: draft.fingerprint, draftRevision: draft.revision, txHash, hashProvenance: 'original' }, transaction: tx, receipt: receipt(tx, [syntheticEventLog(stopEventsAbi, name, args, identity.stopRegistry, 0)], receiptNumber), event: { name, address: identity.stopRegistry, orderId: stopId, logIndex: 0 }, nativeReadback: known(cancelled ? null : stop(stopId, readNumber), readNumber), snapshot: snapshot(snapshotNumber, cancelled ? [] : [stopId]), reconciledAt: at((snapshotNumber - 99) * 2000 + 500) };
  const row: Operation = { id, idempotencyKey: proof.intent.idempotencyKey, owner: identity.owner, pool: identity.pool, state: 'Applied', draft, txHash, error: null, createdAt, updatedAt: at((snapshotNumber - 99) * 2000 + 600) };
  return { operation: row, proof };
}

/** Pure fixture builder shared by unit regressions and CLI file-ingestion smoke. */
export function createSyntheticLiveEvidence(): SyntheticLiveEvidence {
  const openingSnapshot = snapshot(101); const openingHash = h('5');
  const tx: EvidenceTransaction = { hash: openingHash, chainId: 50383, from: identity.owner, to: identity.pool, input: encodeFunctionData({ abi: perpPoolWriteAbi, functionName: 'placeOrder', args: [true, 0n, 200000n, 100n, 0n, 1, 0, zero, 0n] }), value: '0', blockNumber: '100', blockHash: block(100).hash };
  const openingLogs = [
    syntheticEventLog(orderBookEventsAbi, 'OrderFilled', { takerOrderId: 7n, makerOrderId: 8n, quantityFilled: 100n, takerRemainingQuantity: 0n, makerRemainingQuantity: 0n, fillPrice: 200000n }, identity.pool, 0),
    syntheticEventLog(marginBankEventsAbi, 'PositionUpdated', { account: identity.owner, perpPool: identity.pool, newSize: 100n, avgEntryPrice: 200000n, realizedPnl: 0n, entryFundingIndex: 0n }, identity.marginBank, 1),
    syntheticEventLog(orderBookEventsAbi, 'OrderPlaced', { orderId: 7n, placedOrder: { orderId: 7n, isBid: true, owner: identity.owner, userData: 0n, price: 200000n, fullQuantity: 100n, quantityRemaining: 0n, expireTimestampNs: 0n } }, identity.pool, 2),
  ];
  const opening: EvidenceObservation = { id: 'synthetic-opening', lifecycleId: 'synthetic-lifecycle', kind: 'opening', identity: { ...identity }, provenance: provenance(openingSnapshot.capturedAt), snapshot: openingSnapshot,
    opening: { transaction: tx, receipt: receipt(tx, openingLogs, 100), order: known({ decoder: '@somnia-chain/markets-sdk@0.32.1:perpPoolWriteAbi+orderBookEventsAbi+marginBankEventsAbi', owner: identity.owner, pool: identity.pool, isBid: true, requestedQuantity: '100', filledQuantity: '100', remainingQuantity: '0', orderId: '7', fills: [{ owner: identity.owner, pool: identity.pool, orderId: '7', quantity: '100', transactionHash: openingHash, logIndex: 0 }] }, 100), position: known(snapshot(100).position!, 100) } };
  const missingSnapshot = snapshot(102); const gapSnapshot = snapshot(110); const residualSnapshot = snapshot(115, ['12']);
  const missing: EvidenceObservation = { id: 'synthetic-missing', lifecycleId: opening.lifecycleId, kind: 'missing-sl', identity: { ...identity }, provenance: provenance(missingSnapshot.capturedAt), snapshot: missingSnapshot };
  const gap: EvidenceObservation = { id: 'synthetic-gap', lifecycleId: opening.lifecycleId, kind: 'gap', identity: { ...identity }, provenance: provenance(gapSnapshot.capturedAt), snapshot: gapSnapshot };
  const residual: EvidenceObservation = { id: 'synthetic-residual', lifecycleId: opening.lifecycleId, kind: 'residual', identity: { ...identity }, provenance: provenance(residualSnapshot.capturedAt), snapshot: residualSnapshot,
    residuals: { position: known(residualSnapshot.position!, 115), nativeStops: known(residualSnapshot.stops, 115), restingOrders: known([], 115), walletStt: known('123456789012345678901234567890', 115), walletCollateral: known('5000000', 115), bankUnlockedCollateral: known('-7', 115), bankLockedCollateral: known('100000', 115) } };
  // Each API draft uses a newer read, not a byte-identical earlier capture.
  const initial = operation(createSlDraft(snapshot(103), '1950', atTime(8500)), 'synthetic-initial', h('6'), 104, 105, 106, '11');
  const cancel = operation(createCancelDraft(snapshot(107, ['11']), '11', 1, atTime(16500)), 'synthetic-cancel', h('7'), 108, 108, 109, '11');
  const replacement = operation(createSlDraft(snapshot(111), '1950', atTime(24500)), 'synthetic-replacement', h('8'), 112, 113, 114, '12');
  const lifecycle: LiveLifecycleEvidence = { schemaVersion: 1, artifactType: 'dreamshield-g1-lifecycle', lifecycleId: opening.lifecycleId, identity: { ...identity }, provenance: provenance(at(33000)), observations: [opening, missing, gap, residual], operations: [replacement, cancel, initial] };
  const doctor = { schemaVersion: 1, artifactType: 'dreamshield-readonly-doctor', readonlyResult: 'PASS', successScope: 'transport-market-and-owner', statuses: { transport: 'PASS', market: 'PASS', owner: 'COMPLETE' },
    requiredChecks: ['versions', 'sourceIdentity', 'protocolSetup', 'httpSetup', 'http', 'websocketSetup', 'websocket', 'systemBytecode', 'sdkSetup', 'sdkSystemConfig', 'httpSystemConfigAtBlock', 'genesisBlock1', 'marketVerification', 'genesisValidation', 'websocketCleanup', 'sdkCleanup', 'execution', 'artifactPersistence', 'ownerSnapshot'].map(name => ({ name, status: 'passed' })),
    blockers: [] as string[], ownerAcceptanceBlockers: [] as string[], g0Complete: true, selectedMarket: { ...snapshot(99).market!, selectionSource: 'configured' }, identity: { chainId: identity.chainId, genesisHash: identity.genesisHash, owner: identity.owner, pool: identity.pool, marginBank: identity.marginBank, stopRegistry: identity.stopRegistry }, versions: { ...provenance(at(0)).versions, npm: '11.11.1', lockSha256: provenance(at(0)).lockSha256 }, source: { commit: provenance(at(0)).source.commit, verifier: 'dreamshield-doctor-readonly/v1', doctorSha256: 'c'.repeat(64), dirty: false }, startedAt: at(-1000), completedAt: at(750), ownerConfigured: true, poolConfigured: true, readOnly: true, signingRequested: false, transactionsSent: 0, exitCode: 0 };
  return { doctor, lifecycle };
}
function atTime(milliseconds: number): number { return start + milliseconds; }
