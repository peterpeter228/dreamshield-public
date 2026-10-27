import { assessProtection, FRESHNESS_MS } from '../packages/domain/index.ts';
import type { MarketSnapshot, Snapshot } from '../packages/domain/types.ts';

export interface DoctorCheck {
  name: string;
  status: 'passed' | 'failed' | 'blocked';
  reason?: string;
}

export interface DoctorMarketIdentity {
  chainId: number;
  marginBank: string;
  genesisHash: string | null;
}

const address = /^0x[0-9a-fA-F]{40}$/;
const hash = /^0x[0-9a-fA-F]{64}$/;
const atomic = /^(0|[1-9]\d*)$/;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const nonzeroAddress = (value: string) => address.test(value) && !/^0x0{40}$/.test(value);
const positive = (value: string) => atomic.test(value) && BigInt(value) > 0n;

/** Completeness here is market-only. The protocol reader owns chain/genesis and contract-binding validation. */
export function doctorMarketProblems(snapshot: Snapshot, pool: string, expected: DoctorMarketIdentity, now: number): string[] {
  const problems: string[] = [];
  if (snapshot.mode !== 'live-readonly') problems.push('NOT_LIVE_READONLY');
  if (snapshot.readError && snapshot.readError !== 'OWNER_NOT_CONFIGURED') problems.push(snapshot.readError);
  const market = snapshot.market;
  if (!market) return [...problems, 'MARKET_NOT_VERIFIED'];
  if (market.chainId !== expected.chainId) problems.push('WRONG_CHAIN');
  if (!nonzeroAddress(market.pool) || !same(market.pool, pool)) problems.push('POOL_IDENTITY_MISMATCH');
  if (!nonzeroAddress(market.marginBank) || !same(market.marginBank, expected.marginBank)) problems.push('BANK_IDENTITY_MISMATCH');
  if (!nonzeroAddress(market.stopRegistry)) problems.push('REGISTRY_NOT_VERIFIED');
  if (!expected.genesisHash || !hash.test(expected.genesisHash) || !market.genesisHash || !same(market.genesisHash, expected.genesisHash)) problems.push('VALIDATED_GENESIS_MISMATCH');
  if (![market.baseDecimals, market.quoteDecimals].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) problems.push('INVALID_DECIMALS');
  if (!positive(market.tickSize)) problems.push('INVALID_TICK_SIZE');
  if (!positive(market.lotSize)) problems.push('INVALID_LOT_SIZE');
  if (!positive(market.minQuantity)) problems.push('INVALID_MIN_QUANTITY');
  if (!market.feedValid || !positive(market.mark)) problems.push('INVALID_MARK');
  if (market.stopDeposit === null || !atomic.test(market.stopDeposit)) problems.push('STOP_DEPOSIT_UNKNOWN');
  if (!positive(market.observedBlock) || !market.blockHash || !hash.test(market.blockHash)) problems.push('OBSERVATION_BLOCK_UNKNOWN');
  const observedAt = Date.parse(market.observedAt);
  if (!Number.isFinite(now) || !Number.isFinite(observedAt) || observedAt > now + 1_000 || now - observedAt >= FRESHNESS_MS) problems.push('MARKET_OBSERVATION_NOT_FRESH');
  return problems;
}

/** Complete reads are not a protection verdict. Missing positions, known-id-only reads and UNKNOWN remain blocked. */
export function doctorOwnerProblems(snapshot: Snapshot, owner: string, market: MarketSnapshot, now: number): string[] {
  const problems: string[] = [];
  if (!snapshot.complete || snapshot.scope !== 'indexedSnapshot' || snapshot.readError) problems.push('OWNER_READ_INCOMPLETE');
  if (!snapshot.position || !same(snapshot.position.owner, owner) || !same(snapshot.position.pool, market.pool)) problems.push('OWNER_IDENTITY_MISMATCH');
  if (!snapshot.market || !same(snapshot.market.pool, market.pool) || !same(snapshot.market.marginBank, market.marginBank) || !same(snapshot.market.stopRegistry, market.stopRegistry) || snapshot.market.genesisHash !== market.genesisHash) problems.push('OWNER_MARKET_IDENTITY_MISMATCH');
  const assessment = assessProtection(snapshot, now);
  if (assessment.verdict === 'UNKNOWN') problems.push(...assessment.reasonCodes);
  return [...new Set(problems)];
}

export function isBtcStyle(symbol: string | null): boolean {
  return /^(?:W|T)?BTC(?:$|[^A-Z])/i.test(symbol?.trim() ?? '');
}

/** No-owner success is intentionally narrower than owner acceptance and never implies a flat account. */
export function aggregateDoctorResult(input: {
  requiredChecks: readonly DoctorCheck[];
  transportChecks: readonly DoctorCheck[];
  marketVerified: boolean;
  ownerConfigured: boolean;
  ownerComplete: boolean;
}) {
  const blockers = input.requiredChecks.filter(check => check.status !== 'passed').map(check => `${check.name}: ${check.reason ?? check.status}`);
  if (!input.marketVerified && !blockers.some(reason => reason.startsWith('marketVerification:'))) blockers.push('marketVerification: MARKET_NOT_VERIFIED');
  if (input.ownerConfigured && !input.ownerComplete && !blockers.some(reason => reason.startsWith('ownerSnapshot:'))) blockers.push('ownerSnapshot: OWNER_READ_INCOMPLETE');
  if (input.transportChecks.length === 0 || input.transportChecks.some(check => check.status !== 'passed')) {
    if (!blockers.some(reason => reason.startsWith('transport:'))) blockers.push('transport: REQUIRED_TRANSPORT_CHECK_FAILED');
  }
  const readonlyResult = blockers.length === 0 ? 'PASS' as const : 'FAIL' as const;
  const owner = !input.ownerConfigured ? 'NOT_CONFIGURED' as const : input.ownerComplete ? 'COMPLETE' as const : 'INCOMPLETE' as const;
  return {
    readonlyResult,
    successScope: input.ownerConfigured ? 'transport-market-and-owner' as const : 'transport-and-verified-market' as const,
    statuses: {
      transport: input.transportChecks.length > 0 && input.transportChecks.every(check => check.status === 'passed') ? 'PASS' as const : 'FAIL' as const,
      market: input.marketVerified ? 'PASS' as const : 'FAIL' as const,
      owner,
    },
    blockers,
    ownerAcceptanceBlockers: [...blockers, ...(owner === 'NOT_CONFIGURED' ? ['OWNER_NOT_CONFIGURED'] : owner === 'INCOMPLETE' ? ['OWNER_READ_INCOMPLETE'] : [])],
    g0Complete: readonlyResult === 'PASS' && owner === 'COMPLETE',
    exitCode: readonlyResult === 'PASS' ? 0 as const : 2 as const,
  };
}
