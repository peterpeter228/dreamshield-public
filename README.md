# DreamShield

A native perps stop-protection desk for DreamDEX on Somnia Tokyo testnet. Detect a missing stop loss, prepare a wallet-owned native reduce-only stop, and reconcile its actual chain state instead of trusting a successful transaction alone.

Intended users: isolated Somnia Tokyo testnet perps account owners checking native stop-loss coverage after position or stop changes.

**Current status:** runnable replay and private development; **G1 NOT_RUN / submission BLOCKED**. Locked MVP: one isolated owner, one doctor-verified **BTC** market, chain **50383**, position = **exactly one market-minimum order** (~13 grid lots; `AUTH-20261027-DREAM-LOT-SIZE`) and **1–2 concurrent native stops** (owner may tighten). No live trade, stop placement, cancellation, public deployment, social post or competition submission is claimed. G1 live signs still wait for owner isolated EOA. See [STATE](docs/STATE.md) for the exact private scope/authorization, historical versus current results and [evidence](evidence/manifest.json).

## Run locally

Requirements: Node **24.22.1**, npm and Git. No API key or wallet secret required.

    git clone https://github.com/peterpeter228/dreamshield.git
    cd dreamshield
    npm ci
    npm run typecheck
    npm test
    npm run build
    npm run demo:replay

Open http://127.0.0.1:3000. Express serves built `dist/web`, not unbuilt Vite source; rebuild before restarting after source changes. The scenario selector uses labelled fictional positions, never silently replaces live data. Refresh, inspect protection reasons, change scenarios and export evidence JSON; loopback is default. Actual built replay smoke exercised all 12 scenarios, unsigned preview/disabled signing and selected cancellation, 15-second aging/read-failure revocation and exact-body download at CSS1376×771 DPR1. No wallet Connect/Review click. [Current evidence note](evidence/mvp-2026-10-27/NOTES.md) separates those observed results from synthetic capture/persistence and still-NOT_RUN real owner/G1.

The 12 replay scenarios retain the original eight: `unprotected`, `protected`, `partial`, `short`, `stale`, `oco-broken`, `no-position` and `unknown`. Four additional cases expose distinct safety questions:

| Scenario | Offline assessment |
|---|---|
| `tp-only` | `NEEDS_PROTECTION`: a closing-side take profit is not a stop loss. |
| `wrong-side-sl` | `NEEDS_PROTECTION`: a long position's buy/GTE stop has the wrong closing direction. |
| `trigger-met` | `NEEDS_REVIEW` + `TRIGGER_CONDITION_MET`: reconcile execution and remaining exposure. |
| `residual-stops` | `NO_POSITION` + `RESIDUAL_STOPS`: flat does not mean pending stops disappeared. |

The UI explains reasons with friendly labels; exported assessments retain their raw reason codes. See the [sourced DreamShield / OrderAnchor comparison](docs/DIFFERENTIATION.md) and [90-second replay walkthrough](docs/DEMO_SCRIPT.md). These are this app's demonstrations, not proof a competitor lacks equivalent features. Journal/recovery/export capabilities overlap OrderAnchor's author claims, which were not independently verified here.

    npm run doctor:readonly

The doctor checks live public HTTP/WS endpoints, chain/genesis identity, contracts and pinned SDK integration without signing or sending. Its report separates transport, verified market and owner completeness; a market diagnosis without an owner is not complete owner acceptance. A doctor pass is **not** an executed trading workflow or proof of owner-machine reachability. Network failures and incomplete reads remain failures/unknowns, not empty accounts. Use only a market the doctor actually verifies; never copy an unverified pool address from an example.

