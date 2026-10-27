import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { aggregateDoctorResult, doctorMarketProblems, doctorOwnerProblems, isBtcStyle, type DoctorCheck } from './doctor-result.ts';
import { assessProtection } from '../packages/domain/index.ts';
import type { MarketSnapshot, Snapshot } from '../packages/domain/types.ts';
import type * as ProtocolModule from '../packages/protocol/index.ts';
import type { bankReadAbi as BankReadAbi } from '../packages/protocol/sdk-abi.ts';
import type { PublicClient } from 'viem';
import type { SomniaMarkets } from '@somnia-chain/markets-sdk';

type Probe = DoctorCheck & { ms?: number; value?: unknown; error?: string; causes?: unknown[] };
type SelectedMarket = MarketSnapshot & { selectionSource: 'configured' | 'discovery' };
const startedAt = new Date().toISOString();
const owner = process.env.DEMO_OWNER_ADDRESS?.trim() || null;
const configuredPool = process.env.DEMO_POOL_ADDRESS?.trim() || null;
const maxCandidates = 30;
const probes: Record<string, Probe> = {};
const requiredNames = ['versions', 'sourceIdentity', 'protocolSetup', 'httpSetup', 'http', 'websocketSetup', 'websocket', 'systemBytecode', 'sdkSetup', 'sdkSystemConfig', 'httpSystemConfigAtBlock', 'genesisBlock1', 'marketVerification', 'genesisValidation', 'websocketCleanup', 'sdkCleanup', 'execution', 'artifactPersistence'];
if (!configuredPool) requiredNames.push('marketDiscovery');
if (owner) requiredNames.push('ownerSnapshot');
const results: Record<string, unknown> = {
  schemaVersion: 1, artifactType: 'dreamshield-readonly-doctor', startedAt,
  readOnly: true, signingRequested: false, transactionsSent: 0, signerConfigured: false,
  ownerConfigured: owner !== null, poolConfigured: configuredPool !== null,
  liveOwnerGate: 'BLOCKED_NO_USER_SIGNER', g1Status: 'NOT_RUN',
  fixedBlockAcrossSdkCalls: false, pinnedRiskReadsViaExtractedSdkAbi: true,
  reachabilityScope: 'This execution environment only; not proof of owner-machine reachability.',
  probes,
};
const resources: {
  protocol?: typeof ProtocolModule;
  rpc?: PublicClient;
  exchange?: SomniaMarkets;
  closeWebsocket?: () => void | Promise<void>;
  websocketProbe?: () => Promise<unknown>;
  bankReadAbi?: typeof BankReadAbi;
  genesisHash?: string;
} = {};
let selectedMarket: SelectedMarket | null = null;
let ownerComplete = false;

function errorChain(error: unknown) {
  const causes: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    const value = current as { name?: unknown; message?: unknown; details?: unknown; code?: unknown; cause?: unknown; error?: unknown; hostname?: unknown; syscall?: unknown };
    causes.push({ name: value.name ?? 'Error', message: String(value.message ?? value.details ?? current), code: value.code ?? null, hostname: value.hostname ?? null, syscall: value.syscall ?? null });
    current = value.cause ?? value.error;
  }
  return causes;
}

async function probe<T>(name: string, run: () => Promise<T>): Promise<T | undefined> {
  const start = Date.now();
  try {
    const value = await run();
    probes[name] = { name, status: 'passed', ms: Date.now() - start, value };
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    probes[name] = { name, status: 'failed', ms: Date.now() - start, reason: message, error: message, causes: errorChain(error) };
    return undefined;
  }
}

function blocked(name: string, reason: string) {
  probes[name] = { name, status: 'blocked', reason };
}

