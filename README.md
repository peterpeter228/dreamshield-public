# DreamShield published composite source

DreamShield is a native perps stop-protection desk for DreamDEX account owners on Somnia Tokyo testnet **50383**. It explains position/stop mismatches, prepares unsigned calls and reconciles native readback. Configuration is not a fill or loss guarantee.

## Identity and status

- Published composite SDK source: [`78c94e6347bb3009daabd6a03f3660d5065bd2a3`](https://github.com/peterpeter228/dreamshield-public/tree/78c94e6347bb3009daabd6a03f3660d5065bd2a3/reviewer), branch `review/dreamshield-20261105`. Reviewed EOA SDK code from local commit `75c2ffb6f73899397f519ab33259fbda43892a09` is included; parent `a37ad13967d582cda51ad8d9eea0730329127a3e` was the earlier public baseline without this SDK.
- The frozen archive and pre-publication metadata retain their historical **unpublished composite** status; they are not a Git commit. The source projection was subsequently published in the composite linked above. It projects the frozen public 101 reviewer text files plus root README, then overlays only four exact local-code files from `75c2ffb6f73899397f519ab33259fbda43892a09`, the `local:stop` script and sanitized documentation. It does not contain private history or a Git checkout.
- Frozen pre-publication projection: **105 reviewer UTF-8 files + root README = 106 payload files**; its inventory hashes remain historical, and this docs-only clarification is recorded separately. After reference materialization: 106 reviewer source/reference files, excluding dependencies/build output. External `source-inventory.json` and archive allowlist identify exact bytes without self-reference. The old 101/102 figures describe the frozen public baseline only.
- `966ee5170cd57064e7bf8558ee751ac1953709ac` is runtime ancestry, not the current public tip. Local SDK review PASS0, 22 focused checks/typecheck and parent 94-call proof are historical November 5 results, not rerun here.
- [Public read-only demo](https://dreamshield-read-only-reviewer-demo-read-only-7qstzfkd68.openbot.site); five frozen hosting files, 830234 bytes; expires 2026-12-05 09:11 UTC. Synthetic/replay only, no mutation surface.
- No DreamShield-issued actual order/readback, G1, Build ID or submission receipt exists. New DreamShield MVP **NOT_SUBMITTED / NOT_READY**. Feedback 50928 **Under Review** is separate. No eligibility, award, complete MVP or formal audit claim.

## Run this candidate

Extract the supplied archive into an empty directory, then:

```sh
cd reviewer
# Node 24.22.1; npm; committed exact package-lock.json
npm ci
npm run build:reviewer
python3 -m http.server 4312 --bind 127.0.0.1 -d dist-reviewer/web
```

Open http://127.0.0.1:4312/. These are generic reproduction instructions: closeout validation reused existing exact-lock dependencies in extraction only; it did **not** run npm ci or fresh-clone installation. The build restores the original 6680-byte compatibility reference, SHA-256 `2ae79da9d2e8ad7e50f4b967043f970a664a350c28f3fb48c01640c373077e5a`, then builds five static files. [Reviewer guide](reviewer/docs/REVIEWER_STATIC.md), [product README](reviewer/README.md), [local SDK](reviewer/docs/LOCAL_SDK.md).

The normal Express replay instructions are in the product README. Owner execution requires a genuine Git checkout/source identity and separately valid authority/state; this archive is no live-owner attestation. No fake `.git` is supplied.

## Evidence and links

The historical November 4 fixture remains byte-identical UNKNOWN / READ_FAILED; official-UI opening is not DreamShield execution. November 5 complete aggregates instead observed F36 NO_POSITION and Wallet1 NEEDS_REVIEW due its existing absolute 0.1 USDso SL. All old 15-second observations expired; neither is current coverage.

User-published @bbchjfgg posts tagging @DreamDEXSomnia, reread by Rio November 6:

- https://x.com/bbchjfgg/status/2118280088601161963
- https://x.com/bbchjfgg/status/2118280206180094237
- https://x.com/bbchjfgg/status/2118280270898139369

[Official MVP bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail). Corroborated deadline: 2026-11-15 14:30 UTC; no portal action performed here. The SDK delta was published in composite `78c94e6347bb3009daabd6a03f3660d5065bd2a3` (parent `a37ad13967d582cda51ad8d9eea0730329127a3e`); frozen proposal records describe the earlier pre-publication stage. No main/history/visibility change is proposed or authorized by this artifact.
