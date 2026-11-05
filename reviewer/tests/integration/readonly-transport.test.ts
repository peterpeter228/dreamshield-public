import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { fixture } from '../../fixtures/scenarios.js';

const protocol = vi.hoisted(() => ({
  readLiveSnapshot: vi.fn(),
  reconcileOperation: vi.fn(() => { throw new Error('Unexpected reconciliation in GET transport test'); }),
  captureEvidenceObservation: vi.fn(() => { throw new Error('Unexpected capture in GET transport test'); }),
}));
vi.mock('../../packages/protocol/index.js', () => protocol);

import { createApp } from '../../apps/server/app.js';
import { loadConfig } from '../../apps/server/config.js';

const owner = '0x1111111111111111111111111111111111111111';
const pool = '0x2222222222222222222222222222222222222222';
let resources: Array<{server: Server; instance: ReturnType<typeof createApp>; directory: string}> = [];

beforeEach(() => {
  vi.clearAllMocks();
  // Synthetic input only: no RPC, indexer, wallet or real chain is used in this test.
  protocol.readLiveSnapshot.mockImplementation(async () => fixture('unprotected'));
});

afterEach(async () => {
  for (const {server, instance, directory} of resources) {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    instance.close();
    rmSync(directory, {recursive: true, force: true});
  }
  resources = [];
  expect(protocol.reconcileOperation).not.toHaveBeenCalled();
  expect(protocol.captureEvidenceObservation).not.toHaveBeenCalled();
});

async function start(env: NodeJS.ProcessEnv) {
  const directory = mkdtempSync(join(tmpdir(), 'dreamshield-readonly-transport-'));
  const instance = createApp(loadConfig({
    HOST: '127.0.0.1', DATA_DIR: directory, DEMO_OWNER_ADDRESS: owner, DEMO_POOL_ADDRESS: pool, ...env,
  }));
  const server = instance.app.listen(0, '127.0.0.1');
  resources.push({server, instance, directory});
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local test server address');
  return `http://127.0.0.1:${address.port}`;
}

describe('HTTP read-only transport configuration boundary (offline)', () => {
  it('forwards explicit platform transport to live-readonly reads without providing a signer', async () => {
    const url = await start({APP_MODE: 'live-readonly', DREAMSHIELD_READONLY_WEBSOCKET: 'platform'});
    const response = await fetch(url + '/api/desk');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(protocol.readLiveSnapshot).toHaveBeenCalledExactlyOnceWith({owner, pool, transport: 'platform'});
    expect(body.snapshot.mode).toBe('live-readonly');
    expect(body.capabilities).toMatchObject({mode: 'live-readonly', ownerEnabled: false, signerAvailable: false});
    const config = await (await fetch(url + '/api/config')).json();
    expect(config.csrfToken).toBeNull();
    expect(config.ownerEnabled).toBe(false);
  });

  it('preserves the SDK transport default for live-readonly when no flag is supplied', async () => {
    const url = await start({APP_MODE: 'live-readonly'});
    expect((await fetch(url + '/api/desk')).status).toBe(200);
    expect(protocol.readLiveSnapshot).toHaveBeenCalledExactlyOnceWith({owner, pool, transport: 'sdk-default'});
  });

  it('does not forward the read-only platform override into live-owner mode', async () => {
    const url = await start({
      APP_MODE: 'live-owner', READ_ONLY: 'false', ALLOW_TESTNET_WRITES: 'true',
      DREAMSHIELD_READONLY_WEBSOCKET: 'platform',
    });
    const response = await fetch(url + '/api/desk');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(protocol.readLiveSnapshot).toHaveBeenCalledExactlyOnceWith({owner, pool, transport: undefined});
    expect(body.snapshot.mode).toBe('live-owner');
    expect(body.capabilities).toMatchObject({mode: 'live-owner', ownerEnabled: true, signerAvailable: false});
    expect(body.operations).toEqual([]);
  });

  it('never invokes a live protocol read for replay even when platform transport is configured', async () => {
    const url = await start({APP_MODE: 'replay', DREAMSHIELD_READONLY_WEBSOCKET: 'platform'});
    const response = await fetch(url + '/api/desk?scenario=unprotected');
    expect(response.status).toBe(200);
    expect((await response.json()).snapshot.mode).toBe('replay');
    expect(protocol.readLiveSnapshot).not.toHaveBeenCalled();
  });

  it.each(['', 'native', 'PLATFORM', ' platform '])('rejects unsupported transport environment value %j before constructing an app', value => {
    expect(() => loadConfig({APP_MODE: 'live-readonly', DREAMSHIELD_READONLY_WEBSOCKET: value})).toThrow();
    expect(protocol.readLiveSnapshot).not.toHaveBeenCalled();
  });

  it('does not let transport selection bypass the read-only write guard', () => {
    expect(() => loadConfig({
      APP_MODE: 'live-readonly', DREAMSHIELD_READONLY_WEBSOCKET: 'platform', ALLOW_TESTNET_WRITES: 'true',
    })).toThrow('Read-only mode cannot enable writes');
    expect(protocol.readLiveSnapshot).not.toHaveBeenCalled();
  });
});