try {
  await probe('versions', async () => {
    const versions: Record<string, unknown> = { node: process.version };
    results.versions = versions;
    versions.npm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
    versions.sdk = JSON.parse(await readFile('node_modules/@somnia-chain/markets-sdk/package.json', 'utf8')).version;
    versions.viem = JSON.parse(await readFile('node_modules/viem/package.json', 'utf8')).version;
    versions.lockSha256 = createHash('sha256').update(await readFile('package-lock.json')).digest('hex');
    const declared = JSON.parse(await readFile('package.json', 'utf8'));
    versions.expected = { node: declared.engines.node, sdk: declared.dependencies['@somnia-chain/markets-sdk'], viem: declared.dependencies.viem };
    if (process.version !== `v${declared.engines.node}` || versions.sdk !== declared.dependencies['@somnia-chain/markets-sdk'] || versions.viem !== declared.dependencies.viem) throw new Error('PINNED_RUNTIME_OR_DEPENDENCY_MISMATCH');
    return versions;
  });
  await probe('sourceIdentity', async () => {
    const source: Record<string, unknown> = { commit: null, verifier: 'dreamshield-doctor-readonly/v1', dirty: null };
    results.source = source;
    source.doctorSha256 = createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
    source.helperSha256 = createHash('sha256').update(await readFile(new URL('./doctor-result.ts', import.meta.url))).digest('hex');
    source.commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    source.dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
    if (!/^[0-9a-f]{40}$/.test(String(source.commit))) throw new Error('SOURCE_COMMIT_UNAVAILABLE');
    return source;
  });
  // SDK/transport module loading is itself a tested setup boundary: static runtime imports would bypass failure-artifact retention.
  await probe('protocolSetup', async () => {
    resources.protocol = await import('../packages/protocol/index.ts');
    resources.bankReadAbi = (await import('../packages/protocol/sdk-abi.ts')).bankReadAbi;
    return { network: resources.protocol.NETWORK, marketValidator: 'readLiveSnapshot (existing chain, retired-genesis, factory/bank/registry/code validation)' };
  });
  if (resources.protocol) {
    const protocol = resources.protocol;
    const { NETWORK, chain, httpClient, createProtocolReader } = protocol;
    await probe('httpSetup', async () => { resources.rpc = httpClient(); return { endpoint: NETWORK.http, retryCount: 0 }; });
    const client = resources.rpc;
    if (client) {
      await probe('http', async () => {
        const chainId = await client.getChainId();
        if (chainId !== NETWORK.chainId) throw new Error(`WRONG_CHAIN: ${chainId}`);
        const block = await client.getBlock();
        if (block.number === null || !block.hash) throw new Error('HTTP_BLOCK_UNAVAILABLE');
        return { endpoint: NETWORK.http, chainId, block: block.number, blockHash: block.hash, blockTimestamp: block.timestamp, lagSeconds: Math.floor(Date.now() / 1000) - Number(block.timestamp) };
      });
    }
    await probe('websocketSetup', async () => {
      const { createPublicClient, webSocket } = await import('viem');
      const ws = createPublicClient({ chain, transport: webSocket(NETWORK.ws, { retryCount: 0, timeout: 12000, reconnect: false }) });
      resources.websocketProbe = async () => {
        const connection = await ws.transport.getRpcClient();
        resources.closeWebsocket = () => connection.close();
        const chainId = await ws.getChainId();
        if (chainId !== NETWORK.chainId) throw new Error(`WRONG_CHAIN: ${chainId}`);
        const block = await ws.getBlock();
        if (block.number === null || !block.hash) throw new Error('WEBSOCKET_BLOCK_UNAVAILABLE');
        return { endpoint: NETWORK.ws, session: 'actual JSON-RPC WebSocket client', chainId, block: block.number, blockHash: block.hash, blockTimestamp: block.timestamp, lagSeconds: Math.floor(Date.now() / 1000) - Number(block.timestamp) };
      };
      return { endpoint: NETWORK.ws, retryCount: 0, reconnect: false };
    });
    if (resources.websocketProbe) await probe('websocket', resources.websocketProbe);
    await probe('sdkSetup', async () => { resources.exchange = createProtocolReader(); return { signer: false }; });
    const sdk = resources.exchange;
    if (sdk) {
      await probe('sdkSystemConfig', async () => {
        const config = await sdk.client.getPerpSystemConfig(NETWORK.marginBank);
        if (!config.fullyWired || config.marginBank.toLowerCase() !== NETWORK.marginBank.toLowerCase() || config.perpPoolFactory.toLowerCase() !== NETWORK.factory.toLowerCase() || config.collateralToken.toLowerCase() !== NETWORK.collateral.toLowerCase()) throw new Error('SDK_SYSTEM_CONFIG_DRIFT');
        return config;
      });
    }
    if (client && resources.bankReadAbi) {
      const abi = resources.bankReadAbi;
      await probe('systemBytecode', async () => {
        const block = await client.getBlock();
        const contracts: Record<string, unknown> = {};
        for (const [name, address] of Object.entries({ marginBank: NETWORK.marginBank, collateral: NETWORK.collateral, factory: NETWORK.factory, operatorRegistry: NETWORK.operatorRegistry })) {
          const code = await client.getCode({ address, blockNumber: block.number });
          if (!code || code === '0x') throw new Error(`CONTRACT_CODE_MISSING: ${name}`);
          contracts[name] = { address, bytes: (code.length - 2) / 2, sha256: createHash('sha256').update(code).digest('hex') };
        }
        return { block: block.number, blockHash: block.hash, contracts };
      });
      await probe('httpSystemConfigAtBlock', async () => {
        const block = await client.getBlock();
        const config = await client.readContract({ address: NETWORK.marginBank, abi, functionName: 'getSystemConfig', blockNumber: block.number });
        if (!config.fullyWired || config.marginBank.toLowerCase() !== NETWORK.marginBank.toLowerCase() || config.perpPoolFactory.toLowerCase() !== NETWORK.factory.toLowerCase() || config.collateralToken.toLowerCase() !== NETWORK.collateral.toLowerCase()) throw new Error('HTTP_SYSTEM_CONFIG_DRIFT');
        return { block: block.number, blockHash: block.hash, value: config };
      });
      await probe('genesisBlock1', async () => {
        const block = await client.getBlock({ blockNumber: 1n });
        if (block.number !== 1n || !block.hash || !/^0x[0-9a-fA-F]{64}$/.test(block.hash)) throw new Error('GENESIS_IDENTITY_UNAVAILABLE');
        resources.genesisHash = block.hash;
        return block;
      });
    }
    let candidates: { pool: string; symbol: string | null; bank: string | null; stopRegistry: string | null; index: number }[] = [];
    if (sdk) {
      await probe('marketDiscovery', async () => {
        const markets = await sdk.client.listPerpMarkets({ limit: maxCandidates });
        candidates = markets.slice(0, maxCandidates).map((market, index) => ({ pool: market.poolAddress, symbol: market.baseSymbol, bank: market.marginBank, stopRegistry: market.stopRegistry, index }));
        return { endpoint: NETWORK.indexer, limit: maxCandidates, reportedCount: markets.length, candidateCount: candidates.length, exhaustive: false, coverage: 'At most the first 30 indexed perp markets; indexed rows are candidates, not accepted markets.', markets: candidates };
      });
    }
    const attempts: Record<string, unknown>[] = [];
    const selection = { source: configuredPool ? 'configured' as const : 'discovery' as const, candidateBound: configuredPool ? 1 : maxCandidates, exhaustive: false, preference: 'Verified BTC-style market, otherwise first verified candidate in indexed order; no liquidity claim.', attempts };
    results.marketSelection = selection;
    if (configuredPool) candidates = [{ pool: configuredPool, symbol: null, bank: null, stopRegistry: null, index: 0 }];
    if (client && resources.genesisHash && probes.http?.status === 'passed') {
      const expected = { chainId: NETWORK.chainId, marginBank: NETWORK.marginBank, genesisHash: resources.genesisHash };
      const ordered = [...candidates].sort((a, b) => Number(isBtcStyle(b.symbol)) - Number(isBtcStyle(a.symbol)) || a.index - b.index);
      let firstVerified: { market: SelectedMarket; index: number } | null = null;
      let systemicFailure = false;
      for (const candidate of ordered) {
        const name = `marketCandidate:${candidate.index}`;
        const attempt: Record<string, unknown> = { ...candidate, validator: 'readLiveSnapshot', status: 'blocked' };
        attempts.push(attempt);
        const market = await probe(name, async () => {
          const snapshot = await protocol.readLiveSnapshot({ owner: null, pool: candidate.pool });
          attempt.snapshot = snapshot;
          const problems = doctorMarketProblems(snapshot, candidate.pool, expected, Date.now());
          attempt.validationProblems = problems;
          if (problems.length || !snapshot.market) throw new Error(problems.join('; '));
          const canonical = await client.getBlock({ blockNumber: BigInt(snapshot.market.observedBlock) });
          attempt.canonicalBlock = { number: canonical.number, hash: canonical.hash, timestamp: canonical.timestamp };
          if (canonical.number !== BigInt(snapshot.market.observedBlock) || canonical.hash !== snapshot.market.blockHash || new Date(Number(canonical.timestamp) * 1000).toISOString() !== snapshot.market.observedAt) throw new Error('NON_CANONICAL_MARKET_SNAPSHOT');
          return { ...snapshot.market, selectionSource: selection.source };
        });
        attempt.status = probes[name]!.status;
        if (probes[name]!.status !== 'passed') {
          attempt.error = probes[name]!.error;
          attempt.causes = probes[name]!.causes;
          if (/WRONG_CHAIN|RETIRED_HIDEKI_GENESIS|SYSTEM_CONFIG_DRIFT/.test(probes[name]!.error ?? '')) { systemicFailure = true; break; }
          continue;
        }
        if (market) {
          if (!firstVerified || candidate.index < firstVerified.index) firstVerified = { market, index: candidate.index };
          if (configuredPool || isBtcStyle(market.symbol.split('/')[0]!.trim())) { selectedMarket = market; break; }
        }
      }
      if (!systemicFailure) selectedMarket ??= firstVerified?.market ?? null;
      if (selectedMarket) {
        await probe('marketVerification', async () => ({ selectedMarket, candidatesAttempted: attempts.length, acceptance: 'verified market only; not owner completeness or protection' }));
        await probe('genesisValidation', async () => ({ hash: selectedMarket!.genesisHash, capturedBlock1Hash: resources.genesisHash, validator: 'Existing readLiveSnapshot retired-genesis guard, with matching independently captured block 1.' }));
      } else {
        blocked('marketVerification', systemicFailure ? 'SYSTEMIC_CHAIN_OR_GENESIS_VALIDATION_FAILURE; see candidate diagnostics' : candidates.length ? 'NO_VERIFIED_MARKET; see candidate diagnostics' : 'NO_MARKET_CANDIDATES');
        blocked('genesisValidation', 'NO_MARKET_ACCEPTED_BY_EXISTING_PROTOCOL_GENESIS_GUARD');
      }
    } else {
      blocked('marketVerification', 'HTTP_CHAIN_OR_GENESIS_PROBE_FAILED');
      blocked('genesisValidation', 'NO_MARKET_ACCEPTED_BY_EXISTING_PROTOCOL_GENESIS_GUARD');
    }
    if (owner && selectedMarket) {
      const market = selectedMarket;
      await probe('ownerSnapshot', async () => {
        const snapshot: Snapshot = await protocol.readLiveSnapshot({ owner, pool: market.pool });
        const now = Date.now();
        const assessment = assessProtection(snapshot, now);
        results.ownerSnapshot = { snapshot, assessment };
        const problems = [...doctorMarketProblems(snapshot, market.pool, { chainId: NETWORK.chainId, marginBank: NETWORK.marginBank, genesisHash: resources.genesisHash ?? null }, now), ...doctorOwnerProblems(snapshot, owner, market, now)];
        if (problems.length) throw new Error(problems.join('; '));
        selectedMarket = { ...snapshot.market!, selectionSource: market.selectionSource };
        ownerComplete = true;
        return { completeness: 'complete canonical same-block owner snapshot', protectionVerdict: assessment.verdict, reasonCodes: assessment.reasonCodes };
      });
    } else {
      results.ownerSnapshot = null;
      blocked('ownerSnapshot', owner ? 'VERIFIED_MARKET_REQUIRED' : 'OWNER_NOT_CONFIGURED');
    }
  }
  probes.execution = { name: 'execution', status: 'passed' };
} catch (error) {
  await probe('execution', async () => { throw error; });
} finally {
  await probe('websocketCleanup', async () => { if (resources.closeWebsocket) { await resources.closeWebsocket(); return { closed: true }; } return { closed: false, reason: 'NO_ESTABLISHED_WEBSOCKET_CLIENT' }; });
  await probe('sdkCleanup', async () => { if (resources.exchange) { await resources.exchange.close(); return { closed: true }; } return { closed: false, reason: 'SDK_NOT_CREATED' }; });
}

