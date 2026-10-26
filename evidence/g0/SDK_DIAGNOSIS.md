# SDK read-only diagnostic, 2026-10-24 22:44 UTC

Pinned SDK: @somnia-chain/markets-sdk 0.32.1. No dependency or address was changed.

The observed message `rpc getBlock failed: genesis check failed` does not by itself mean that a retired genesis was detected. Inspection of installed SDK `dist/client.js`, `makeGenesisCheck`, shows that the message wraps a failure to read block 1. A retired hash would instead raise NotConfiguredError with a retired-generation explanation.

A fresh, read-only reproduction preserved the cause chain in `sdk-diagnostic-2026-10-24T22-44Z.txt`: UnknownRpcError → getaddrinfo EAI_AGAIN for the configured Hideki2 WebSocket hostname. This reproduction establishes a DNS/transport failure in the current execution environment, not a proven SDK/deployment mismatch. It does not retrospectively establish the exact cause of earlier probes that omitted the cause.

Earlier HTTP/WS observations and system-code checks remain timestamped evidence, not a guarantee of current reachability. The successful direct block-1 observation in doctor-2026-10-24T22-28-16.300Z.json differs from the SDK's retired Hideki-v1 hash. No guard was removed, bypassed or weakened. SDK-dependent owner operations remain unaccepted until a fresh successful probe and the separately authorized owner lifecycle.

Doctor output now captures nested causes to make future failures diagnosable. No signing or transactions occurred.

## Browser-machine cross-check, 22:50 UTC

The browser machine ran the same pinned doctor through its native terminal. It resolved the host but HTTP/SDK connections were refused at 35.75.124.66:443 (ECONNREFUSED). See doctor-2026-10-24T22-50-12.271Z.json. No current live pass is established in either environment. No change to endpoints, chain guards or network/security configuration was used.
