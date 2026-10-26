# SDK system-config read reports a genesis-check failure with nested WS DNS `EAI_AGAIN`

Severity: normal
Area: SDK
Status: inconclusive

Severity is provisional: the historical read failed, but SDK defect attribution is **inconclusive**. This is a non-security diagnostic-feedback candidate, not a confirmed SDK bug or deployment mismatch.

- Local filing: this repository report only.
- Historical reproduction: nested DNS failure captured on 2026-10-24 around 22:44 UTC and repeated at 22:45:38.126 UTC.
- Current reproduction: **NOT_RUN**; no network probe or new reproduction was performed for this report.
- Duplicate check: **NOT_RUN**; novelty and first-valid-report eligibility are unestablished.
- External submission: **NOT_SUBMITTED**. Organizer acceptance: **NOT_RECORDED** (not an organizer rejection).

## Steps to reproduce

### Review the preserved historical observation (offline)

1. Read the [dated SDK diagnosis](../evidence/g0/SDK_DIAGNOSIS.md), especially lines 3–15, alongside the [22:44 diagnostic log](../evidence/g0/sdk-diagnostic-2026-10-24T22-44Z.txt), lines 1–29 and 72. The real SDK entry point in that stack is `getPerpSystemConfig`; the nested transport is the configured WebSocket endpoint.
2. Compare the [22:45 retry record](../evidence/g0/sdk-retry-2026-10-24T22-45Z.json), lines 1–7. It records the same top-level message and DNS cause, `readOnly: true`, and `transactionsSent: 0`.
3. Use the [22:28 doctor record](../evidence/g0/doctor-2026-10-24T22-28-16.300Z.json), lines 18–40, 68–94, as a historical control: direct HTTP/WS checks and a direct block-1 read passed while the SDK system-config read failed without a captured nested cause. Do **not** assign the later DNS cause retrospectively to this earlier failure.
4. Keep the [22:50 doctor record](../evidence/g0/doctor-2026-10-24T22-50-12.271Z.json), lines 84–109, separate: its SDK cause is `connect ECONNREFUSED 35.75.124.66:443`, not `EAI_AGAIN`.

### Later authorized reproduction procedure — not executed in this phase

1. Use the repository's pinned dependencies and Node `24.22.1`; retain SDK `0.32.1`, viem `2.57.11`, and the existing Somnia Tokyo / Hideki chain `50383` configuration. The historical doctor runs had no owner, pool or signer configured. No wallet, private key, funded account or transaction is needed for this read-only procedure.
2. From the repository root, only when network access is separately authorized, run:

   ```sh
   npm run doctor:readonly
   ```

   [The package script](../package.json) invokes [the existing read-only doctor](../scripts/doctor-readonly.ts). Its `sdkSystemConfig` probe calls `exchange.client.getPerpSystemConfig(NETWORK.marginBank)`; the doctor also records direct HTTP/WS, system-config and block-1 controls and writes a new timestamped JSON artifact under `evidence/g0/`. This procedure is not the missing exact historical invocation.
3. Inspect `sdkSystemConfig.error` and its nested `causes`, together with the controls from that same run. If the historical condition recurs, distinguish `RpcError` → `UnknownRpcError` → `getaddrinfo EAI_AGAIN api.hideki2.infra.testnet.somnia.network` from connection refusal, a different transport error, or a successful read. A future run is not guaranteed to reproduce a transient historical DNS condition; retain its actual result rather than claiming a match.
4. Preserve the genesis guard and existing endpoints. Do not bypass the guard, change networks, inject a mocked failure, sign, or send transactions to obtain a reproduction.

## Expected

A diagnostic should distinguish failure to **read** the block used by a genesis check from a successfully observed retired or incompatible genesis. The supported interpretation comes from the [historical SDK diagnosis](../evidence/g0/SDK_DIAGNOSIS.md), lines 5–9: its inspection of SDK `0.32.1` `dist/client.js` / `makeGenesisCheck` found a block-1 read failure wrapped by this message, whereas a retired hash would raise `NotConfiguredError` with a retired-generation explanation.

This report requests clear transport-versus-genesis diagnostic attribution, not removal or weakening of that check. No verified SDK API guarantee about the exact error wording is claimed; whether a product/documentation change is warranted remains inconclusive.

## Actual

The [22:44 preserved log](../evidence/g0/sdk-diagnostic-2026-10-24T22-44Z.txt) contains:

```text
RpcError: @somnia-chain/markets-sdk: rpc getBlock failed: genesis check failed
  [cause]: UnknownRpcError: An unknown RPC error occurred.
  Details: getaddrinfo EAI_AGAIN api.hideki2.infra.testnet.somnia.network
  Version: viem@2.57.11
  ... code: 'EAI_AGAIN', syscall: 'getaddrinfo'
  ... hostname: 'api.hideki2.infra.testnet.somnia.network'
```

Its WebSocket URL is `wss://api.hideki2.infra.testnet.somnia.network/ws` (line 72). The [22:45 retry](../evidence/g0/sdk-retry-2026-10-24T22-45Z.json) repeats the same top-level message and DNS cause. This establishes repeated historical DNS/transport failure in that execution environment, **not** that the SDK caused DNS failure.

The practical diagnostic concern is that the top-level `genesis check failed` text alone does not establish a wrong or retired deployment. The earlier [22:28 direct-read control](../evidence/g0/doctor-2026-10-24T22-28-16.300Z.json) observed chain `50383` and a block-1 read, but did not establish the cause of its SDK failure. The later [22:50 cross-machine control](../evidence/g0/doctor-2026-10-24T22-50-12.271Z.json) instead records connection refusal for HTTP and SDK reads. These timestamped observations do not establish present reachability or an ongoing outage.