results.selectedMarket = selectedMarket;
results.identity = { chainId: selectedMarket?.chainId ?? null, genesisHash: selectedMarket?.genesisHash ?? null, owner, pool: selectedMarket?.pool ?? null, marginBank: selectedMarket?.marginBank ?? null, stopRegistry: selectedMarket?.stopRegistry ?? null };
results.g0Note = 'G0 requires the complete configured owner scope as well as required read-only checks. No owner means no position/balance/protection claim. G1 is NOT_RUN; no signing, trading, funding, cancellation or submission.';
const file = `evidence/g0/doctor-${startedAt.replaceAll(':', '-')}.json`;
function finalize() {
  const requiredChecks = requiredNames.map(name => probes[name] ?? { name, status: 'blocked' as const, reason: 'PROBE_NOT_RUN_AFTER_SETUP_FAILURE' });
  results.requiredChecks = requiredChecks.map(({ name, status, reason }) => ({ name, status, ...(reason ? { reason } : {}) }));
  Object.assign(results, aggregateDoctorResult({ requiredChecks, transportChecks: ['httpSetup', 'http', 'websocketSetup', 'websocket'].map(name => probes[name] ?? { name, status: 'blocked' as const }), marketVerified: selectedMarket !== null, ownerConfigured: owner !== null, ownerComplete }));
  results.completedAt = new Date().toISOString();
}
const serialize = () => JSON.stringify(results, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2);
probes.artifactPersistence = { name: 'artifactPersistence', status: 'passed' };
results.artifact = { path: file, status: 'written' };
finalize();
try {
  await mkdir('evidence/g0', { recursive: true });
  await writeFile(file, serialize() + '\n');
  console.log(serialize());
  console.log(`Evidence: ${file}`);
} catch (error) {
  await probe('artifactPersistence', async () => { throw error; });
  results.artifact = { path: null, attemptedPath: file, status: 'failed' };
  finalize();
  console.error('Doctor artifact could not be retained; the complete failure report follows. No artifact path is claimed.');
  console.error(serialize());
}
process.exitCode = results.exitCode as number;
