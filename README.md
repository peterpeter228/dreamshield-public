# DreamShield

A native perps stop-protection desk for DreamDEX on Somnia Tokyo testnet. Detect a missing stop loss, prepare a wallet-owned native reduce-only stop, and reconcile its actual chain state instead of trusting a successful transaction alone.

Intended users: isolated Somnia Tokyo testnet perps account owners checking native stop-loss coverage after position or stop changes.

**Current status:** runnable local replay and development. Not a production risk engine. No live trade, stop placement, cancellation, public deployment, social post or competition submission is claimed. See [STATE](docs/STATE.md) and [evidence](evidence/manifest.json).

## Run locally

Requirements: Node **24.22.1**, npm and Git. No API key or wallet secret required.

    git clone https://github.com/peterpeter228/dreamshield-public.git
    cd dreamshield-public
    npm ci
    npm run typecheck
    npm test
    npm run build
    npm run demo:replay

Open http://127.0.0.1:3000. The replay scenario selector uses clearly labelled fictional positions, never silently replaces live data. Refresh, inspect protection reasons, change scenarios and export the evidence JSON. The server binds loopback by default.

The 12 replay scenarios retain the original eight: `unprotected`, `protected`, `partial`, `short`, `stale`, `oco-broken`, `no-position` and `unknown`. Four additional cases expose distinct safety questions:

| Scenario | Offline assessment |
|---|---|
| `tp-only` | `NEEDS_PROTECTION`: a closing-side take profit is not a stop loss. |
| `wrong-side-sl` | `NEEDS_PROTECTION`: a long position's buy/GTE stop has the wrong closing direction. |
| `trigger-met` | `NEEDS_REVIEW` + `TRIGGER_CONDITION_MET`: reconcile execution and remaining exposure. |
| `residual-stops` | `NO_POSITION` + `RESIDUAL_STOPS`: flat does not mean pending stops disappeared. |

The UI explains reasons with friendly labels; exported assessments retain their raw reason codes. See the [sourced DreamShield / OrderAnchor comparison](docs/DIFFERENTIATION.md) and [90-second replay walkthrough](docs/DEMO_SCRIPT.md). These are this app's demonstrations, not proof a competitor lacks equivalent features. Journal/recovery/export capabilities overlap OrderAnchor's author claims, which were not independently verified here.

    npm run doctor:readonly

The doctor checks live public endpoints, chain identity, contracts and SDK integration. A doctor pass is **not** an executed trading workflow. Network failures remain failures, not empty accounts.

## Modes

- `replay` (default): fixtures, no wallet mutation endpoints.
- `live-readonly`: set `APP_MODE=live-readonly DEMO_OWNER_ADDRESS=<public-address> DEMO_POOL_ADDRESS=<verified-pool>`. No signer and no transaction routes.
- `live-owner`: isolated local instance only. Read [owner handoff](docs/LIVE_HANDOFF.md) first. Explicit `READ_ONLY=false ALLOW_TESTNET_WRITES=true` are required. Never expose it through a tunnel or reverse proxy. Use a disposable testnet wallet; signing remains in its native wallet confirmation. Do not add private keys to environment files.

Environment variables are read from the process; `.env.example` is a template, not automatically loaded. Export chosen values or use your shell's normal environment mechanism.

## What protection means

A fresh complete chain snapshot must identify the correct owner, pool, registry, side, reduce-only intent and trigger direction. Quantity zero means the remaining whole position **at trigger time**. A fixed quantity does not scale up when the position grows. TP alone is not SL. Multiple stops are not added together to manufacture coverage. Native stops can fail or execute with slippage; verified configuration is not guaranteed execution or protection from loss.

Stale, incomplete, mismatched or uncertain data immediately withdraws the verified verdict. The indexer is discovery infrastructure, not chain truth. Successful receipts are reconciled with canonical block and native stop state. Unknown wallet outcomes are persisted before a retry could be attempted.

## Safety boundaries

