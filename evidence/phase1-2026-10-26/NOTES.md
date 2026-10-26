# Phase1 — offline assessment differentiation

Scope: local replay only, testnet-50383 model. No wallet connection, signature, transaction, chain probe, deployment, publication or submission. G1 remains **BLOCKED_EXTERNAL / NOT_RUN**. This is not live acceptance or an audit.

## Exercised checks

- Pinned Node **24.22.1**, obtained through `npm exec --yes --package=node@24.22.1`; default host Node was 20.19.2. Installed the unchanged lockfile using `npm ci --no-audit --no-fund` under the pinned runtime.
- `npm run typecheck && npm test && npm run build`: exit 0; **156 tests across 10 files**. Full output: [offline-checks.txt](offline-checks.txt). Existing large lazy protocol-chunk warning remains; no chunk-size suppression added.
- Launched `apps/server/index.ts` with `APP_MODE=replay READ_ONLY=true ALLOW_TESTNET_WRITES=false HOST=127.0.0.1 PORT=3000`; browser used the actual production-built UI and real local HTTP API.
- Actual observed browser viewport **1408×871 CSS pixels**, device scale factor 1. Requested 1440×1000 was not applied by the browser tool; recorded actual dimensions instead. No new responsive/mobile claim.

## Actual browser outcomes

All 12 selector choices exercised after the build. [browser-scenarios.json](browser-scenarios.json) preserves visible verdict/reasons, raw codes, stop rows, preview eligibility and horizontal-overflow observations. No document horizontal overflow in these desktop observations.

| Scenario | Observed verdict | Raw diagnostic |
|---|---|---|
| `tp-only` | Needs protection | `NO_MATCHING_SL`, `TAKE_PROFIT_ONLY` |
| `wrong-side-sl` | Needs protection | `NO_MATCHING_SL`, `WRONG_SIDE_SL` |
| `trigger-met` | Needs review | `TRIGGER_CONDITION_MET` |
| `residual-stops` | No position | `NO_POSITION`, `RESIDUAL_STOPS` |
| `protected` | Configuration verified | Whole-at-trigger, standalone SL, execution not guaranteed |
| `partial` | Needs review | `PARTIAL_COVERAGE` |
| `oco-broken` | Needs review | `OCO_LINK_INVALID` |
| `stale` | Unknown | `STALE_DATA` |
| `unknown` | Unknown | `READ_FAILED`; incomplete discovery warning remains visible |
| `unprotected`, `short` | Needs protection | `NO_MATCHING_SL` |
| `no-position` | No position | `NO_POSITION` |

Friendly explanations were visible directly beneath each verdict, while raw codes remained in Evidence details. Actual full-page screenshots: [TP only](tp-only.png), [wrong side](wrong-side-sl.png), [trigger met](trigger-met.png), [residual stops](residual-stops.png). TP-only screenshot visually inspected for readable labels, stop terms and replay disclaimers.

Additional actual interactions:
- Selected residual stop #1: **Prepare selected cancellation remained disabled**, even with a stop selected.
- TP-only → trigger price 2900 → Preview stop: unsigned replay preview, Sell/reduce-only, chain 50383, native deposit `150000000000000000`, “No transaction has been requested” and “Local owner signing unavailable”.
- Rechecked residual-stops, expanded Evidence details and clicked Export evidence JSON. Parsed the actual completed browser download: scenario `residual-stops`, `NO_POSITION` plus `RESIDUAL_STOPS`, owner/signing disabled, `transactions: []`, `liveWorkflowVerified: false`. Original downloaded bytes preserved in [downloaded-residual-stops-evidence.json](downloaded-residual-stops-evidence.json); unsigned checksum is not chain proof.
- Collected browser diagnostics: no application error entries; all **25 observed requests were GET**, no mutation requests. [browser-guards.json](browser-guards.json). This is scoped browser instrumentation, not a live transaction audit.

Initial harness attempts were not passes: selecting the already-selected option cleared the panel without a scenario-change fetch, concurrent download-wait/click calls were rejected by the tool, and an input selector was corrected from inspection. The successful run changed selector values, used serialized browser actions and the observed accessible input. No app behavior was changed to accommodate the harness.

Browser tab and temporary replay service were closed after smoke. No throwaway test scripts remain. [verification.json](verification.json) records tested source/build digests separately from the historical remediation manifest. Artifact clocks are preserved as observed (the host/browser reported October 25); the October 26 directory is the phase label, not a rewritten capture timestamp.

## Still untested / blocked

No live transport recheck, owner lifecycle, receipt/readback, fills, wallet signing, physical mobile, new responsive matrix, post-fix external review, competition eligibility or publication was exercised. Older browser/chain/persistence artifacts remain historical. OrderAnchor statements in [DIFFERENTIATION](../../docs/DIFFERENTIATION.md) are attributed author claims, not independently executed competitor results.
