# DreamShield reviewer product

The repository root is **legacy public material**, retained unchanged. The current sanitized product is the separate [`reviewer/`](https://github.com/peterpeter228/dreamshield-public/tree/review/dreamshield-20261105/reviewer) package on **review/dreamshield-20261105**. Do not run the legacy root as this reviewer product.

Open the [read-only reviewer demo](https://dreamshield-read-only-reviewer-demo-read-only-7qstzfkd68.openbot.site). It has no wallet or chain-write entrypoint. The recorded mode is historical UNKNOWN / READ_FAILED, not G1. Hosting expires on December 5, 2026 at 09:11 UTC.

User-published posts, checked by Rio:

- [Product and demo](https://x.com/bbchjfgg/status/2118280088601161963)
- [Historical stop-risk evidence](https://x.com/bbchjfgg/status/2118280206180094237)
- [Public source and run instructions](https://x.com/bbchjfgg/status/2118280270898139369)

Use Node **24.22.1**:

```sh
git clone --branch review/dreamshield-20261105 --single-branch https://github.com/peterpeter228/dreamshield-public.git
cd dreamshield-public/reviewer
npm ci
npm run build:reviewer
python3 -m http.server 4312 --bind 127.0.0.1 -d dist-reviewer/web
```

Open http://127.0.0.1:4312/. The exact output is `reviewer/dist-reviewer/web/index.html` plus its relative assets. [Static guide](reviewer/docs/REVIEWER_STATIC.md). No API server, wallet connection or external runtime is needed. The normal local Express app remains available separately as documented in `reviewer/README.md`.

Source version: **101-file UTF-8 text** reviewer inventory SHA-256 **13d5272a528235fcce6c6452eca8984ba3fdca632c8e5c9103087d3246e1b189** (sorted relative paths, exact bytes and SHA-256 per file; inventory maintained outside `reviewer/` to avoid a self-digest). This inventory includes the README link/status update. The runtime implementation remains the version published at [`966ee5170cd57064e7bf8558ee751ac1953709ac`](https://github.com/peterpeter228/dreamshield-public/commit/966ee5170cd57064e7bf8558ee751ac1953709ac). The earlier inventory `64f7f48f0c7c89805c5ca4a3928382ae64344e657fd19617234678e0532611bf` identifies that frozen source snapshot, not these updated documentation bytes.

Text-only publication excludes the binary `reviewer/evidence/compatibility-2026-11-03/evm-results.json.gz`. Source-owned `reviewer/scripts/materialize-reviewer-reference.mjs` embeds its exact original gzip bytes and validates **6680 bytes / SHA-256 2ae79da9d2e8ad7e50f4b967043f970a664a350c28f3fb48c01640c373077e5a** before creating it relative to the helper. `npm run build:reviewer` and `npm test` (via `pretest`) run the helper: identical reference is a no-op; different existing reference is refused, never overwritten. No postinstall hook, added dependencies or network scripts. After materialization: **102 source/reference files** (101 published text + one generated exact-byte reference), excluding dependencies/build output. The private tracked gzip and initial 92-file archive are unchanged. Hosting remains a separate five-file inventory, with no helper or compatibility gzip.

Synthetic scenarios use a labelled fictional clock. The real November 4 capture remains historical **UNKNOWN / READ_FAILED**, `knownIdsOnly`, absolute **0.1 USDso** SL / **9,999 bps**. Recheck does not make it fresh. Downloads are snapshot-bound static observations, not G1 or origin attestations. No DreamShield-originated real order, G1 lifecycle, completed app-order/submission acceptance or hosted visual pass is claimed.