Public/replay instances have no mutation routes, signing keys or server-side signer. Local owner routes require loopback, exact Origin and per-process CSRF token. SQLite journals reserve operations before wallet submission and keep unresolved attempts locked through restart. Read-only operation does not ask for wallet permissions. No bot permission grants are silently combined with stop creation.

This project is testnet-only (chain **50383**). It does not implement mainnet, automated reverse IOC, synthetic trailing, arbitrage, market making, managed custody or guaranteed returns.

## X posts

| Post | Status | URL |
|---|---|---|
| 1 | Not published yet | No URL exists |
| 2 | Not published yet | No URL exists |

The recorded official requirement is 2–3 real posts tagging `@DreamDEXSomnia`. These placeholders do not satisfy publication. [Draft copy](docs/SUBMISSION_DRAFT.md#x-drafts-not-posted) is **not posted**; publication requires separate owner authorization and a current requirements/tag check. `xPost1` and `xPost2` remain null.

## Verify and submit honestly

**Official submission: BLOCKED.** Local replay, offline verification and two historical-evidence Feedback reports are available; real orders/readback, whitelist verification, judge access and published X links remain missing or unverified. See the [PASS/FAIL/BLOCKED readiness checklist](docs/SUBMISSION_READINESS.md), [local Feedback index](feedback/README.md), [differentiation](docs/DIFFERENTIATION.md), and [demo script](docs/DEMO_SCRIPT.md).

    npm run test:judge

`test:judge` is an explicit **offline aggregate**: typecheck, the existing test suite, production build, and evidence-schema verification, in that order with `&&` failure propagation. Only its final stage uses the verifier's existing offline option: `npm run verify:evidence -- evidence/manifest.json --allow-incomplete`. That option permits valid but incomplete live evidence; it does not turn malformed evidence into a pass or establish live acceptance, judge access, publication or submission.

Standalone readiness checks remain strict:

    npm run verify:evidence
    npm run submission:check

These standalone commands deliberately exit nonzero while real owner evidence or submission prerequisites are missing; do not bypass their strict readiness checks with `--allow-incomplete`. Unit tests, a successful build and the offline aggregate do not satisfy live gates. See [submission draft](docs/SUBMISSION_DRAFT.md), [demo script](docs/DEMO_SCRIPT.md), [official-rule verification](research/competition-verification.md) and [known limitations](docs/KNOWN_LIMITATIONS.md).

## Architecture

`packages/domain`: pure bigint protection assessment and operation rules. `packages/protocol`: pinned Markets SDK 0.32.1 adapter and read-only doctor. `packages/storage`: durable SQLite operation journal. `apps/server`: mode and origin enforcement. `apps/web`: evidence-first responsive desk. `fixtures`: explicitly synthetic replay. `evidence`: machine-readable results and honest gate status.

The published dependency `@somnia-chain/markets-sdk@0.32.1` is pinned in [package.json](package.json) and [package-lock.json](package-lock.json). See the extracted [read-only SDK ABI](packages/protocol/sdk-abi.ts), [transaction ABI](packages/protocol/transaction-abi.ts), retained [MIT notice](packages/protocol/SDK-LICENSE.txt), and [third-party provenance](docs/THIRD_PARTY_NOTICES.md). Do not treat historical research addresses or examples as verified live configuration; the doctor must revalidate them in the execution environment.

## Review and operation evidence

See [independent review](review/INDEPENDENT_REVIEW.md), [local operation guide](docs/OPERATIONS.md), and [browser acceptance record](tests/browser/QA-2026-10-24.md). The historical recovery-suite result recorded 119 offline tests passing; its logs are in evidence/tests/argon-2026-10-25. That result is not a fresh pass claim for the expanded replay scenarios; see [STATE](docs/STATE.md) for current verification scope. SDK DNS/connection failures were observed on 2026-10-24; Phase2 did not recheck transport, so present reachability is unverified. Live owner evidence remains unavailable. The 2026-10-25 Argon static review was independently verified and remediated; see [verification matrix](review/ARGON_VERIFICATION_2026-10-25.md). It is not a formal audit or live acceptance.

For the single consolidated remaining owner checklist, see [owner handoff](docs/OWNER_HANDOFF.md).
