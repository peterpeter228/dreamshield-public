import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateDoctorResult, doctorMarketProblems, doctorOwnerProblems } from '../../scripts/doctor-result.ts';
import type { Snapshot } from '../../packages/domain/types.ts';
import type * as Viem from 'viem';

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn(), execFileSync: vi.fn(),
  httpSetup: vi.fn(), sdkSetup: vi.fn(), snapshot: vi.fn(), sdkClose: vi.fn(),
  getChainId: vi.fn(), getBlock: vi.fn(), getCode: vi.fn(), readContract: vi.fn(),
  wsChainId: vi.fn(), wsBlock: vi.fn(), wsConnection: vi.fn(), wsClose: vi.fn(),
  listMarkets: vi.fn(), systemConfig: vi.fn(),
  forbidden: vi.fn(() => { throw new Error('Doctor attempted a wallet or send boundary'); }),
}));
vi.mock('node:fs/promises', () => ({ readFile: mocks.readFile, mkdir: mocks.mkdir, writeFile: mocks.writeFile }));
vi.mock('node:child_process', () => ({ execFileSync: mocks.execFileSync }));
vi.mock('viem', async original => ({
  ...await original<typeof Viem>(),
  createPublicClient: () => ({ getChainId: mocks.wsChainId, getBlock: mocks.wsBlock, transport: { getRpcClient: mocks.wsConnection }, sendTransaction: mocks.forbidden }),
  webSocket: () => ({}), createWalletClient: mocks.forbidden,
}));
vi.mock('../../packages/protocol/index.ts', () => ({
  NETWORK: { chainId: 50383, http: 'https://offline.invalid', ws: 'wss://offline.invalid/ws', indexer: 'https://offline.invalid/graphql', marginBank: '0x4444444444444444444444444444444444444444', collateral: '0x5555555555555555555555555555555555555555', factory: '0x6666666666666666666666666666666666666666', operatorRegistry: '0x7777777777777777777777777777777777777777' },
  chain: { id: 50383 }, httpClient: mocks.httpSetup, createProtocolReader: mocks.sdkSetup,
  readLiveSnapshot: mocks.snapshot, prepareOwnerCall: mocks.forbidden, executeNativeSl: mocks.forbidden,
}));

const owner = '0x1111111111111111111111111111111111111111';
const pool = '0x2222222222222222222222222222222222222222';
const registry = '0x3333333333333333333333333333333333333333';
const bank = '0x4444444444444444444444444444444444444444';
const otherPool = '0x8888888888888888888888888888888888888888';
const thirdPool = '0x9999999999999999999999999999999999999999';
const genesisHash = '0x' + 'a'.repeat(64);
const blockHash = '0x' + 'b'.repeat(64);
const now = Date.parse('2026-10-27T06:00:00.000Z');
const timestamp = BigInt(now / 1000);
const expected = { chainId: 50383, marginBank: bank, genesisHash };
const initialExitCode = process.exitCode;

