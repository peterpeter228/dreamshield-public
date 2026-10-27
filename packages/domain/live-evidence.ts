import { decodeEventLog, decodeFunctionData, encodeFunctionData, type Hex } from 'viem';
import { marginBankEventsAbi, orderBookEventsAbi, perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { stopEventsAbi } from '../protocol/sdk-abi.js';
import { transactionAbi } from '../protocol/transaction-abi.js';
import { assessProtection, FRESHNESS_MS, snapshotFingerprint, validateDraft } from './index.js';
import type { NativeStopSnapshot, Operation, PositionSnapshot, RepairDraft, Snapshot } from './types.js';

export interface EvidenceIdentity {
  chainId: 50383; genesisHash: string; owner: string; signer: string;
  pool: string; marginBank: string; stopRegistry: string;
}
export interface EvidenceProvenance {
  source: { commit: string; verifier: string };
  versions: { node: string; sdk: string; viem: string };
  lockSha256: string; mode: 'live-owner'; capturedAt: string;
}
export interface EvidenceBlock { number: string; hash: string; timestamp: string }
export type EvidenceRead<T> =
  | { status: 'known'; value: T; block: EvidenceBlock; consistency: 'pinned'; error: null }
  | { status: 'unknown' | 'error'; value: null; block: EvidenceBlock | null; consistency: 'pinned' | 'unpinned' | 'unavailable'; error: string };
export interface EvidenceLog { address: string; data: string; topics: string[]; logIndex: number }
export interface EvidenceTransaction {
  hash: string; chainId: 50383; from: string; to: string; input: string; value: string;
  blockNumber: string; blockHash: string;
}
export interface EvidenceReceipt {
  transactionHash: string; from: string; to: string; status: 'success' | 'reverted';
  block: EvidenceBlock; canonicalBlockHash: string; logs: EvidenceLog[];
}
export interface OpeningOrderProof {
  decoder: string; owner: string; pool: string; isBid: boolean; requestedQuantity: string;
  filledQuantity: string; remainingQuantity: string; orderId: string;
  fills: { owner: string; pool: string; orderId: string; quantity: string; transactionHash: string; logIndex: number }[];
}
export interface OpeningEvidenceProof {
  transaction: EvidenceTransaction; receipt: EvidenceReceipt;
  order: EvidenceRead<OpeningOrderProof>; position: EvidenceRead<PositionSnapshot>;
}
export interface ResidualOrder { id: string; owner: string; pool: string; isBid: boolean; quantity: string }
export interface ResidualEvidence {
  position: EvidenceRead<PositionSnapshot>; nativeStops: EvidenceRead<NativeStopSnapshot[]>;
  restingOrders: EvidenceRead<ResidualOrder[]>; walletStt: EvidenceRead<string>;
  walletCollateral: EvidenceRead<string>; bankUnlockedCollateral: EvidenceRead<string>; bankLockedCollateral: EvidenceRead<string>;
}
export interface EvidenceObservation {
  id: string; lifecycleId: string; kind: 'opening' | 'missing-sl' | 'gap' | 'residual';
  identity: EvidenceIdentity; provenance: EvidenceProvenance; snapshot: Snapshot;
  opening?: OpeningEvidenceProof; residuals?: ResidualEvidence;
}
export interface NativeStopEventProof {
  name: 'PendingOrderCreated' | 'PendingOrderCancelled'; address: string; orderId: string; logIndex: number;
}
export interface OperationEvidenceProof {
  identity: EvidenceIdentity;
  intent: { operationId: string; idempotencyKey: string; draftFingerprint: string; draftRevision: number; txHash: string; hashProvenance: 'original' | 'recovered' };
  transaction: EvidenceTransaction; receipt: EvidenceReceipt; event: NativeStopEventProof;
  nativeReadback: EvidenceRead<NativeStopSnapshot | null>; snapshot: Snapshot; reconciledAt: string;
}
export interface EvidenceOperation { operation: Operation; proof: OperationEvidenceProof | null }
export interface LiveLifecycleEvidence {
  schemaVersion: 1; artifactType: 'dreamshield-g1-lifecycle'; lifecycleId: string;
  identity: EvidenceIdentity; provenance: EvidenceProvenance;
  observations: readonly EvidenceObservation[]; operations: readonly EvidenceOperation[];
}
export interface LiveEvidenceValidation {
  valid: boolean; errors: string[];
  status: 'MISSING' | 'INVALID' | 'HISTORICAL_OR_REPLAY' | 'CAPTURED_COMPLETE';
  eligibility: { realPerpsOrder: boolean; nativeProtectionReadback: boolean };
  fileOnly: true; originAuthenticated: false; currentChainRevalidated: false; historical: true;
}

const uint = /^(0|[1-9]\d*)$/;
const sint = /^(0|-?[1-9]\d*)$/;
const address = /^0x[0-9a-fA-F]{40}$/;
const hash = /^0x[0-9a-fA-F]{64}$/;
const bytes = /^0x(?:[0-9a-fA-F]{2})*$/;
const digest = /^[0-9a-fA-F]{64}$/;
const commit = /^[0-9a-fA-F]{40}$/;
const retiredGenesis = '0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae';
const zeroAddress = `0x${'0'.repeat(40)}`;
const zeroHash = `0x${'0'.repeat(64)}`;
const same = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const time = (value: string) => Date.parse(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const atomic = (value: unknown): value is string => typeof value === 'string' && uint.test(value);
const signedAtomic = (value: unknown): value is string => typeof value === 'string' && sint.test(value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Structural checking precedes every bigint conversion and domain assessment. */
class Checks {
  readonly errors: string[] = [];
  replay = false;
  require(condition: unknown, path: string, message: string): boolean {
    if (!condition) this.errors.push(`${path}: ${message}`);
    return !!condition;
  }
  object(value: unknown, path: string): Record<string, unknown> | null {
    return this.require(record(value), path, 'expected an object') ? value as Record<string, unknown> : null;
  }
  array(value: unknown, path: string): unknown[] | null {
    return this.require(Array.isArray(value), path, 'expected an array') ? value as unknown[] : null;
  }
  block(value: unknown, path: string): EvidenceBlock | null {
    const start = this.errors.length; const b = this.object(value, path); if (!b) return null;
    this.require(atomic(b.number), `${path}.number`, 'expected a canonical unsigned atomic block number');
    this.require(typeof b.hash === 'string' && hash.test(b.hash) && !same(b.hash, zeroHash), `${path}.hash`, 'expected a nonzero block hash');
    this.require(timestamp(b.timestamp), `${path}.timestamp`, 'expected an ISO timestamp');
    return start === this.errors.length ? value as EvidenceBlock : null;
  }
  identity(value: unknown, path: string, expected?: EvidenceIdentity): EvidenceIdentity | null {
    const start = this.errors.length; const id = this.object(value, path); if (!id) return null;
    this.require(id.chainId === 50383, `${path}.chainId`, 'only chain 50383 is accepted');
    this.require(typeof id.genesisHash === 'string' && hash.test(id.genesisHash) && !same(id.genesisHash, zeroHash) && !same(id.genesisHash, retiredGenesis), `${path}.genesisHash`, 'expected a non-retired, nonzero genesis hash');
    for (const key of ['owner', 'signer', 'pool', 'marginBank', 'stopRegistry'] as const) {
      this.require(typeof id[key] === 'string' && address.test(id[key] as string) && !same(id[key], zeroAddress), `${path}.${key}`, 'expected a nonzero public address');
      if (expected) this.require(same(id[key], expected[key]), `${path}.${key}`, 'does not match lifecycle identity');
    }
    this.require(same(id.owner, id.signer), `${path}.signer`, 'the isolated EOA owner must be the signer');
    if (expected) this.require(same(id.genesisHash, expected.genesisHash), `${path}.genesisHash`, 'does not match lifecycle genesis');
    return start === this.errors.length ? value as EvidenceIdentity : null;
  }
  provenance(value: unknown, path: string, expected?: EvidenceProvenance): EvidenceProvenance | null {
    const start = this.errors.length; const p = this.object(value, path); if (!p) return null;
    const source = this.object(p.source, `${path}.source`); const versions = this.object(p.versions, `${path}.versions`);
    if (p.mode === 'replay') this.replay = true;
    this.require(p.mode === 'live-owner', `${path}.mode`, 'live-owner capture is required; replay/read-only exports are not G1 proof');
    this.require(timestamp(p.capturedAt), `${path}.capturedAt`, 'expected an ISO capture time');
    this.require(typeof p.lockSha256 === 'string' && digest.test(p.lockSha256), `${path}.lockSha256`, 'expected a raw lockfile SHA-256 digest');
    if (source) {
      this.require(typeof source.commit === 'string' && commit.test(source.commit), `${path}.source.commit`, 'expected the capture source commit');
      this.require(nonempty(source.verifier), `${path}.source.verifier`, 'expected verifier identity');
      if (expected) this.require(same(source.commit, expected.source.commit) && source.verifier === expected.source.verifier, `${path}.source`, 'does not match lifecycle source/verifier');
    }
    if (versions) {
      this.require(typeof versions.node === 'string' && versions.node.replace(/^v/, '') === '24.22.1', `${path}.versions.node`, 'expected pinned Node 24.22.1');
      this.require(versions.sdk === '0.32.1', `${path}.versions.sdk`, 'expected pinned SDK 0.32.1');
      this.require(versions.viem === '2.57.11', `${path}.versions.viem`, 'expected pinned viem 2.57.11');
      if (expected) for (const key of ['node', 'sdk', 'viem'] as const) this.require(versions[key] === expected.versions[key], `${path}.versions.${key}`, 'does not match lifecycle version');
    }
    if (expected) this.require(same(p.lockSha256, expected.lockSha256), `${path}.lockSha256`, 'does not match lifecycle lock digest');
    return start === this.errors.length ? value as EvidenceProvenance : null;
  }
  position(value: unknown, path: string, id: EvidenceIdentity): PositionSnapshot | null {
    const start = this.errors.length; const p = this.object(value, path); if (!p) return null;
    this.require(p.chainId === 50383 && same(p.owner, id.owner) && same(p.pool, id.pool), path, 'position chain/owner/pool mismatch');
    this.require(signedAtomic(p.signedSize) && atomic(p.entryPrice), path, 'position amounts must be canonical atomic strings');
    this.require(atomic(p.observedBlock) && timestamp(p.observedAt), path, 'position requires a block and ISO observation time');
    this.require(p.source === 'chain', `${path}.source`, 'fixture data is not live evidence');
    return start === this.errors.length ? value as PositionSnapshot : null;
  }
  stop(value: unknown, path: string, id: EvidenceIdentity): NativeStopSnapshot | null {
    const start = this.errors.length; const s = this.object(value, path); if (!s) return null;
    this.require(same(s.owner, id.owner) && same(s.pool, id.pool) && same(s.registry, id.stopRegistry), path, 'native stop owner/pool/registry mismatch');
    for (const key of ['id', 'quantity', 'triggerPrice', 'limitPrice', 'observedBlock'] as const) this.require(atomic(s[key]), `${path}.${key}`, 'expected a canonical unsigned atomic string');
    this.require(s.intent === 'reduceOnly' || s.intent === 'opening', `${path}.intent`, 'invalid native stop intent');
    this.require(typeof s.isBid === 'boolean', `${path}.isBid`, 'expected boolean');
    this.require(s.triggerOperator === 0 || s.triggerOperator === 1, `${path}.triggerOperator`, 'invalid trigger operator');
    this.require(s.stopOrderType === 0 || s.stopOrderType === 1, `${path}.stopOrderType`, 'invalid native stop type');
    this.require(['pending', 'filled', 'cancelled', 'dropped', 'unknown'].includes(String(s.status)), `${path}.status`, 'invalid native stop status');
    this.require(s.siblingId === null || atomic(s.siblingId), `${path}.siblingId`, 'invalid sibling identity');
    return start === this.errors.length ? value as NativeStopSnapshot : null;
  }
  snapshot(value: unknown, path: string, id: EvidenceIdentity, capturedAt?: string): Snapshot | null {
    const start = this.errors.length; const s = this.object(value, path); if (!s) return null;
    if (s.mode === 'replay') this.replay = true;
    this.require(s.mode === 'live-owner', `${path}.mode`, 'expected a live-owner snapshot');
    this.require(s.complete === true && s.scope === 'indexedSnapshot' && s.readError === null, path, 'complete indexed discovery without read errors is required');
    this.require(timestamp(s.capturedAt), `${path}.capturedAt`, 'expected ISO capture time');
    if (capturedAt) this.require(s.capturedAt === capturedAt, `${path}.capturedAt`, 'snapshot and observation capture clocks differ');
    const m = this.object(s.market, `${path}.market`); const p = this.position(s.position, `${path}.position`, id);
    const stops = this.array(s.stops, `${path}.stops`);
    if (stops) for (const [i, stop] of stops.entries()) this.stop(stop, `${path}.stops[${i}]`, id);
    if (m) {
      this.require(m.chainId === 50383 && same(m.genesisHash, id.genesisHash) && same(m.pool, id.pool) && same(m.marginBank, id.marginBank) && same(m.stopRegistry, id.stopRegistry), `${path}.market`, 'market chain/genesis/pool/bank/registry mismatch');
      this.require(typeof m.blockHash === 'string' && hash.test(m.blockHash) && !same(m.blockHash, zeroHash), `${path}.market.blockHash`, 'canonical block hash is required');
      this.require(nonempty(m.symbol) && timestamp(m.observedAt) && atomic(m.observedBlock), `${path}.market`, 'market symbol, ISO observation time and block are required');
      for (const key of ['mark', 'tickSize', 'lotSize', 'minQuantity'] as const) this.require(atomic(m[key]) && BigInt(m[key] as string) > 0n, `${path}.market.${key}`, 'expected a positive canonical atomic value');
      this.require(atomic(m.stopDeposit), `${path}.market.stopDeposit`, 'native registry deposit must be known');
      this.require(m.feedValid === true, `${path}.market.feedValid`, 'mark feed must be valid');
      for (const key of ['baseDecimals', 'quoteDecimals'] as const) this.require(Number.isInteger(m[key]) && Number(m[key]) >= 0 && Number(m[key]) <= 255, `${path}.market.${key}`, 'invalid token decimals');
      const discovery = this.object(s.stopDiscovery, `${path}.stopDiscovery`);
      if (discovery) {
        for (const key of ['fromBlock', 'toBlock', 'indexerWaitedThrough'] as const) this.require(atomic(discovery[key]), `${path}.stopDiscovery.${key}`, 'expected discovery bracket block');
        this.require(discovery.mutationFree === true, `${path}.stopDiscovery.mutationFree`, 'discovery bracket must be mutation-free');
        if ([discovery.fromBlock, discovery.toBlock, discovery.indexerWaitedThrough, m.observedBlock].every(atomic)) this.require(BigInt(discovery.fromBlock as string) <= BigInt(discovery.indexerWaitedThrough as string) && BigInt(discovery.indexerWaitedThrough as string) <= BigInt(discovery.toBlock as string) && discovery.toBlock === m.observedBlock, `${path}.stopDiscovery`, 'discovery bracket/watermark does not cover the pinned snapshot');
      }
      if (p) this.require(p.observedBlock === m.observedBlock && p.observedAt === m.observedAt, path, 'position and market must use the same pinned observation block/time');
    }
    if (start !== this.errors.length) return null;
    const snapshot = value as Snapshot;
    const assessment = assessProtection(snapshot, time(snapshot.capturedAt));
    this.require(assessment.verdict !== 'UNKNOWN', path, `fresh-at-capture assessment is unknown (${assessment.reasonCodes.join(',')})`);
    return start === this.errors.length ? snapshot : null;
  }
  read<T>(value: unknown, path: string, validate: (value: unknown, path: string) => T | null): EvidenceRead<T> | null {
    const start = this.errors.length; const r = this.object(value, path); if (!r) return null;
    if (r.status === 'unknown' || r.status === 'error') {
      this.require(r.value === null && nonempty(r.error), path, 'unknown/error reads must retain null value and an explicit cause');
      this.require(false, path, `${String(r.status)} read cannot satisfy complete acceptance (${String(r.error)})`);
      return null;
    }
    this.require(r.status === 'known' && r.consistency === 'pinned' && r.error === null, path, 'read must be known, error-free and block-pinned');
    this.block(r.block, `${path}.block`);
    validate(r.value, `${path}.value`);
    return start === this.errors.length ? value as EvidenceRead<T> : null;
  }
  transaction(value: unknown, receiptValue: unknown, path: string, id: EvidenceIdentity, to: string): { transaction: EvidenceTransaction; receipt: EvidenceReceipt } | null {
    const start = this.errors.length; const tx = this.object(value, `${path}.transaction`); const r = this.object(receiptValue, `${path}.receipt`);
    if (!tx || !r) return null;
    this.require(typeof tx.hash === 'string' && hash.test(tx.hash) && !same(tx.hash, zeroHash), `${path}.transaction.hash`, 'expected transaction hash');
    this.require(tx.chainId === 50383 && same(tx.from, id.signer) && same(tx.to, to), `${path}.transaction`, 'transaction chain/signer/destination mismatch');
    this.require(typeof tx.input === 'string' && bytes.test(tx.input) && tx.input.length >= 10 && atomic(tx.value), `${path}.transaction`, 'exact calldata and canonical atomic value are required');
    this.require(atomic(tx.blockNumber) && typeof tx.blockHash === 'string' && hash.test(tx.blockHash), `${path}.transaction`, 'mined transaction block identity is required');
    const b = this.block(r.block, `${path}.receipt.block`);
    this.require(r.status === 'success', `${path}.receipt.status`, 'a successful canonical receipt is required');
    this.require(same(r.transactionHash, tx.hash) && same(r.from, tx.from) && same(r.to, tx.to), `${path}.receipt`, 'receipt and exact transaction scope/hash differ');
    if (b) this.require(same(r.canonicalBlockHash, b.hash) && same(tx.blockHash, b.hash) && tx.blockNumber === b.number, `${path}.receipt`, 'receipt is not bound to its canonical transaction block');
    const logs = this.array(r.logs, `${path}.receipt.logs`); const indices = new Set<number>();
    if (logs) for (const [i, raw] of logs.entries()) {
      const log = this.object(raw, `${path}.receipt.logs[${i}]`); if (!log) continue;
      this.require(typeof log.address === 'string' && address.test(log.address), `${path}.receipt.logs[${i}].address`, 'invalid log address');
      this.require(typeof log.data === 'string' && bytes.test(log.data), `${path}.receipt.logs[${i}].data`, 'invalid raw log bytes');
      this.require(Array.isArray(log.topics) && log.topics.length > 0 && log.topics.length <= 4 && log.topics.every(t => typeof t === 'string' && hash.test(t)), `${path}.receipt.logs[${i}].topics`, 'invalid raw log topics');
      this.require(Number.isSafeInteger(log.logIndex) && Number(log.logIndex) >= 0 && !indices.has(Number(log.logIndex)), `${path}.receipt.logs[${i}].logIndex`, 'log indices must be unique nonnegative integers');
      indices.add(Number(log.logIndex));
    }
    return start === this.errors.length ? { transaction: value as EvidenceTransaction, receipt: receiptValue as EvidenceReceipt } : null;
  }
}

function matchReadBlock(c: Checks, read: EvidenceRead<unknown> | null, snapshot: Snapshot, path: string): void {
  if (!read || read.status !== 'known') return;
  c.require(read.block.number === snapshot.market!.observedBlock && same(read.block.hash, snapshot.market!.blockHash) && read.block.timestamp === snapshot.market!.observedAt, path, 'read must use the snapshot pinned block/hash/time');
}
function sameConfiguration(c: Checks, snapshot: Snapshot, market: Record<string, unknown>, path: string): void {
  for (const key of ['baseDecimals', 'quoteDecimals', 'tickSize', 'lotSize', 'minQuantity', 'stopDeposit'] as const) c.require(snapshot.market![key] === market[key], `${path}.market.${key}`, 'does not match doctor-verified market parameters');
}
function blockNotBefore(c: Checks, later: EvidenceBlock, earlier: EvidenceBlock, path: string): void {
  c.require(BigInt(later.number) >= BigInt(earlier.number) && time(later.timestamp) >= time(earlier.timestamp), path, 'observation/readback precedes the relevant receipt or observation');
  if (later.number === earlier.number) c.require(same(later.hash, earlier.hash) && later.timestamp === earlier.timestamp, path, 'same block number has conflicting hash/time');
}
const snapshotBlock = (s: Snapshot): EvidenceBlock => ({ number: s.market!.observedBlock, hash: s.market!.blockHash!, timestamp: s.market!.observedAt });

function validateDoctor(c: Checks, value: unknown, id: EvidenceIdentity, provenance: EvidenceProvenance): Record<string, unknown> | null {
  const start = c.errors.length; const d = c.object(value, 'doctor'); if (!d) return null;
  c.require(d.schemaVersion === 1 && d.artifactType === 'dreamshield-readonly-doctor', 'doctor', 'expected versioned read-only doctor, not a historical manifest');
  c.require(d.readonlyResult === 'PASS' && d.g0Complete === true && d.exitCode === 0, 'doctor', 'accepted G0 owner result is required');
  c.require(d.readOnly === true && d.signingRequested === false && d.transactionsSent === 0, 'doctor', 'doctor must attest its read-only/no-sign/no-send scope');
  c.require(timestamp(d.startedAt) && timestamp(d.completedAt) && time(d.startedAt as string) <= time(d.completedAt as string), 'doctor', 'valid start/completion chronology is required');
  const statuses = c.object(d.statuses, 'doctor.statuses');
  if (statuses) c.require(statuses.transport === 'PASS' && statuses.market === 'PASS' && statuses.owner === 'COMPLETE', 'doctor.statuses', 'transport, verified market and complete owner reads are required');
  c.require(d.successScope === 'transport-market-and-owner', 'doctor.successScope', 'market-only diagnosis cannot establish G1 owner acceptance');
  c.require(d.ownerConfigured === true && typeof d.poolConfigured === 'boolean', 'doctor', 'configured owner and explicit pool-selection configuration are required');
  c.require(Array.isArray(d.blockers) && d.blockers.length === 0, 'doctor.blockers', 'required doctor checks must have no blockers');
  const required = c.array(d.requiredChecks, 'doctor.requiredChecks'); const names = new Set<string>();
  if (required) {
    c.require(required.length > 0, 'doctor.requiredChecks', 'required checks cannot be empty');
    for (const [i, raw] of required.entries()) {
      const check = c.object(raw, `doctor.requiredChecks[${i}]`); if (!check) continue;
      c.require(nonempty(check.name) && !names.has(String(check.name)) && check.status === 'passed', `doctor.requiredChecks[${i}]`, 'each distinct required check must pass'); names.add(String(check.name));
    }
    const mandatory = ['versions', 'sourceIdentity', 'protocolSetup', 'httpSetup', 'http', 'websocketSetup', 'websocket', 'systemBytecode', 'sdkSetup', 'sdkSystemConfig', 'httpSystemConfigAtBlock', 'genesisBlock1', 'marketVerification', 'genesisValidation', 'websocketCleanup', 'sdkCleanup', 'execution', 'artifactPersistence', 'ownerSnapshot'];
    if (d.poolConfigured === false) mandatory.push('marketDiscovery');
    for (const name of mandatory) c.require(names.has(name), 'doctor.requiredChecks', `missing required ${name} check`);
  }
  const identity = c.object(d.identity, 'doctor.identity');
  if (identity) for (const key of ['chainId', 'genesisHash', 'owner', 'pool', 'marginBank', 'stopRegistry'] as const) c.require(key === 'chainId' ? identity[key] === id[key] : same(identity[key], id[key]), `doctor.identity.${key}`, 'does not match lifecycle identity');
  const source = c.object(d.source, 'doctor.source');
  if (source) c.require(same(source.commit, provenance.source.commit) && nonempty(source.verifier), 'doctor.source', 'doctor must identify the same captured source commit and its verifier');
  const versions = c.object(d.versions, 'doctor.versions');
  if (versions) {
    for (const key of ['node', 'sdk', 'viem'] as const) c.require(versions[key] === provenance.versions[key], `doctor.versions.${key}`, 'does not match lifecycle version');
    c.require(same(versions.lockSha256, provenance.lockSha256), 'doctor.versions.lockSha256', 'does not match lifecycle lockfile digest');
  }
  const market = c.object(d.selectedMarket, 'doctor.selectedMarket');
  if (market) {
    c.require(market.chainId === 50383 && same(market.genesisHash, id.genesisHash) && same(market.pool, id.pool) && same(market.marginBank, id.marginBank) && same(market.stopRegistry, id.stopRegistry), 'doctor.selectedMarket', 'verified market identity differs from lifecycle');
    c.require(market.selectionSource === 'configured' || market.selectionSource === 'discovery', 'doctor.selectedMarket.selectionSource', 'verified market selection source is required');
    c.require(timestamp(market.observedAt) && atomic(market.observedBlock) && typeof market.blockHash === 'string' && hash.test(market.blockHash) && market.feedValid === true, 'doctor.selectedMarket', 'valid pinned market/mark observation is required');
    for (const key of ['mark', 'tickSize', 'lotSize', 'minQuantity'] as const) c.require(atomic(market[key]) && BigInt(market[key] as string) > 0n, `doctor.selectedMarket.${key}`, 'expected positive canonical atomic parameter');
    c.require(atomic(market.stopDeposit), 'doctor.selectedMarket.stopDeposit', 'verified native registry deposit is required');
    for (const key of ['baseDecimals', 'quoteDecimals'] as const) c.require(Number.isInteger(market[key]) && Number(market[key]) >= 0 && Number(market[key]) <= 255, `doctor.selectedMarket.${key}`, 'invalid decimals');
    if (timestamp(market.observedAt) && timestamp(d.completedAt)) c.require(time(market.observedAt) <= time(d.completedAt) + 1000 && time(d.completedAt) - time(market.observedAt) < FRESHNESS_MS, 'doctor.selectedMarket.observedAt', 'doctor market was stale/future at its own completion time');
  }
  return start === c.errors.length ? d : null;
}

function validateOpening(c: Checks, observation: EvidenceObservation): OpeningEvidenceProof | null {
  const path = 'lifecycle.opening'; const start = c.errors.length; const raw = c.object(observation.opening, path); if (!raw) return null;
  const id = observation.identity; const snapshot = observation.snapshot;
  const transaction = c.transaction(raw.transaction, raw.receipt, path, id, id.pool);
  const orderRead = c.read(raw.order, `${path}.order`, (value, p) => {
    const before = c.errors.length; const o = c.object(value, p); if (!o) return null;
    c.require(nonempty(o.decoder), `${p}.decoder`, 'official pinned ABI decoder identity is required');
    c.require(same(o.owner, id.owner) && same(o.pool, id.pool) && typeof o.isBid === 'boolean', p, 'opening order must bind owner/pool/side');
    for (const key of ['requestedQuantity', 'filledQuantity', 'remainingQuantity', 'orderId'] as const) c.require(atomic(o[key]), `${p}.${key}`, 'expected canonical unsigned atomic value');
    const fills = c.array(o.fills, `${p}.fills`); const indices = new Set<number>();
    if (fills) {
      c.require(fills.length > 0, `${p}.fills`, 'receipt alone is not an opening fill');
      for (const [i, value] of fills.entries()) {
        const fill = c.object(value, `${p}.fills[${i}]`); if (!fill) continue;
        c.require(same(fill.owner, id.owner) && same(fill.pool, id.pool) && fill.orderId === o.orderId && atomic(fill.quantity) && BigInt(fill.quantity as string) > 0n, `${p}.fills[${i}]`, 'fill owner/pool/order/quantity mismatch');
        c.require(typeof fill.transactionHash === 'string' && hash.test(fill.transactionHash) && Number.isSafeInteger(fill.logIndex) && Number(fill.logIndex) >= 0 && !indices.has(Number(fill.logIndex)), `${p}.fills[${i}]`, 'fill transaction and distinct raw log index required'); indices.add(Number(fill.logIndex));
      }
    }
    return before === c.errors.length ? value as OpeningOrderProof : null;
  });
  const positionRead = c.read(raw.position, `${path}.position`, (value, p) => c.position(value, p, id));
  if (!transaction || !orderRead || orderRead.status !== 'known' || !positionRead || positionRead.status !== 'known' || start !== c.errors.length) return null;
  const { receipt, transaction: tx } = transaction; const order = orderRead.value; const position = positionRead.value;
  c.require(orderRead.block.number === receipt.block.number && same(orderRead.block.hash, receipt.block.hash) && orderRead.block.timestamp === receipt.block.timestamp, `${path}.order`, 'decoded receipt proof must bind receipt block');
  c.require(positionRead.block.number === receipt.block.number && same(positionRead.block.hash, receipt.block.hash) && positionRead.block.timestamp === receipt.block.timestamp && position.observedBlock === receipt.block.number && position.observedAt === receipt.block.timestamp, `${path}.position`, 'opening position must be independently pinned at the receipt block');
  blockNotBefore(c, snapshotBlock(snapshot), receipt.block, `${path}.snapshot`);
  c.require(time(snapshot.capturedAt) >= time(receipt.block.timestamp), path, 'opening snapshot precedes its receipt');
  c.require(position.signedSize === snapshot.position!.signedSize && position.entryPrice === snapshot.position!.entryPrice && BigInt(position.signedSize) !== 0n, path, 'opening requires the supplied owner/pool nonzero resulting position');
  c.require(BigInt(position.signedSize) === (order.isBid ? BigInt(order.filledQuantity) : -BigInt(order.filledQuantity)), path, 'opening fill side/quantity must establish the isolated resulting position');
  c.require(BigInt(order.requestedQuantity) > 0n && BigInt(order.filledQuantity) > 0n && BigInt(order.requestedQuantity) === BigInt(order.filledQuantity) + BigInt(order.remainingQuantity), path, 'requested/filled/remaining opening quantities do not reconcile');
  c.require(BigInt(order.requestedQuantity) >= BigInt(snapshot.market!.minQuantity) && BigInt(order.requestedQuantity) % BigInt(snapshot.market!.lotSize) === 0n, path, 'opening size violates verified minimum quantity/lot grid');
  c.require(order.fills.reduce((sum, fill) => sum + BigInt(fill.quantity), 0n) === BigInt(order.filledQuantity), `${path}.order.fills`, 'decoded fill quantities do not reconcile');
  c.require(tx.value === '0', `${path}.transaction.value`, 'direct perps opening is nonpayable');
  let openingParameters: { userData: bigint; price: bigint; expiry: bigint } | null = null;
  try {
    const decoded = decodeFunctionData({ abi: perpPoolWriteAbi, data: tx.input as Hex });
    c.require(decoded.functionName === 'placeOrder', `${path}.transaction.input`, 'only the official direct EOA placeOrder opening is supported');
    if (decoded.functionName === 'placeOrder') {
      c.require(decoded.args[0] === order.isBid && decoded.args[3].toString() === order.requestedQuantity, `${path}.transaction.input`, 'opening calldata side/quantity differs from decoded order');
      c.require(decoded.args[5] <= 3 && decoded.args[6] <= 1, `${path}.transaction.input`, 'unsupported opening order type or self-matching operator');
      c.require(same(encodeFunctionData({ abi: perpPoolWriteAbi, functionName: 'placeOrder', args: decoded.args }), tx.input), `${path}.transaction.input`, 'noncanonical or trailing opening calldata');
      openingParameters = { userData: decoded.args[1], price: decoded.args[2], expiry: decoded.args[4] };
    }
  } catch { c.require(false, `${path}.transaction.input`, 'cannot decode exact opening call with pinned official ABI'); }
  let placed = 0;
  const fills = new Map<number, { quantity: string; remaining: string }>();
  const positionEvents: { logIndex: number; size: string; entry: string }[] = [];
  for (const log of receipt.logs) {
    if (same(log.address, id.pool)) try {
      const decoded = decodeEventLog({ abi: orderBookEventsAbi, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
      if (decoded.eventName === 'OrderPlaced') {
        const p = decoded.args.placedOrder;
        c.require(decoded.args.orderId.toString() === order.orderId, `${path}.receipt.logs[${log.logIndex}]`, 'official OrderPlaced event has a different opening order identity');
        c.require(same(p.owner, id.owner) && p.orderId.toString() === order.orderId && p.isBid === order.isBid && p.fullQuantity.toString() === order.requestedQuantity && p.quantityRemaining <= BigInt(order.requestedQuantity) && p.userData === openingParameters?.userData && p.price === openingParameters?.price && p.expireTimestampNs === openingParameters?.expiry, `${path}.receipt.logs[${log.logIndex}]`, 'official OrderPlaced owner/order/side/parameters differ from exact opening call');
        placed++;
      }
      if (decoded.eventName === 'OrderFilled' && decoded.args.takerOrderId.toString() === order.orderId) {
        c.require(decoded.args.fillPrice > 0n, `${path}.receipt.logs[${log.logIndex}]`, 'official opening fill price must be positive');
        fills.set(log.logIndex, { quantity: decoded.args.quantityFilled.toString(), remaining: decoded.args.takerRemainingQuantity.toString() });
      }
    } catch { /* Unrelated receipt events are not opening proof. */ }
    if (same(log.address, id.marginBank)) try {
      const decoded = decodeEventLog({ abi: marginBankEventsAbi, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
      if (decoded.eventName === 'PositionUpdated' && same(decoded.args.account, id.owner) && same(decoded.args.perpPool, id.pool)) positionEvents.push({ logIndex: log.logIndex, size: decoded.args.newSize.toString(), entry: decoded.args.avgEntryPrice.toString() });
    } catch { /* Unrelated bank events cannot establish owner position. */ }
  }
  c.require(placed === 1, `${path}.receipt.logs`, 'exactly one owner-bound official OrderPlaced event is required');
  c.require(fills.size === order.fills.length && fills.size > 0, `${path}.order.fills`, 'raw official fill events are missing, extra or misclassified');
  for (const fill of order.fills) c.require(same(fill.transactionHash, tx.hash) && fills.get(fill.logIndex)?.quantity === fill.quantity, `${path}.order.fills[${fill.logIndex}]`, 'decoded fill does not bind exact transaction/raw event');
  let remaining = BigInt(order.requestedQuantity);
  for (const [logIndex, fill] of [...fills.entries()].sort(([a], [b]) => a - b)) {
    remaining -= BigInt(fill.quantity);
    c.require(BigInt(fill.quantity) > 0n && remaining >= 0n && remaining.toString() === fill.remaining, `${path}.receipt.logs[${logIndex}]`, 'official fills violate running requested/filled/remaining conservation');
  }
  c.require(remaining.toString() === order.remainingQuantity, `${path}.order.remainingQuantity`, 'last official fill remaining quantity differs');
  const finalPosition = positionEvents.sort((a, b) => a.logIndex - b.logIndex).at(-1);
  c.require(finalPosition?.size === position.signedSize && finalPosition?.entry === position.entryPrice, `${path}.position`, 'owner/pool PositionUpdated event must match independent receipt-block position read');
  return start === c.errors.length ? observation.opening! : null;
}

function draftShape(c: Checks, value: unknown, path: string, id: EvidenceIdentity): RepairDraft | null {
  const start = c.errors.length; const d = c.object(value, path); if (!d) return null;
  c.require(d.chainId === 50383 && same(d.owner, id.owner) && same(d.pool, id.pool) && same(d.registry, id.stopRegistry), path, 'draft identity differs from lifecycle');
  c.require(d.action === 'create-sl' || d.action === 'cancel-stop', `${path}.action`, 'unsupported action');
  c.require(d.intent === 'reduceOnly' && typeof d.isBid === 'boolean' && (d.triggerOperator === 0 || d.triggerOperator === 1), path, 'native reduceOnly side/operator parameters are required');
  c.require(Number.isSafeInteger(d.revision) && Number(d.revision) > 0 && nonempty(d.fingerprint) && timestamp(d.createdAt), path, 'draft revision/fingerprint/creation time required');
  for (const key of ['observedBlock', 'triggerPrice', 'quantity', 'deposit'] as const) c.require(atomic(d[key]), `${path}.${key}`, 'expected canonical atomic anchor/parameter');
  c.require(d.action === 'create-sl' ? d.stopId === null : atomic(d.stopId), `${path}.stopId`, 'stop selection does not match action');
  return start === c.errors.length ? value as RepairDraft : null;
}
function stopMatchesDraft(c: Checks, stop: NativeStopSnapshot, draft: RepairDraft, stopId: string, path: string): void {
  c.require(stop.id === stopId && stop.intent === 'reduceOnly' && stop.status === 'pending' && stop.siblingId === null && stop.isBid === draft.isBid && stop.triggerOperator === draft.triggerOperator && stop.quantity === draft.quantity && stop.triggerPrice === draft.triggerPrice && stop.stopOrderType === 1 && stop.limitPrice === '0', path, 'native readback must match stop identity, intent, side, quantity mode, trigger, market type and no OCO linkage');
}
function validateOperation(c: Checks, value: unknown, path: string, id: EvidenceIdentity, market: Record<string, unknown>): EvidenceOperation | null {
  const start = c.errors.length; const row = c.object(value, path); if (!row) return null;
  const op = c.object(row.operation, `${path}.operation`); if (!op) return null;
  const d = draftShape(c, op.draft, `${path}.operation.draft`, id);
  c.require(nonempty(op.id) && nonempty(op.idempotencyKey) && same(op.owner, id.owner) && same(op.pool, id.pool), `${path}.operation`, 'operation ID/idempotency/owner/pool are required');
  c.require(timestamp(op.createdAt) && timestamp(op.updatedAt), `${path}.operation`, 'operation creation/update times required');
  if (op.state === 'Cancelled' && op.txHash === null && op.hashProvenance === undefined && row.proof === null && op.evidence === undefined) return start === c.errors.length ? value as EvidenceOperation : null;
  c.require(op.state === 'Applied' && op.error === null && op.hashProvenance === undefined, `${path}.operation`, 'only unambiguous original Applied operations can establish lifecycle actions');
  c.require(typeof op.txHash === 'string' && hash.test(op.txHash), `${path}.operation.txHash`, 'original transaction hash required');
  const proof = c.object(row.proof, `${path}.proof`); if (!proof || !d) return null;
  c.identity(proof.identity, `${path}.proof.identity`, id);
  let draftSnapshot: Snapshot | null = null;
  if (d.fingerprint.startsWith('snapshot-v1:')) {
    try { draftSnapshot = c.snapshot(JSON.parse(d.fingerprint.slice('snapshot-v1:'.length)), `${path}.operation.draft.sourceSnapshot`, id); }
    catch { c.require(false, `${path}.operation.draft.fingerprint`, 'canonical snapshot fingerprint contains invalid JSON'); }
  } else c.require(false, `${path}.operation.draft.fingerprint`, 'complete canonical snapshot-v1 source is required');
  if (draftSnapshot) {
    c.require(d.fingerprint === snapshotFingerprint(draftSnapshot) && d.observedBlock === draftSnapshot.market!.observedBlock, `${path}.operation.draft`, 'fingerprint/anchor must exactly bind the immutable source snapshot');
    sameConfiguration(c, draftSnapshot, market, `${path}.operation.draft.sourceSnapshot`);
    try { validateDraft(d, draftSnapshot, time(d.createdAt)); }
    catch (error) { c.require(false, `${path}.operation.draft`, `invalid or stale-at-draft source (${error instanceof Error ? error.message : String(error)})`); }
  }
  const intent = c.object(proof.intent, `${path}.proof.intent`);
  if (intent) c.require(intent.operationId === op.id && intent.idempotencyKey === op.idempotencyKey && intent.draftFingerprint === d.fingerprint && intent.draftRevision === d.revision && same(intent.txHash, op.txHash) && intent.hashProvenance === 'original', `${path}.proof.intent`, 'immutable operation/draft/transaction provenance binding differs or is recovered');
  const transaction = c.transaction(proof.transaction, proof.receipt, `${path}.proof`, id, id.stopRegistry);
  const snapshot = c.snapshot(proof.snapshot, `${path}.proof.snapshot`, id);
  if (snapshot) sameConfiguration(c, snapshot, market, `${path}.proof.snapshot`);
  c.require(timestamp(proof.reconciledAt), `${path}.proof.reconciledAt`, 'reconciliation timestamp required');
  const event = c.object(proof.event, `${path}.proof.event`);
  if (event) c.require(event.name === (d.action === 'create-sl' ? 'PendingOrderCreated' : 'PendingOrderCancelled') && same(event.address, id.stopRegistry) && atomic(event.orderId) && Number.isSafeInteger(event.logIndex) && Number(event.logIndex) >= 0, `${path}.proof.event`, 'decoded official event identity/type is invalid');
  const read = c.read(proof.nativeReadback, `${path}.proof.nativeReadback`, (value, p) => d.action === 'cancel-stop' && value === null ? null : c.stop(value, p, id));
  if (!transaction || !snapshot || !event || !read || read.status !== 'known' || start !== c.errors.length) return null;
  const { transaction: tx, receipt } = transaction;
  c.require(same(tx.hash, op.txHash), `${path}.proof.transaction.hash`, 'transaction does not match operation immutable hash');
  c.require(BigInt(receipt.block.number) > BigInt(d.observedBlock!) && time(receipt.block.timestamp) >= time(d.createdAt) && time(receipt.block.timestamp) >= time(op.createdAt as string), `${path}.proof.receipt`, 'transaction predates draft/operation anchor');
  c.require(time(op.createdAt as string) >= time(d.createdAt) && time(op.updatedAt as string) >= time(proof.reconciledAt as string) && time(proof.reconciledAt as string) >= time(snapshot.capturedAt) && time(snapshot.capturedAt) >= time(read.block.timestamp), path, 'operation, snapshot and reconciliation chronology is inconsistent');
  blockNotBefore(c, read.block, receipt.block, `${path}.proof.nativeReadback`);
  blockNotBefore(c, snapshotBlock(snapshot), read.block, `${path}.proof.snapshot`);
  try {
    const expected = d.action === 'cancel-stop'
      ? encodeFunctionData({ abi: transactionAbi, functionName: 'cancelPendingOrder', args: [BigInt(d.stopId!)] })
      : encodeFunctionData({ abi: transactionAbi, functionName: 'createPendingOrder', args: [{ order: { isBid: d.isBid, owner: d.owner as `0x${string}`, userData: 0n, quantity: BigInt(d.quantity) }, orderType: 1, triggerPrice: BigInt(d.triggerPrice), triggerOperator: d.triggerOperator, limitPrice: 0n, builder: zeroAddress as `0x${string}`, builderFeeBpsTimes1k: 0n }] });
    c.require(same(tx.input, expected) && tx.value === (d.action === 'cancel-stop' ? '0' : d.deposit), `${path}.proof.transaction`, 'exact calldata/value differs from immutable draft and pinned SDK defaults');
  } catch { c.require(false, `${path}.proof.transaction`, 'draft call is not encodable with pinned official ABI'); }
  const events = receipt.logs.flatMap(log => {
    if (!same(log.address, id.stopRegistry)) return [];
    try {
      const decoded = decodeEventLog({ abi: stopEventsAbi, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
      return decoded.eventName === event.name && 'orderId' in decoded.args && (d.action === 'create-sl' || decoded.args.orderId.toString() === event.orderId) ? [{ log, decoded }] : [];
    } catch { return []; }
  });
  c.require(events.length === 1 && events[0]?.log.logIndex === event.logIndex && 'orderId' in events[0].decoded.args && events[0].decoded.args.orderId.toString() === event.orderId, `${path}.proof.event`, 'decoded event must match exactly one unambiguous official raw receipt log');
  if (d.action === 'create-sl') {
    const decoded = events[0]?.decoded;
    if (decoded?.eventName === 'PendingOrderCreated') c.require(same(decoded.args.owner, id.owner) && decoded.args.isBid === d.isBid && decoded.args.quantity.toString() === d.quantity && decoded.args.triggerPrice.toString() === d.triggerPrice && decoded.args.triggerOperator === d.triggerOperator && decoded.args.orderType === 1 && same(decoded.args.builder, zeroAddress) && decoded.args.builderFeeBpsTimes1k === 0n, `${path}.proof.event`, 'official creation event parameters differ from exact draft');
    c.require(read.value !== null, `${path}.proof.nativeReadback`, 'created stop must independently exist');
    if (read.value) {
      c.require(read.value.observedBlock === read.block.number, `${path}.proof.nativeReadback`, 'stop readback block differs from read block');
      stopMatchesDraft(c, read.value, d, event.orderId as string, `${path}.proof.nativeReadback.value`);
    }
    const matched = snapshot.stops.find(s => s.id === event.orderId);
    c.require(!!matched, `${path}.proof.snapshot`, 'created stop is missing from later independent complete snapshot');
    if (matched) stopMatchesDraft(c, matched, d, event.orderId as string, `${path}.proof.snapshot.stop`);
    const assessment = assessProtection(snapshot, time(snapshot.capturedAt));
    c.require(assessment.verdict === 'VERIFIED' && assessment.stopIds.length === 1 && assessment.stopIds[0] === event.orderId, `${path}.proof.snapshot`, `recomputed native protection is not VERIFIED (${assessment.reasonCodes.join(',')})`);
  } else {
    c.require(event.orderId === d.stopId && read.value === null, `${path}.proof.nativeReadback`, 'selected cancellation requires direct absence of exactly the cancelled stop');
    c.require(!snapshot.stops.some(s => s.id === d.stopId || s.siblingId === d.stopId), `${path}.proof.snapshot`, 'cancelled stop or its sibling linkage is still present');
    const assessment = assessProtection(snapshot, time(snapshot.capturedAt));
    c.require(BigInt(snapshot.position!.signedSize) !== 0n && assessment.verdict === 'NEEDS_PROTECTION', `${path}.proof.snapshot`, 'selected cancellation must expose an actual nonzero protection gap, not merely stop absence');
  }
  return start === c.errors.length ? value as EvidenceOperation : null;
}

function validateResiduals(c: Checks, observation: EvidenceObservation): void {
  const path = 'lifecycle.residual'; const raw = c.object(observation.residuals, path); if (!raw) return;
  const id = observation.identity; const s = observation.snapshot;
  const position = c.read(raw.position, `${path}.position`, (value, p) => c.position(value, p, id));
  const stops = c.read(raw.nativeStops, `${path}.nativeStops`, (value, p) => {
    const start = c.errors.length; const rows = c.array(value, p); if (!rows) return null;
    rows.forEach((row, i) => c.stop(row, `${p}[${i}]`, id));
    return start === c.errors.length ? value as NativeStopSnapshot[] : null;
  });
  const orders = c.read(raw.restingOrders, `${path}.restingOrders`, (value, p) => {
    const start = c.errors.length; const rows = c.array(value, p); if (!rows) return null;
    const ids = new Set<string>();
    for (const [i, value] of rows.entries()) {
      const order = c.object(value, `${p}[${i}]`); if (!order) continue;
      c.require(atomic(order.id) && !ids.has(String(order.id)) && same(order.owner, id.owner) && same(order.pool, id.pool) && typeof order.isBid === 'boolean' && atomic(order.quantity) && BigInt(order.quantity as string) > 0n, `${p}[${i}]`, 'resting order identity/quantity must be complete, scoped and distinct'); ids.add(String(order.id));
    }
    return start === c.errors.length ? value as ResidualOrder[] : null;
  });
  for (const [name, read] of [['position', position], ['nativeStops', stops], ['restingOrders', orders]] as const) matchReadBlock(c, read, s, `${path}.${name}`);
  for (const name of ['walletStt', 'walletCollateral', 'bankUnlockedCollateral', 'bankLockedCollateral'] as const) {
    const read = c.read(raw[name], `${path}.${name}`, (value, p) => c.require(name === 'bankUnlockedCollateral' ? signedAtomic(value) : atomic(value), p, 'balance must be a canonical atomic string (unlocked bank collateral may be signed)') ? value as string : null);
    matchReadBlock(c, read, s, `${path}.${name}`);
  }
  if (position?.status === 'known' && stops?.status === 'known') c.require(snapshotFingerprint({ ...s, position: position.value, stops: stops.value }) === snapshotFingerprint(s), path, 'residual position/native stops differ from the complete pinned snapshot');
}

function bindDraft(c: Checks, op: EvidenceOperation, baseline: Snapshot, path: string, after: string): void {
  const draft = op.operation.draft;
  // validateOperation already checked the full canonical source and its freshness.
  const source = JSON.parse(draft.fingerprint.slice('snapshot-v1:'.length)) as Snapshot;
  c.require(time(draft.createdAt) >= time(after) && time(source.capturedAt) >= time(baseline.capturedAt) && time(source.capturedAt) <= time(draft.createdAt), `${path}.draft.createdAt`, 'fresh draft source/action predates its required observation or comes from the future');
  blockNotBefore(c, snapshotBlock(source), snapshotBlock(baseline), `${path}.draft.sourceSnapshot`);
  if (draft.action === 'cancel-stop') {
    const original = baseline.stops.find(s => s.id === draft.stopId);
    const selected = source.stops.find(s => s.id === draft.stopId);
    c.require(!!original && !!selected && assessProtection(source, time(draft.createdAt)).verdict === 'VERIFIED', `${path}.draft.sourceSnapshot`, 'selected initial stop must still be independently verified before cancellation');
    if (original && selected) c.require(original.owner === selected.owner && original.pool === selected.pool && original.registry === selected.registry && original.intent === selected.intent && original.isBid === selected.isBid && original.quantity === selected.quantity && original.triggerPrice === selected.triggerPrice && original.triggerOperator === selected.triggerOperator && original.stopOrderType === selected.stopOrderType && original.limitPrice === selected.limitPrice && original.siblingId === selected.siblingId, `${path}.draft.sourceSnapshot`, 'selected stop parameters differ from the originally verified stop');
  }
}

/**
 * Validate captured files only. Timestamps are evaluated at capture, not download.
 * Even CAPTURED_COMPLETE is historical: neither checksums nor supplied chain proofs
 * authenticate the file's origin or establish present on-chain protection.
 */
export function validateLiveEvidence(doctor: unknown, lifecycle: unknown): LiveEvidenceValidation {
  const c = new Checks(); let missing = false;
  const result = (): LiveEvidenceValidation => {
    const valid = c.errors.length === 0 && !c.replay;
    return { valid, errors: c.errors, status: missing ? 'MISSING' : c.replay ? 'HISTORICAL_OR_REPLAY' : valid ? 'CAPTURED_COMPLETE' : 'INVALID', eligibility: { realPerpsOrder: valid, nativeProtectionReadback: valid }, fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true };
  };
  if (doctor == null) { c.require(false, 'doctor', 'missing referenced doctor artifact'); missing = true; }
  if (lifecycle == null) { c.require(false, 'lifecycle', 'missing referenced lifecycle artifact'); missing = true; }
  if (missing) return result();
  try {
    const l = c.object(lifecycle, 'lifecycle'); if (!l) return result();
    if (l.mode === 'replay' || l.artifactType === 'dreamshield-replay' || l.artifactType === 'dreamshield-evidence-manifest') c.replay = true;
    if (l.mode !== undefined) c.require(l.mode === 'live-owner', 'lifecycle.mode', 'replay/read-only classification cannot establish live G1 acceptance');
    if (c.replay) c.require(false, 'lifecycle', 'historical/replay artifact cannot establish live G1 acceptance');
    c.require(l.schemaVersion === 1 && l.artifactType === 'dreamshield-g1-lifecycle', 'lifecycle', 'expected distinguishable dreamshield-g1-lifecycle schemaVersion 1');
    c.require(nonempty(l.lifecycleId), 'lifecycle.lifecycleId', 'immutable lifecycle ID is required');
    const id = c.identity(l.identity, 'lifecycle.identity'); const provenance = c.provenance(l.provenance, 'lifecycle.provenance');
    if (!id || !provenance) return result();
    const d = validateDoctor(c, doctor, id, provenance); const market = d?.selectedMarket as Record<string, unknown> | undefined;
    const rawObservations = c.array(l.observations, 'lifecycle.observations'); const observations: EvidenceObservation[] = [];
    const ids = new Set<string>();
    if (rawObservations) for (const [i, value] of rawObservations.entries()) {
      const path = `lifecycle.observations[${i}]`; const start = c.errors.length; const o = c.object(value, path); if (!o) continue;
      c.require(nonempty(o.id) && !ids.has(String(o.id)), `${path}.id`, 'observation IDs must be nonempty and distinct'); ids.add(String(o.id));
      c.require(o.lifecycleId === l.lifecycleId, `${path}.lifecycleId`, 'observation belongs to a different lifecycle');
      c.require(['opening', 'missing-sl', 'gap', 'residual'].includes(String(o.kind)), `${path}.kind`, 'unsupported observation kind');
      c.identity(o.identity, `${path}.identity`, id); const p = c.provenance(o.provenance, `${path}.provenance`, provenance);
      const snapshot = c.snapshot(o.snapshot, `${path}.snapshot`, id, p?.capturedAt);
      if (snapshot && market) sameConfiguration(c, snapshot, market, `${path}.snapshot`);
      c.require(o.kind === 'opening' ? record(o.opening) && o.residuals === undefined : o.kind === 'residual' ? record(o.residuals) && o.opening === undefined : o.opening === undefined && o.residuals === undefined, path, 'opening/residual proofs must be attached only to their respective observations');
      if (start === c.errors.length) observations.push(value as EvidenceObservation);
    }
    const stages = ['opening', 'missing-sl', 'gap', 'residual'] as const;
    for (const kind of stages) c.require(observations.filter(o => o.kind === kind).length === 1, `lifecycle.${kind}`, 'exactly one complete observation is required');
    c.require(rawObservations?.length === 4 && observations.every((o, i) => o.kind === stages[i]), 'lifecycle.observations', 'immutable observations must be ordered opening, missing-sl, gap, residual');
    const [opening, missingSl, gap, residual] = observations;
    if (!opening || !missingSl || !gap || !residual || observations.length !== 4) return result();
    for (let i = 1; i < observations.length; i++) {
      const previous = observations[i - 1]!; const current = observations[i]!;
      c.require(time(current.provenance.capturedAt) > time(previous.provenance.capturedAt), `lifecycle.${current.kind}`, 'observation capture times must be strictly chronological');
      blockNotBefore(c, snapshotBlock(current.snapshot), snapshotBlock(previous.snapshot), `lifecycle.${current.kind}.snapshot`);
    }
    c.require(time(provenance.capturedAt) >= time(residual.provenance.capturedAt), 'lifecycle.provenance.capturedAt', 'export capture time precedes its observations');
    if (d && market) {
      c.require(time(d.completedAt as string) <= time(opening.provenance.capturedAt), 'doctor.completedAt', 'doctor acceptance must precede lifecycle capture');
      blockNotBefore(c, snapshotBlock(opening.snapshot), { number: market.observedBlock as string, hash: market.blockHash as string, timestamp: market.observedAt as string }, 'lifecycle.opening.snapshot');
    }
    const openingProof = validateOpening(c, opening);
    if (openingProof && d && market) {
      c.require(time(openingProof.receipt.block.timestamp) >= time(d.completedAt as string), 'lifecycle.opening.receipt', 'supplied opening transaction predates doctor acceptance');
      blockNotBefore(c, openingProof.receipt.block, { number: market.observedBlock as string, hash: market.blockHash as string, timestamp: market.observedAt as string }, 'lifecycle.opening.receipt');
    }
    for (const observation of [missingSl, gap]) {
      const assessment = assessProtection(observation.snapshot, time(observation.provenance.capturedAt));
      c.require(BigInt(observation.snapshot.position!.signedSize) !== 0n && assessment.verdict === 'NEEDS_PROTECTION', `lifecycle.${observation.kind}`, `nonzero exposure and recomputed NEEDS_PROTECTION required (${assessment.verdict}:${assessment.reasonCodes.join(',')})`);
    }
    validateResiduals(c, residual);
    const rawOperations = c.array(l.operations, 'lifecycle.operations'); const operations: EvidenceOperation[] = [];
    if (rawOperations && market) for (const [i, value] of rawOperations.entries()) {
      const op = validateOperation(c, value, `lifecycle.operations[${i}]`, id, market); if (op && op.operation.state !== 'Cancelled') operations.push(op);
    }
    const uniqueIds = new Set<string>(); const keys = new Set<string>(); const txHashes = new Set<string>();
    if (opening.opening) txHashes.add(opening.opening.transaction.hash.toLowerCase());
    for (const [i, row] of (rawOperations ?? []).entries()) {
      if (!record(row) || !record(row.operation)) continue;
      const op = row.operation;
      c.require(nonempty(op.id) && !uniqueIds.has(String(op.id)) && nonempty(op.idempotencyKey) && !keys.has(String(op.idempotencyKey)), `lifecycle.operations[${i}]`, 'operation IDs/idempotency keys must be distinct'); uniqueIds.add(String(op.id)); keys.add(String(op.idempotencyKey));
      if (typeof op.txHash === 'string') { c.require(!txHashes.has(op.txHash.toLowerCase()), `lifecycle.operations[${i}].txHash`, 'opening/initial/cancel/replacement must use distinct transactions'); txHashes.add(op.txHash.toLowerCase()); }
    }
    c.require(operations.length === 3, 'lifecycle.operations', 'exactly three proven sent actions (initial SL, selected cancel, replacement SL) are required; unsigned cancelled drafts are not actions');
    const initial = operations.filter(o => o.operation.draft.action === 'create-sl' && time(o.operation.draft.createdAt) >= time(missingSl.provenance.capturedAt) && time(o.operation.draft.createdAt) < time(gap.provenance.capturedAt));
    const replacement = operations.filter(o => o.operation.draft.action === 'create-sl' && time(o.operation.draft.createdAt) >= time(gap.provenance.capturedAt));
    c.require(initial.length === 1 && replacement.length === 1 && initial[0] !== replacement[0], 'lifecycle.operations', 'initial/replacement actions must follow the distinct missing-SL/gap observations');
    if (initial.length !== 1 || replacement.length !== 1) return result();
    const first = initial[0]!; const last = replacement[0]!;
    const cancellations = operations.filter(o => o.operation.draft.action === 'cancel-stop' && o.operation.draft.stopId === first.proof!.event.orderId);
    c.require(cancellations.length === 1, 'lifecycle.cancel', 'selected cancellation must bind the initial verified native stop');
    if (cancellations.length !== 1) return result();
    const cancel = cancellations[0]!;
    bindDraft(c, first, missingSl.snapshot, 'lifecycle.initial', missingSl.provenance.capturedAt);
    bindDraft(c, cancel, first.proof!.snapshot, 'lifecycle.cancel', first.proof!.reconciledAt);
    bindDraft(c, last, gap.snapshot, 'lifecycle.replacement', gap.provenance.capturedAt);
    c.require(first.proof!.event.orderId !== last.proof!.event.orderId, 'lifecycle.replacement', 'replacement must have a distinct native stop ID');
    c.require(time(gap.provenance.capturedAt) >= time(cancel.proof!.reconciledAt), 'lifecycle.gap', 'gap capture precedes cancellation reconciliation');
    blockNotBefore(c, snapshotBlock(gap.snapshot), snapshotBlock(cancel.proof!.snapshot), 'lifecycle.gap.snapshot');
    c.require(!gap.snapshot.stops.some(s => s.id === first.proof!.event.orderId || s.siblingId === first.proof!.event.orderId), 'lifecycle.gap', 'selected cancelled stop/linkage still appears in gap observation');
    c.require(time(residual.provenance.capturedAt) >= time(last.proof!.reconciledAt), 'lifecycle.residual', 'residual capture precedes replacement reconciliation');
    blockNotBefore(c, snapshotBlock(residual.snapshot), snapshotBlock(last.proof!.snapshot), 'lifecycle.residual.snapshot');
    return result();
  } catch (error) {
    c.require(false, 'evidence', `malformed input cannot be validated (${error instanceof Error ? error.message : String(error)})`);
    return result();
  }
}