Actual 2026-10-27 final doctor: **PASS / transport-and-verified-market, exit 0** under Node v24.22.1; BTC/USDso diagnosed/verified, owner **NOT_CONFIGURED** in that artifact (pre-address-set), `g0Complete: false`, G1 NOT_RUN, no signing/send. [Artifact](evidence/g0/doctor-2026-10-27T05-32-53.000Z.json), [command/exit log](evidence/tests/mvp-doctor-final-2026-10-27.txt). Docs now set **DEMO_OWNER** `0x04b0A7AFD4Ab71C5d49c4bd578C2D9B8eA7DF36E` (`AUTH-20261027-DREAM-G1-AUTO`; key in hunter env only); accepted owner pool remains null; [STATE](docs/STATE.md#current-read-only-verified-market--not-owner-acceptance) records exact addresses/parameters. Size is locked to BTC market-min (~13 grid lots) per `AUTH-20261027-DREAM-LOT-SIZE`; stops max 1–2. **G1 signs still NOT_RUN** (funding in flight). No automatic market switch or amount above market-min is authorized.

## Modes

- `replay` (default): fixtures, no wallet mutation endpoints.
- `live-readonly`: set `APP_MODE=live-readonly DEMO_OWNER_ADDRESS=<public-address> DEMO_POOL_ADDRESS=<verified-pool>`. No signer and no transaction routes.
- `live-owner`: isolated local instance only. Read [live handoff](docs/LIVE_HANDOFF.md) first. Explicit `READ_ONLY=false ALLOW_TESTNET_WRITES=true` are required for owner routes; those settings are not execution authorization. The no-send boundary is unsigned preview → reserve fresh unsigned draft → inspect/export → discard. Never click **Review in owner wallet** under this ticket. Never expose owner mode through a tunnel or reverse proxy. No server signing keys; do not add private keys to environment files or request wallet permissions for read-only use.

Environment variables are read from the process; `.env.example` is a template, not automatically loaded. Export chosen values or use your shell's normal environment mechanism. Both doctor and application use **`DEMO_OWNER_ADDRESS` / `DEMO_POOL_ADDRESS`**, with no alternate-name aliases. Template DEMO_OWNER is `0x04b0A7AFD4Ab71C5d49c4bd578C2D9B8eA7DF36E` (public only; `AUTH-20261027-DREAM-G1-AUTO`); never put a private key in env files — hunter holds `DREAMSHIELD_G1_PRIVATE_KEY`. The registration payout wallet is not the trading owner. Use STT faucet gas and paper USDso; derive atomic size from verified decimals/minimum/lot grid and read the native-stop deposit from the verified registry. The exchange TP/SL 0.15 STT note is not a hardcoded native deposit.

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

**Official submission: BLOCKED.** Local replay, historical offline verification and two historical-evidence Feedback reports are available; real orders/readback, whitelist approval, reviewer access and published X links remain missing or unverified. Whitelist ticket **DX-0327 WAITING_EXTERNAL** is not permission to contact organizers. Plan against **2026-11-02 06:59 Asia/Shanghai**, not the conflicting later body time. See the [PASS/FAIL/BLOCKED readiness checklist](docs/SUBMISSION_READINESS.md), [local Feedback index](feedback/README.md), [differentiation](docs/DIFFERENTIATION.md), and [demo script](docs/DEMO_SCRIPT.md).

    npm run verify:evidence -- evidence/manifest.json --submission evidence/submission.json
    npm run submission:check

Run independently: strict checks exit **2 / BLOCKED** while live evidence or submission prerequisites are missing. `submission:check [submission-metadata-path]` defaults to `evidence/submission.json`; `verify:evidence [manifest-path] --submission <submission-metadata-path>` preserves historical-manifest input and explicitly ingests the same live references. `liveEvidence` starts null; actual doctor/lifecycle file paths and raw-file SHA-256 digests resolve relative to the containing metadata file, not the working directory. See [reference format and checksum limits](docs/OPERATIONS.md#evidence-references-and-checkers). File-only checks do not probe the current chain, authenticate file origin, edit metadata or turn replay into live proof. Offline tests/build and incomplete-schema mode never satisfy live gates. See [draft-only Build fields](docs/SUBMISSION_DRAFT.md), [official-rule verification](research/competition-verification.md) and [known limitations](docs/KNOWN_LIMITATIONS.md).

## Architecture

`packages/domain`: pure bigint protection assessment and operation rules. `packages/protocol`: pinned Markets SDK 0.32.1 adapter and read-only doctor. `packages/storage`: durable SQLite operation journal. `apps/server`: mode and origin enforcement. `apps/web`: evidence-first responsive desk. `fixtures`: explicitly synthetic replay. `evidence`: machine-readable results and honest gate status.

Dependencies are pinned in package-lock.json. The SDK is used through its published package. Do not treat source-guide addresses or examples as verified live configuration; the doctor must revalidate them in the execution environment.

## Review and operation evidence

See [independent review](review/INDEPENDENT_REVIEW.md), [operations](docs/OPERATIONS.md), and [actual evidence notes](evidence/mvp-2026-10-27/NOTES.md). Final classification-normalized **Node 24.22.1** typecheck/test/build exited **0**, **401/401 offline tests/16 files**; [final measured inputs/logs](evidence/mvp-2026-10-27/classification-verification.json). All loader rejections now share status and file-only/nonattestation fields: missing metadata/files MISSING, replay/read-only HISTORICAL_OR_REPLAY, malformed/unsupported input INVALID. Both rejection eligibility flags stay false; no trading/auth change. Sixteen actual checker invocations exercised these cases and synthetic live-owner acceptance; default strict checkers still exit 2/BLOCKED with real claims false/null and G1 NOT_RUN. Prior 399/16 wrapper and original 391/15, original browser/synthetic capture/restart and six/14-invocation CLI results remain historical. The integration-owner built replay re-exercise also preceded this CLI-only correction; UI/server source unchanged, not final-source browser/persistence reruns. Initial 390-pass/1-fail assertion history remains disclosed; durability/rollback checks retained. Historical 90/119/156-test checkpoints and 2026-10-24 network failures remain in [STATE](docs/STATE.md). Argon remediation is not a formal audit, post-fix external approval or live acceptance.

For the single consolidated remaining owner checklist, see [owner handoff](docs/OWNER_HANDOFF.md).

Supplied locked-scope facts identify https://github.com/peterpeter228/dreamshield-public as PUBLIC proof. The integration owner's 2026-10-27 read-only check observed PUBLIC, viewerPermission ADMIN and main `8e85e468a231350ebacbb2dbce0f5c746d47bd66`; this is not reviewer access or a new synced implementation. Inherited historical logs contain absolute workstation paths, so the selected WP3 fallback is **NOT_PUSHED** local delivery with contamination disclosure and a separate clean local candidate, not a history rewrite. Actual delivery artifacts/verification belong in [STATE](docs/STATE.md) and the receipt; none is claimed here. Product remains PRIVATE. No visibility change, Submit Build or X publication is authorized.