function marketSnapshot(target = pool, symbol = 'BTC / USDso'): Snapshot {
  return {
    mode: 'live-readonly', market: { chainId: 50383, genesisHash, pool: target, marginBank: bank, stopRegistry: registry, symbol, baseDecimals: 18, quoteDecimals: 18, tickSize: '10', lotSize: '10', minQuantity: '20', mark: '10000', feedValid: true, observedBlock: '100', blockHash, observedAt: new Date(now).toISOString(), stopDeposit: '15' },
    position: null, stops: [], scope: 'unavailable', readError: 'OWNER_NOT_CONFIGURED', capturedAt: new Date(now).toISOString(), complete: false,
  };
}
function ownerSnapshot(): Snapshot {
  return { ...marketSnapshot(), position: { chainId: 50383, owner, pool, signedSize: '10', entryPrice: '10000', observedBlock: '100', observedAt: new Date(now).toISOString(), source: 'chain' }, scope: 'indexedSnapshot', readError: null, complete: true };
}
function indexed(target = pool, symbol = 'BTC') {
  return { poolAddress: target, baseSymbol: symbol, marginBank: bank, stopRegistry: registry };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers({ now });
  vi.stubEnv('DEMO_OWNER_ADDRESS', '');
  vi.stubEnv('DEMO_POOL_ADDRESS', '');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.forbidden.mockImplementation(() => { throw new Error('Doctor attempted a wallet or send boundary'); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.mkdir.mockResolvedValue(undefined);
  mocks.writeFile.mockResolvedValue(undefined);
  mocks.readFile.mockImplementation(async (path: string | URL) => {
    if (path instanceof URL) return Buffer.from('offline source bytes');
    if (path === 'package-lock.json') return Buffer.from('offline lock bytes');
    if (path.endsWith('markets-sdk/package.json')) return JSON.stringify({ version: '0.32.1' });
    if (path.endsWith('viem/package.json')) return JSON.stringify({ version: '2.57.11' });
    if (path === 'package.json') return JSON.stringify({ engines: { node: '24.22.1' }, dependencies: { '@somnia-chain/markets-sdk': '0.32.1', viem: '2.57.11' } });
    throw new Error(`Unexpected offline file ${path}`);
  });
  mocks.execFileSync.mockImplementation((command: string, args: string[]) => command === 'npm' ? '11.21.1\n' : args[0] === 'rev-parse' ? 'c'.repeat(40) + '\n' : '');
  mocks.getChainId.mockResolvedValue(50383);
  mocks.getBlock.mockImplementation(async (args?: { blockNumber?: bigint }) => ({ number: args?.blockNumber ?? 100n, hash: args?.blockNumber === 1n ? genesisHash : blockHash, timestamp }));
  mocks.getCode.mockResolvedValue('0x01');
  const system = { marginBank: bank, fullyWired: true, perpPoolFactory: '0x6666666666666666666666666666666666666666', collateralToken: '0x5555555555555555555555555555555555555555' };
  mocks.readContract.mockResolvedValue(system);
  mocks.systemConfig.mockResolvedValue(system);
  mocks.httpSetup.mockReturnValue({ getChainId: mocks.getChainId, getBlock: mocks.getBlock, getCode: mocks.getCode, readContract: mocks.readContract, sendTransaction: mocks.forbidden });
  mocks.wsChainId.mockResolvedValue(50383);
  mocks.wsBlock.mockResolvedValue({ number: 100n, hash: blockHash, timestamp });
  mocks.wsConnection.mockResolvedValue({ close: mocks.wsClose });
  mocks.listMarkets.mockResolvedValue([indexed()]);
  mocks.sdkClose.mockResolvedValue(undefined);
  mocks.sdkSetup.mockReturnValue({ client: { getPerpSystemConfig: mocks.systemConfig, listPerpMarkets: mocks.listMarkets }, close: mocks.sdkClose });
  mocks.snapshot.mockImplementation(async ({ owner: account, pool: target }: { owner: string | null; pool: string }) => account ? ownerSnapshot() : marketSnapshot(target));
});
afterEach(() => {
  expect(mocks.forbidden).not.toHaveBeenCalled();
  process.exitCode = initialExitCode;
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Deliberately load the executable boundary: mocks make every chain read local and retain its actual serialized report.
async function runDoctor() {
  await import('../../scripts/doctor-readonly.ts');
  return JSON.parse(String(mocks.writeFile.mock.calls[0]![1]));
}

describe('read-only doctor executable contract (offline)', () => {
  it('distinguishes no-owner market diagnosis from G0 and G1 acceptance', async () => {
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('PASS');
    expect(report.statuses).toEqual({ transport: 'PASS', market: 'PASS', owner: 'NOT_CONFIGURED' });
    expect(report.successScope).toBe('transport-and-verified-market');
    expect(report.ownerAcceptanceBlockers).toContain('OWNER_NOT_CONFIGURED');
    expect(report.g0Complete).toBe(false);
    expect(report.g1Status).toBe('NOT_RUN');
    expect(report.ownerSnapshot).toBeNull();
    expect(report.transactionsSent).toBe(0);
    expect(report.signingRequested).toBe(false);
    expect(report.exitCode).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(report.versions).toMatchObject({ node: 'v24.22.1', sdk: '0.32.1', viem: '2.57.11', lockSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(report.source).toMatchObject({ commit: 'c'.repeat(40), verifier: 'dreamshield-doctor-readonly/v1' });
    expect(mocks.wsConnection).toHaveBeenCalledOnce();
    expect(mocks.wsClose).toHaveBeenCalledOnce();
  });

  it('accepts complete owner reads without claiming protection or an executed lifecycle', async () => {
    vi.stubEnv('DEMO_OWNER_ADDRESS', owner);
    const report = await runDoctor();
    expect(report.statuses.owner).toBe('COMPLETE');
    expect(report.g0Complete).toBe(true);
    expect(report.ownerSnapshot.assessment.verdict).toBe('NEEDS_PROTECTION');
    expect(report.g1Status).toBe('NOT_RUN');
    expect(report.requiredChecks.every((check: { status: string }) => check.status === 'passed')).toBe(true);
  });

  it('fails a resolved but incomplete owner read and retains the incomplete observation', async () => {
    vi.stubEnv('DEMO_OWNER_ADDRESS', owner);
    mocks.snapshot.mockImplementation(async ({ owner: account }: { owner: string | null }) => account ? { ...ownerSnapshot(), complete: false, position: null, readError: 'INDEXER_UNAVAILABLE' } : marketSnapshot());
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.statuses).toEqual({ transport: 'PASS', market: 'PASS', owner: 'INCOMPLETE' });
    expect(report.probes.ownerSnapshot.status).toBe('failed');
    expect(report.ownerSnapshot.snapshot).toMatchObject({ complete: false, position: null, readError: 'INDEXER_UNAVAILABLE' });
    expect(report.ownerSnapshot.assessment.verdict).toBe('UNKNOWN');
    expect(report.g0Complete).toBe(false);
    expect(process.exitCode).toBe(2);
  });

  it('rejects wrong-chain transport before accepting any discovered pool', async () => {
    mocks.getChainId.mockResolvedValue(50312);
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.statuses.transport).toBe('FAIL');
    expect(report.selectedMarket).toBeNull();
    expect(report.probes.http.error).toContain('WRONG_CHAIN');
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it('propagates the existing protocol retired-genesis guard and stops candidate probing', async () => {
    mocks.listMarkets.mockResolvedValue([indexed(), indexed(otherPool, 'ETH')]);
    mocks.snapshot.mockResolvedValue({ ...marketSnapshot(), market: null, readError: 'Error: RETIRED_HIDEKI_GENESIS' });
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.selectedMarket).toBeNull();
    expect(report.marketSelection.attempts).toHaveLength(1);
    expect(report.marketSelection.attempts[0].error).toContain('RETIRED_HIDEKI_GENESIS');
    expect(report.probes.genesisBlock1.status).toBe('passed');
    expect(report.probes.genesisValidation.status).not.toBe('passed');
  });

  it('retains invalid candidate causes and prefers only a verified BTC-style market', async () => {
    mocks.listMarkets.mockResolvedValue([indexed(pool, 'ETH'), indexed(otherPool, 'BTC'), indexed(thirdPool, 'WBTC')]);
    mocks.snapshot.mockImplementation(async ({ pool: target }: { pool: string }) => target === otherPool ? { ...marketSnapshot(target), market: { ...marketSnapshot(target).market!, feedValid: false } } : marketSnapshot(target, target === thirdPool ? 'WBTC / USDso' : 'ETH / USDso'));
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('PASS');
    expect(report.selectedMarket).toMatchObject({ pool: thirdPool, selectionSource: 'discovery', genesisHash });
    expect(report.marketSelection.attempts[0]).toMatchObject({ pool: otherPool, status: 'failed', validationProblems: ['INVALID_MARK'] });
    expect(report.marketSelection.attempts).toHaveLength(2);
  });

  it('enforces the candidate bound and chooses the first verified fallback in indexed order', async () => {
    const rows = Array.from({ length: 31 }, (_, index) => indexed('0x' + (index + 1).toString(16).padStart(40, '0'), index === 30 ? 'BTC' : 'ETH'));
    mocks.listMarkets.mockResolvedValue(rows);
    mocks.snapshot.mockImplementation(async ({ pool: target }: { pool: string }) => marketSnapshot(target, 'ETH / USDso'));
    const report = await runDoctor();
    expect(mocks.listMarkets).toHaveBeenCalledWith({ limit: 30 });
    expect(report.marketSelection).toMatchObject({ candidateBound: 30, exhaustive: false });
    expect(report.marketSelection.attempts).toHaveLength(30);
    expect(report.selectedMarket.pool).toBe(rows[0]!.poolAddress);
    expect(mocks.snapshot).not.toHaveBeenCalledWith({ owner: null, pool: rows[30]!.poolAddress });
  });

  it('validates a supplied pool without substituting an indexed fallback or legacy aliases', async () => {
    vi.stubEnv('DEMO_POOL_ADDRESS', otherPool);
    vi.stubEnv('DREAMSHIELD_OWNER', owner);
    vi.stubEnv('DREAMSHIELD_POOL', pool);
    mocks.snapshot.mockResolvedValue({ ...marketSnapshot(otherPool), market: { ...marketSnapshot(otherPool).market!, mark: '0' } });
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.statuses.owner).toBe('NOT_CONFIGURED');
    expect(report.selectedMarket).toBeNull();
    expect(report.marketSelection).toMatchObject({ source: 'configured', candidateBound: 1 });
    expect(mocks.snapshot).toHaveBeenCalledExactlyOnceWith({ owner: null, pool: otherPool });
  });

  it('does not call a WebSocket setup/handshake a successful JSON-RPC session', async () => {
    mocks.wsChainId.mockRejectedValue(new Error('WebSocket JSON-RPC unavailable'));
    const report = await runDoctor();
    expect(report.probes.websocketSetup.status).toBe('passed');
    expect(report.probes.websocket.status).toBe('failed');
    expect(report.statuses.transport).toBe('FAIL');
    expect(report.statuses.market).toBe('PASS');
    expect(report.exitCode).toBe(2);
  });

  it('retains setup, nested transport and cleanup failures without erasing the primary cause', async () => {
    const dns = Object.assign(new Error('getaddrinfo EAI_AGAIN offline.invalid'), { code: 'EAI_AGAIN', hostname: 'offline.invalid' });
    mocks.getChainId.mockRejectedValue(new Error('HTTP request failed', { cause: dns }));
    mocks.sdkSetup.mockImplementation(() => { throw new Error('SDK_SETUP_FAILED'); });
    mocks.wsClose.mockImplementation(() => { throw new Error('WS_CLEANUP_FAILED'); });
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.probes.http.causes).toContainEqual(expect.objectContaining({ code: 'EAI_AGAIN', hostname: 'offline.invalid' }));
    expect(report.probes.sdkSetup.error).toBe('SDK_SETUP_FAILED');
    expect(report.probes.websocketCleanup.error).toBe('WS_CLEANUP_FAILED');
    expect(report.artifact.status).toBe('written');
    expect(report.requiredChecks.filter((check: { status: string }) => check.status !== 'passed').length).toBeGreaterThan(1);
  });

  it('fails aggregate success when SDK cleanup fails after otherwise successful probes', async () => {
    mocks.sdkClose.mockRejectedValue(new Error('SDK_CLEANUP_FAILED'));
    const report = await runDoctor();
    expect(report.statuses.market).toBe('PASS');
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.blockers).toContain('sdkCleanup: SDK_CLEANUP_FAILED');
    expect(process.exitCode).toBe(2);
  });

  it('does not accept a nonnull market if the protocol reader also reports cleanup failure', async () => {
    mocks.snapshot.mockResolvedValue({ ...marketSnapshot(), readError: 'OWNER_NOT_CONFIGURED; SDK_CLEANUP_FAILED: close failed' });
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.selectedMarket).toBeNull();
    expect(report.marketSelection.attempts[0].error).toContain('SDK_CLEANUP_FAILED');
  });

  it('rejects a market observation whose block is no longer canonical', async () => {
    mocks.getBlock.mockImplementation(async (args?: { blockNumber?: bigint }) => ({ number: args?.blockNumber ?? 100n, hash: args?.blockNumber === 1n ? genesisHash : args?.blockNumber === 100n ? '0x' + 'd'.repeat(64) : blockHash, timestamp }));
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.selectedMarket).toBeNull();
    expect(report.marketSelection.attempts[0].error).toBe('NON_CANONICAL_MARKET_SNAPSHOT');
  });

  it('retains version/source setup failures in a blocked result artifact', async () => {
    mocks.execFileSync.mockImplementation(() => { throw new Error('LOCAL_METADATA_UNAVAILABLE'); });
    const report = await runDoctor();
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.probes.versions.error).toBe('LOCAL_METADATA_UNAVAILABLE');
    expect(report.probes.sourceIdentity.error).toBe('LOCAL_METADATA_UNAVAILABLE');
    expect(report.source).toMatchObject({ commit: null, verifier: 'dreamshield-doctor-readonly/v1' });
    expect(report.versions.node).toBe('v24.22.1');
    expect(report.artifact.status).toBe('written');
  });

  it.each(['mkdir', 'writeFile'] as const)('emits the complete failure report to stderr if artifact %s fails', async (method) => {
    mocks[method].mockRejectedValue(new Error('EACCES evidence/g0'));
    mocks.getChainId.mockRejectedValue(new Error('PRIMARY_HTTP_FAILURE'));
    await import('../../scripts/doctor-readonly.ts');
    const report = JSON.parse(String(vi.mocked(console.error).mock.calls.at(-1)![0]));
    expect(report.artifact).toMatchObject({ path: null, status: 'failed', attemptedPath: expect.stringContaining('evidence/g0/doctor-') });
    expect(report.probes.artifactPersistence.error).toContain('EACCES');
    expect(report.probes.http.error).toBe('PRIMARY_HTTP_FAILURE');
    expect(report.readonlyResult).toBe('FAIL');
    expect(report.exitCode).toBe(2);
    expect(process.exitCode).toBe(2);
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('pure doctor completeness semantics', () => {
  it.each([
    ['tickSize', '0', 'INVALID_TICK_SIZE'], ['lotSize', '0', 'INVALID_LOT_SIZE'],
    ['minQuantity', '0', 'INVALID_MIN_QUANTITY'],
    ['baseDecimals', -1, 'INVALID_DECIMALS'], ['mark', '0', 'INVALID_MARK'],
    ['feedValid', false, 'INVALID_MARK'], ['genesisHash', '0x' + 'd'.repeat(64), 'VALIDATED_GENESIS_MISMATCH'],
  ])('rejects invalid verified-market %s data', (field, value, reason) => {
    const snapshot = marketSnapshot();
    snapshot.market = { ...snapshot.market!, [field as string]: value };
    expect(doctorMarketProblems(snapshot, pool, expected, now)).toContain(reason);
  });

  it('rejects known-id-only reads even if a caller marks them complete', () => {
    const snapshot = { ...ownerSnapshot(), scope: 'knownIdsOnly' as const };
    expect(doctorOwnerProblems(snapshot, owner, snapshot.market!, now)).toContain('OWNER_READ_INCOMPLETE');
  });

  it('cannot aggregate incomplete owner state into semantic success', () => {
    const checks = [{ name: 'http', status: 'passed' as const }];
    const result = aggregateDoctorResult({ requiredChecks: checks, transportChecks: checks, marketVerified: true, ownerConfigured: true, ownerComplete: false });
    expect(result.readonlyResult).toBe('FAIL');
    expect(result.g0Complete).toBe(false);
    expect(result.exitCode).toBe(2);
  });
});
