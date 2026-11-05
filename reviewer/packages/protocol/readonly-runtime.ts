/** Explicit read-only runtime selection; never changes endpoints, DNS or signing clients. */
export type ReadonlyTransport = 'sdk-default' | 'platform';
export function parseReadonlyTransport(value: string | undefined): ReadonlyTransport {
  if (value === undefined || value === 'sdk-default') return 'sdk-default';
  if (value === 'platform') return 'platform';
  throw new Error('INVALID_READONLY_WEBSOCKET_TRANSPORT');
}
export function sdkReadInfrastructure(mode: ReadonlyTransport, constructor: typeof WebSocket | undefined = globalThis.WebSocket) {
  if (mode === 'sdk-default') return {};
  if (!constructor) throw new Error('PLATFORM_WEBSOCKET_UNAVAILABLE');
  return { rpcWebSocketConstructor: constructor };
}
