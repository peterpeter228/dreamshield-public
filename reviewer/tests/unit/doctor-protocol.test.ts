import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Viem from 'viem';
import type * as MarketsSdk from '@somnia-chain/markets-sdk';
const mocks = vi.hoisted(() => ({ getChainId: vi.fn(), getBlock: vi.fn(), close: vi.fn(), forbidden: vi.fn(() => { throw new Error('Unexpected doctor wallet/send boundary'); }) }));
vi.mock('viem', async original => ({
  ...await original<typeof Viem>(),
  createPublicClient: () => ({ getChainId: mocks.getChainId, getBlock: mocks.getBlock, readContract: mocks.forbidden, sendTransaction: mocks.forbidden }),
  createWalletClient: mocks.forbidden,
}));
vi.mock('@somnia-chain/markets-sdk', async original => ({
  ...await original<typeof MarketsSdk>(),
  SomniaMarkets: class { client = {}; close = mocks.close; },
}));
import { readLiveSnapshot } from '../../packages/protocol/index.ts';

const pool = '0x2222222222222222222222222222222222222222';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.close.mockResolvedValue(undefined);
  mocks.getChainId.mockResolvedValue(50383);
  mocks.getBlock.mockImplementation(async (args?: { blockNumber?: bigint }) => ({ number: args?.blockNumber ?? 100n, hash: args?.blockNumber === 1n ? '0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae' : '0x' + 'a'.repeat(64), timestamp: 1n }));
});
afterEach(() => { expect(mocks.forbidden).not.toHaveBeenCalled(); });

describe('doctor reuses protocol chain and retired-genesis rejection (offline)', () => {
  it('rejects wrong chain before market or owner reads', async () => {
    mocks.getChainId.mockResolvedValue(50312);
    const snapshot = await readLiveSnapshot({ owner: null, pool });
    expect(snapshot.complete).toBe(false);
    expect(snapshot.market).toBeNull();
    expect(snapshot.position).toBeNull();
    expect(snapshot.readError).toContain('WRONG_CHAIN');
    expect(mocks.getBlock).not.toHaveBeenCalled();
  });

  it('rejects the retired genesis even when block 1 was fetched successfully', async () => {
    const snapshot = await readLiveSnapshot({ owner: null, pool });
    expect(snapshot.complete).toBe(false);
    expect(snapshot.market).toBeNull();
    expect(snapshot.position).toBeNull();
    expect(snapshot.readError).toContain('RETIRED_HIDEKI_GENESIS');
    expect(mocks.getBlock).toHaveBeenCalledWith({ blockNumber: 1n });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
