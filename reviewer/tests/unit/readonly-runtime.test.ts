import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseReadonlyTransport, sdkReadInfrastructure } from '../../packages/protocol/readonly-runtime.ts';
import { readSystemConfigWithWarmup } from '../../scripts/readonly-config.ts';

afterEach(() => vi.unstubAllGlobals());

describe('explicit read-only SDK transport selection (offline)', () => {
  it('preserves the SDK default unless platform transport is explicitly selected', () => {
    expect(parseReadonlyTransport(undefined)).toBe('sdk-default');
    expect(parseReadonlyTransport('sdk-default')).toBe('sdk-default');
    expect(parseReadonlyTransport('platform')).toBe('platform');
    expect(sdkReadInfrastructure('sdk-default')).toEqual({});
  });

  it.each(['', 'native', 'PLATFORM', ' platform ', 'ws://example.invalid'])('rejects unsupported transport %j', value => {
    expect(() => parseReadonlyTransport(value)).toThrow();
  });

  it('passes through the selected constructor without opening a socket', () => {
    const constructor = vi.fn() as unknown as typeof WebSocket;
    expect(sdkReadInfrastructure('platform', constructor)).toEqual({ rpcWebSocketConstructor: constructor });
    expect(constructor).not.toHaveBeenCalled();
  });

  it('uses the actual platform constructor only for the explicit platform mode', () => {
    const constructor = vi.fn() as unknown as typeof WebSocket;
    vi.stubGlobal('WebSocket', constructor);
    expect(sdkReadInfrastructure('platform')).toEqual({ rpcWebSocketConstructor: constructor });
    expect(sdkReadInfrastructure('sdk-default')).toEqual({});
    expect(constructor).not.toHaveBeenCalled();
  });

  it('fails explicitly when the requested platform transport is unavailable', () => {
    vi.stubGlobal('WebSocket', undefined);
    expect(() => sdkReadInfrastructure('platform')).toThrow('PLATFORM_WEBSOCKET_UNAVAILABLE');
    expect(sdkReadInfrastructure('sdk-default')).toEqual({});
  });
});

describe('bounded read-only system configuration warmup (offline)', () => {
  const address = '0x1111111111111111111111111111111111111111';
  const config = { marginBank: '0x2222222222222222222222222222222222222222', chainId: 50383 };

  it('returns first success with exactly one read and one truthful callback', async () => {
    const client = { getPerpSystemConfig: vi.fn().mockResolvedValue(config) };
    const onAttempt = vi.fn();
    await expect(readSystemConfigWithWarmup(client, address, 2, onAttempt)).resolves.toBe(config);
    expect(client.getPerpSystemConfig).toHaveBeenCalledExactlyOnceWith(address);
    expect(onAttempt).toHaveBeenCalledOnce();
    expect(onAttempt.mock.calls[0][0]).toMatchObject({ attempt: 1, status: 'passed', ms: expect.any(Number) });
    expect(onAttempt.mock.calls[0][0].ms).toBeGreaterThanOrEqual(0);
    expect(onAttempt.mock.calls[0][0].error).toBeUndefined();
  });

  it.each([
    new Error('WebSocket request timed out'),
    new Error('timeout'),
    Object.assign(new Error('connect failed'), { code: 'ETIMEDOUT' }),
    new Error('outer request failed', { cause: Object.assign(new Error('DNS failed'), { code: 'EAI_AGAIN' }) }),
    new Error('outer', { cause: new Error('inner', { cause: Object.assign(new Error('request failed'), { name: 'TimeoutError' }) }) }),
  ])('retries a transient first read on the same client only once: %s', async firstError => {
    const client = { getPerpSystemConfig: vi.fn().mockRejectedValueOnce(firstError).mockResolvedValueOnce(config) };
    const onAttempt = vi.fn();
    await expect(readSystemConfigWithWarmup(client, address, 2, onAttempt)).resolves.toBe(config);
    expect(client.getPerpSystemConfig.mock.calls).toEqual([[address], [address]]);
    expect(onAttempt.mock.calls.map(([event]) => [event.attempt, event.status])).toEqual([[1, 'failed'], [2, 'passed']]);
    expect(onAttempt.mock.calls[0][0].error).toBe(firstError);
    expect(onAttempt.mock.calls[1][0].error).toBeUndefined();
    for (const [event] of onAttempt.mock.calls) {
      expect(Number.isFinite(event.ms)).toBe(true);
      expect(event.ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not retry a transient failure when maxAttempts is one', async () => {
    const error = new Error('request timed out');
    const client = { getPerpSystemConfig: vi.fn().mockRejectedValue(error) };
    const onAttempt = vi.fn();
    await expect(readSystemConfigWithWarmup(client, address, 1, onAttempt)).rejects.toBe(error);
    expect(client.getPerpSystemConfig).toHaveBeenCalledExactlyOnceWith(address);
    expect(onAttempt).toHaveBeenCalledOnce();
    expect(onAttempt.mock.calls[0][0]).toMatchObject({ attempt: 1, status: 'failed', error });
  });

  it('preserves the final error after exactly two failures with no third read', async () => {
    const first = new Error('request timed out');
    const last = Object.assign(new Error('second connection failed'), { code: 'EAI_AGAIN' });
    const client = { getPerpSystemConfig: vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(last).mockResolvedValue(config) };
    const onAttempt = vi.fn();
    await expect(readSystemConfigWithWarmup(client, address, 2, onAttempt)).rejects.toBe(last);
    expect(client.getPerpSystemConfig.mock.calls).toEqual([[address], [address]]);
    expect(onAttempt.mock.calls.map(([event]) => [event.attempt, event.status, event.error])).toEqual([[1, 'failed', first], [2, 'failed', last]]);
  });

  it.each(['SYSTEM_CONFIG_DRIFT', 'WRONG_CHAIN', 'RETIRED_HIDEKI_GENESIS', 'Invalid system configuration', 'Forbidden'])('never retries nontransient failure %s', async message => {
    const error = new Error(message);
    const client = { getPerpSystemConfig: vi.fn().mockRejectedValueOnce(error).mockResolvedValue(config) };
    const onAttempt = vi.fn();
    await expect(readSystemConfigWithWarmup(client, address, 2, onAttempt)).rejects.toBe(error);
    expect(client.getPerpSystemConfig).toHaveBeenCalledExactlyOnceWith(address);
    expect(onAttempt).toHaveBeenCalledOnce();
    expect(onAttempt.mock.calls[0][0].error).toBe(error);
  });
});