## Evidence

| Report field | Preserved evidence / limit |
|---|---|
| Reproduction command | Exact 22:44 and 22:45 historical shell invocations are **not recorded** in these artifacts. The 22:44 stack includes an inline-module `[eval1]` frame, not a recoverable command. `npm run doctor:readonly` above is the existing procedure for a later authorized run and was **not run** for this report. |
| Actual output/log path | [SDK diagnosis](../evidence/g0/SDK_DIAGNOSIS.md), lines 3–15; [nested DNS log](../evidence/g0/sdk-diagnostic-2026-10-24T22-44Z.txt), lines 1–29, 72; [repeated DNS cause](../evidence/g0/sdk-retry-2026-10-24T22-45Z.json), lines 1–7. |
| Control evidence | [22:28 doctor](../evidence/g0/doctor-2026-10-24T22-28-16.300Z.json), lines 18–40, 68–94: direct reads passed and SDK failed, cause omitted. [22:50 doctor](../evidence/g0/doctor-2026-10-24T22-50-12.271Z.json), lines 18–37, 84–109: separate `ECONNREFUSED`, not a DNS reproduction. The diagnosis identifies this as a browser-machine native-terminal cross-check. |
| Code commit and source lines | Historical source commit is **not recorded** in these artifacts. The DNS stack names installed SDK `dist/client.js:1170`, `dist/client.js:1237` and `dist/perp/system.js:37`. Current repository procedure: [doctor](../scripts/doctor-readonly.ts), lines 9–23 and 27–28; [network/client configuration](../packages/protocol/index.ts), lines 7–11; [package script and pins](../package.json), lines 7, 15, 22–26. No invented commit or replacement source capture is supplied. |
| Transaction and block, if applicable | DNS failure has no successful block response or transaction hash. Retry and doctor artifacts record zero transactions. The 22:28 control's `genesisBlock1` is historical block `1`, not a block obtained by the DNS-failing call or a current acceptance result. |
| Independent verification result | No new independent verification. Historical controls above exercise different reads/environments and must not be collapsed into a common cause. Current reproduction **NOT_RUN**. |
| Duplicate check | **NOT_RUN**. No `duplicate_of`, first-report claim, organizer validation or reward entitlement is established. |

## Environment

| Field | Sourced value / missing detail |
|---|---|
| Node / npm | The [22:28](../evidence/g0/doctor-2026-10-24T22-28-16.300Z.json) and [22:50](../evidence/g0/doctor-2026-10-24T22-50-12.271Z.json) doctor records, lines 11–16, report Node `v24.22.1`, npm `11.9.0`. The standalone 22:44 DNS log does not independently record Node/npm versions. |
| SDK and lockfile | [SDK diagnosis](../evidence/g0/SDK_DIAGNOSIS.md), line 3, identifies pinned `@somnia-chain/markets-sdk 0.32.1`; both doctor version records agree. The DNS log directly records viem `2.57.11`. [package.json](../package.json) and [package-lock.json](../package-lock.json) declare both pins. The doctor records retain their historical lockfile digest; no fresh digest or exact historical repository commit is claimed here. |
| OS/runtime and DNS | Exact historical OS/version, DNS resolver, DNS configuration and network-egress policy are **not recorded** in the named artifacts. The SDK diagnosis distinguishes the original execution environment from a browser-machine native-terminal cross-check; it does not identify their OS or resolver. Today's host details are not substituted for them. |
| Network and chain ID | Configured Somnia Tokyo / Hideki, `50383`, from [repository configuration](../packages/protocol/index.ts), lines 7–11; independently observed by the historical 22:28 direct HTTP/WS checks. HTTP: `https://api.hideki2.infra.testnet.somnia.network`; WS: `wss://api.hideki2.infra.testnet.somnia.network/ws`. The failed DNS call itself did not obtain a chain ID. |
| Target contract/pool | Configured margin bank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, sourced from the same configuration and 22:28 system-config control. No pool is required for the system-config call; historical doctor `poolConfigured` is `false`. Failure occurs in the preliminary block read, not a demonstrated contract execution failure. |
| Public account address | N/A. Both doctor records show `ownerConfigured: false` and `signerConfigured: false`; no public owner address is required for this finding. |
| Captured at | DNS log: 2026-10-24 around 22:44 UTC, from its filename and dated diagnosis; no exact timestamp in the text itself. Retry: `2026-10-24T22:45:38.126Z`. Doctor controls started at `2026-10-24T22:28:16.300Z` and `2026-10-24T22:50:12.271Z`. No new capture timestamp is asserted. |

## Provenance, non-claims and submission boundary

This self-contained report reorganizes existing repository evidence. Phrases such as “fresh” or “current execution environment” in the dated SDK diagnosis refer to that historical investigation, not this phase. No deleted, unavailable or new doctor artifact is relied on.

- No proven SDK implementation defect, SDK-caused DNS failure, deployment mismatch, retired-genesis detection, current outage or current live pass is claimed.
- No cause is assigned to an older failure that omitted nested causes. `ECONNREFUSED` is not relabeled as `EAI_AGAIN`.
- Genesis protection remains required; no bypass or weakening is requested. No signing or transactions were performed for this report, and it does not satisfy owner/lifecycle acceptance gates.
- This local filing is neither external filing nor organizer acceptance. Before any authorized submission, reproduce in the then-current pinned environment, check duplicates by root cause/version/entry point/impact, and confirm it is non-security feedback. Security vulnerabilities must remain private and use the designated `security@dreamdex.io` channel only with separate authorization; no external message was sent in this phase.
