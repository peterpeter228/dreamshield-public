import type { Assessment, NativeStopSnapshot, Operation, OperationState, RepairDraft, Snapshot } from './types.js';
export * from './types.js';
export const FRESHNESS_MS = 15_000;
const integer = /^(0|[1-9]\d*)$/;
const signedInteger = /^-?(0|[1-9]\d*)$/;
const address = /^0x[0-9a-fA-F]{40}$/;
const equalAddress = (a: string, b: string) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const abs = (n: bigint) => n < 0n ? -n : n;
function decimalsValid(decimals: number): void { if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('INVALID_DECIMALS'); }
/** Exact, non-exponent decimal conversion. Never rounds an unrepresentable value. */
export function parseAtomic(value: string, decimals: number): bigint {
  decimalsValid(decimals);
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error('INVALID_DECIMAL');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  if (fraction.length > decimals) throw new Error('EXCESS_PRECISION');
  const raw = BigInt(whole!) * 10n ** BigInt(decimals) + BigInt((fraction.padEnd(decimals, '0')) || '0');
  return negative ? -raw : raw;
}
export function formatAtomic(value: bigint | string, decimals: number): string {
  decimalsValid(decimals);
  if (typeof value === 'string' && !signedInteger.test(value)) throw new Error('INVALID_ATOMIC');
  const raw = BigInt(value); const digits = abs(raw).toString().padStart(decimals + 1, '0');
  const body = decimals === 0 ? digits : `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`.replace(/\.?0+$/, '');
  return `${raw < 0n ? '-' : ''}${body}`;
}
export function floorGrid(value: bigint, grid: bigint): bigint { if (value < 0n || grid <= 0n) throw new Error('INVALID_GRID'); return value / grid * grid; }
export function ceilGrid(value: bigint, grid: bigint): bigint { if (value < 0n || grid <= 0n) throw new Error('INVALID_GRID'); return (value + grid - 1n) / grid * grid; }
function invalidSnapshot(s: Snapshot, now: number): string | null {
  if (!Number.isFinite(now)) return 'INVALID_CLOCK';
  if (s.readError) return 'READ_FAILED';
  if (!s.market || !s.position) return 'MISSING_SNAPSHOT';
  const m = s.market; const p = s.position;
  if (m.chainId !== 50383 || p.chainId !== m.chainId || !equalAddress(p.pool, m.pool)) return 'IDENTITY_MISMATCH';
  if (![m.pool, m.marginBank, m.stopRegistry, p.owner, p.pool].every(a => address.test(a))) return 'INVALID_IDENTITY';
  if (!s.complete || s.scope !== 'indexedSnapshot') return 'INCOMPLETE_DISCOVERY';
  if (!m.feedValid) return 'MARK_UNAVAILABLE';
  for (const time of [s.capturedAt, m.observedAt, p.observedAt]) {
    const t = Date.parse(time);
    if (!Number.isFinite(t) || t > now + 1_000) return 'INVALID_OBSERVATION_TIME';
    if (now - t >= FRESHNESS_MS) return 'STALE_DATA';
  }
  if (!signedInteger.test(p.signedSize) || !integer.test(p.entryPrice) || !integer.test(m.mark) || BigInt(m.mark) <= 0n || !integer.test(m.tickSize) || BigInt(m.tickSize) <= 0n || !integer.test(m.lotSize) || BigInt(m.lotSize) <= 0n || !integer.test(m.minQuantity) || !integer.test(m.observedBlock) || !integer.test(p.observedBlock)) return 'INVALID_NUMERIC_DATA';
  if (m.observedBlock !== p.observedBlock) return 'INCONSISTENT_BLOCKS';
  if (![m.baseDecimals, m.quoteDecimals].every(d => Number.isInteger(d) && d >= 0 && d <= 255)) return 'INVALID_DECIMALS';
  if (s.mode !== 'replay' && p.source !== 'chain') return 'FIXTURE_IN_LIVE_MODE';
  return null;
}
function validStop(n: NativeStopSnapshot, s: Snapshot): boolean {
  const m = s.market!; const p = s.position!;
  return ['reduceOnly','opening'].includes(n.intent) && ['pending','filled','cancelled','dropped','unknown'].includes(n.status) && (n.siblingId === null || integer.test(n.siblingId)) && integer.test(n.id) && integer.test(n.quantity) && integer.test(n.triggerPrice) && BigInt(n.triggerPrice) > 0n && BigInt(n.triggerPrice) % BigInt(m.tickSize) === 0n && integer.test(n.limitPrice) && (n.stopOrderType === 0 ? BigInt(n.limitPrice) > 0n && BigInt(n.limitPrice) % BigInt(m.tickSize) === 0n : n.stopOrderType === 1 && n.limitPrice === '0') && (n.triggerOperator === 0 || n.triggerOperator === 1) && typeof n.isBid === 'boolean' && equalAddress(n.owner, p.owner) && equalAddress(n.pool, m.pool) && equalAddress(n.registry, m.stopRegistry) && n.observedBlock === m.observedBlock;
}
export function assessProtection(snapshot: Snapshot, now: number = Date.now()): Assessment {
  const checkedAt = new Date(Number.isFinite(now) ? now : 0).toISOString();
  const times = [snapshot.capturedAt, snapshot.market?.observedAt, snapshot.position?.observedAt].map(t => t ? Date.parse(t) : NaN).filter(Number.isFinite);
  const expiresAt = new Date(times.length ? Math.min(...times) + FRESHNESS_MS : 0).toISOString();
  const result = (verdict: Assessment['verdict'], reasonCodes: string[], summary: string, coverageMode: Assessment['coverageMode'] = 'unknown', coveredRaw: string | null = null, stopIds: string[] = []): Assessment => ({ verdict, reasonCodes, summary, coverageMode, coveredRaw, stopIds, checkedAt, expiresAt, scope: snapshot.scope });
  const invalid = invalidSnapshot(snapshot, now);
  if (invalid) return result('UNKNOWN', [invalid], 'Current protection cannot be verified. Previous observations are historical.');
  const m = snapshot.market!; const p = snapshot.position!; const size = BigInt(p.signedSize);
  if (new Set(snapshot.stops.map(n => n.id)).size !== snapshot.stops.length) return result('UNKNOWN', ['DUPLICATE_STOP_IDS'], 'Stop discovery returned ambiguous duplicate IDs.');
  if (snapshot.stops.some(n => !validStop(n, snapshot))) return result('UNKNOWN', ['INVALID_STOP_DATA'], 'Stop identity, parameters or observation blocks do not match.');
  if (snapshot.stops.some(n => n.status === 'unknown')) return result('UNKNOWN', ['STOP_STATUS_UNKNOWN'], 'A discovered stop has an unknown lifecycle state.');
  const pending = snapshot.stops.filter(n => n.status === 'pending');
  if (size === 0n) return result('NO_POSITION', pending.length ? ['NO_POSITION', 'RESIDUAL_STOPS'] : ['NO_POSITION'], pending.length ? 'No current position. Pending stops remain and need review before reopening.' : 'No current position was observed.', 'none', '0', pending.map(n => n.id));
  const long = size > 0n;
  const candidates = pending.filter(n => n.intent === 'reduceOnly' && n.isBid === !long && n.triggerOperator === (long ? 1 : 0));
  if (!candidates.length) {
    const reasonCodes = ['NO_MATCHING_SL'];
    if (pending.length && pending.every(n => n.intent === 'reduceOnly' && n.isBid === !long && n.triggerOperator === (long ? 0 : 1) && (long ? BigInt(n.triggerPrice) > BigInt(m.mark) : BigInt(n.triggerPrice) < BigInt(m.mark)))) reasonCodes.push('TAKE_PROFIT_ONLY');
    if (pending.some(n => n.intent === 'reduceOnly' && n.isBid === long && n.triggerOperator === (long ? 0 : 1))) reasonCodes.push('WRONG_SIDE_SL');
    return result('NEEDS_PROTECTION', reasonCodes, 'No matching native reduce-only stop-loss was found in this complete snapshot.', 'none', '0');
  }
  if (candidates.some(n => long ? BigInt(m.mark) <= BigInt(n.triggerPrice) : BigInt(m.mark) >= BigInt(n.triggerPrice))) return result('NEEDS_REVIEW', ['TRIGGER_CONDITION_MET'], 'A stop condition is met. Execution and remaining exposure must be reconciled.', 'unknown', null, candidates.map(n => n.id));
  if (candidates.length > 1) return result('NEEDS_REVIEW', ['MULTIPLE_SL_LAYOUT'], 'Multiple stop-loss orders require review; their quantities are not summed.', 'unknown', null, candidates.map(n => n.id));
  const stop = candidates[0]!;
  const quantity = BigInt(stop.quantity); const whole = quantity === 0n; const covered = whole ? abs(size) : quantity < abs(size) ? quantity : abs(size);
  const mode = whole ? 'whole-at-trigger' : 'fixed';
  if (stop.siblingId !== null) {
    const sibling = pending.find(n => n.id === stop.siblingId);
    if (!sibling || sibling.id === stop.id || sibling.siblingId !== stop.id || sibling.intent !== 'reduceOnly' || sibling.isBid !== stop.isBid || sibling.triggerOperator === stop.triggerOperator || (long ? BigInt(sibling.triggerPrice) <= BigInt(m.mark) : BigInt(sibling.triggerPrice) >= BigInt(m.mark))) return result('NEEDS_REVIEW', ['OCO_LINK_INVALID'], 'A stop-loss exists, but the paired protection is missing, inconsistent or already at its trigger.', mode, covered.toString(), [stop.id]);
  }
  if (covered < abs(size)) return result('NEEDS_REVIEW', ['PARTIAL_COVERAGE'], 'The fixed stop quantity does not cover the current observed position.', mode, covered.toString(), [stop.id]);
  return result('VERIFIED', [whole ? 'WHOLE_POSITION_AT_TRIGGER' : 'FIXED_COVERAGE', stop.siblingId ? 'OCO_LINK_MATCHED' : 'SL_ONLY', 'EXECUTION_NOT_GUARANTEED'], 'Native stop-loss configuration matches this observation. Triggering and fills are not guaranteed.', mode, covered.toString(), [stop.id]);
}
/** Exact canonical identity, not a cryptographic attestation. Kept complete to avoid hash collisions. */
export function snapshotFingerprint(snapshot: Snapshot): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,canonical(v)])) : value;
  return `snapshot-v1:${JSON.stringify(canonical(snapshot))}`;
}
export const fingerprintSnapshot = snapshotFingerprint;
export interface SlDraftInput { triggerPrice: string; revision?: number; quantity?: string; }
/** Input triggerPrice and quantity are human decimal strings; output is atomic. P0 only whole-position SL. */
export function createSlDraft(snapshot: Snapshot, input: SlDraftInput | string, now: number = Date.now()): RepairDraft {
  input = typeof input === 'string' ? {triggerPrice: input} : input;
  const assessment = assessProtection(snapshot, now);
  if (assessment.verdict !== 'NEEDS_PROTECTION') throw new Error(`REPAIR_NOT_ALLOWED:${assessment.reasonCodes.join(',')}`);
  const m = snapshot.market!; const p = snapshot.position!;
  if (m.stopDeposit === null || !integer.test(m.stopDeposit)) throw new Error('STOP_DEPOSIT_UNKNOWN');
  const revision = input.revision ?? 1;
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('INVALID_REVISION');
  const trigger = parseAtomic(input.triggerPrice, m.quoteDecimals);
  if (trigger <= 0n || trigger % BigInt(m.tickSize) !== 0n) throw new Error('TRIGGER_NOT_ON_TICK');
  const long = BigInt(p.signedSize) > 0n;
  if (long ? trigger >= BigInt(m.mark) : trigger <= BigInt(m.mark)) throw new Error('TRIGGER_ALREADY_MET');
  if (input.quantity !== undefined && parseAtomic(input.quantity, m.baseDecimals) !== 0n) throw new Error('P0_WHOLE_POSITION_ONLY');
  return { observedBlock:snapshot.market!.observedBlock, revision, fingerprint:snapshotFingerprint(snapshot), owner:p.owner, pool:p.pool, registry:m.stopRegistry, chainId:m.chainId, action:'create-sl', stopId:null, isBid:!long, triggerOperator:long ? 1 : 0, triggerPrice:trigger.toString(), quantity:'0', intent:'reduceOnly', deposit:m.stopDeposit, createdAt:new Date(now).toISOString() };
}
/** Cancel only one explicitly selected pending native stop; never clears an account. */
export function createCancelDraft(snapshot: Snapshot, stopId: string, revision = 1, now: number = Date.now()): RepairDraft {
  if (assessProtection(snapshot, now).verdict === 'UNKNOWN') throw new Error('CANCEL_SNAPSHOT_UNKNOWN');
  const n = snapshot.stops.find(s => s.id === stopId && s.status === 'pending');
  if (!n || n.intent !== 'reduceOnly' || !validStop(n, snapshot)) throw new Error('STOP_NOT_CANCELLABLE');
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('INVALID_REVISION');
  return { observedBlock:snapshot.market!.observedBlock, revision, fingerprint:snapshotFingerprint(snapshot), owner:n.owner, pool:n.pool, registry:n.registry, chainId:50383, action:'cancel-stop', stopId:n.id, isBid:n.isBid, triggerOperator:n.triggerOperator, triggerPrice:n.triggerPrice, quantity:n.quantity, intent:'reduceOnly', deposit:'0', createdAt:new Date(now).toISOString() };
}
export function validateDraft(draft: RepairDraft, snapshot: Snapshot, now: number = Date.now()): void {
  if (assessProtection(snapshot, now).verdict === 'UNKNOWN') throw new Error('DRAFT_SNAPSHOT_UNKNOWN');
  if (draft.fingerprint !== snapshotFingerprint(snapshot)) throw new Error('SNAPSHOT_CHANGED');
  const expected = draft.action === 'create-sl' ? createSlDraft(snapshot, {triggerPrice:formatAtomic(draft.triggerPrice,snapshot.market!.quoteDecimals), revision:draft.revision}, now) : draft.action === 'cancel-stop' && draft.stopId !== null ? createCancelDraft(snapshot,draft.stopId,draft.revision,now) : null;
  if (!expected) throw new Error('INVALID_ACTION');
  for (const key of ['owner','pool','registry','chainId','action','stopId','isBid','triggerOperator','triggerPrice','quantity','intent','deposit'] as const) if (expected[key] !== draft[key]) throw new Error(`DRAFT_MISMATCH:${key}`);
  const created = Date.parse(draft.createdAt);
  if (!Number.isFinite(created) || created > now + 1_000 || now-created >= FRESHNESS_MS) throw new Error('DRAFT_EXPIRED');
}
const transitions: Record<OperationState, readonly OperationState[]> = {
  Draft:['AwaitingSignature','Cancelled'], AwaitingSignature:['Submitted','Unknown','Cancelled'], Submitted:['Reconcile','Unknown'], Unknown:['Reconcile'], Reconcile:['Applied','NeedsReview','Failed','Unknown'], Applied:[], NeedsReview:['Reconcile'], Failed:[], Cancelled:[],
};
export function canTransition(from: OperationState, to: OperationState): boolean { return transitions[from]?.includes(to) ?? false; }
export function isInFlight(state: OperationState): boolean { return ['AwaitingSignature','Submitted','Unknown','Reconcile','NeedsReview'].includes(state); }
export function transitionOperation(operation: Operation, next: OperationState, update: { txHash?: string|null; error?: string|null; readBackVerified?: boolean; receiptFailed?: boolean; } = {}, now: number = Date.now()): Operation {
  if (!canTransition(operation.state,next)) throw new Error(`INVALID_TRANSITION:${operation.state}->${next}`);
  if (next === 'AwaitingSignature' && update.txHash != null) throw new Error('HASH_NOT_ALLOWED_BEFORE_WALLET_RESULT');
  const hash = update.txHash === undefined ? operation.txHash : update.txHash;
  if (hash !== null && !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('INVALID_TX_HASH');
  if (operation.txHash && hash !== operation.txHash) throw new Error('TX_HASH_IMMUTABLE');
  if (next === 'Cancelled' && hash) throw new Error('KNOWN_TRANSACTION_CANNOT_BE_CANCELLED');
  if (operation.hashProvenance === 'recovered' && (next === 'Applied' || next === 'Failed')) throw new Error('ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED');
  if ((next === 'Submitted' || next === 'Applied') && !hash) throw new Error('TX_HASH_REQUIRED');
  if (next === 'Applied' && update.readBackVerified !== true) throw new Error('READ_BACK_REQUIRED');
  if (next === 'Failed' && update.receiptFailed !== true) throw new Error('EXPLICIT_FAILURE_REQUIRED');
  return { ...operation, hashProvenance:operation.hashProvenance ?? (!operation.txHash && hash && next !== 'Submitted' ? 'recovered' : undefined), state:next, txHash:hash, error:update.error ?? null, updatedAt:new Date(now).toISOString() };
}
