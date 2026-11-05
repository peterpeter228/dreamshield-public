# Static read-only protection desk

This is the existing React protection view and pure domain evaluator with packaged synthetic scenarios and sanitized recorded data. No API server, wallet/provider, connect, signing, draft or cancellation surface is included. Only same-origin packaged JSON assets are fetched; no RPC, indexer, CDN or external runtime is used. Serve over localhost HTTP or secure HTTPS (WebCrypto is required), not file://. Once packaged assets are available, no external network is needed.

## Reproduce

Use Node **24.22.1** and the committed exact lockfile:

```sh
git clone --branch review/dreamshield-20261105 --single-branch https://github.com/peterpeter228/dreamshield-public.git
cd dreamshield-public/reviewer
npm ci
npm run build:reviewer
python3 -m http.server 4312 --bind 127.0.0.1 -d dist-reviewer/web
```

Open http://127.0.0.1:4312/. Output is exactly `dist-reviewer/web/index.html` plus relative packaged assets. The build explicitly renames its separate static HTML entry; the normal Express app and `npm run build` are unchanged. Never serve the source tree as the static site. No SPA fallback or API route is needed.

### Text-only reference transport

The Git-published reviewer source excludes the binary `evidence/compatibility-2026-11-03/evm-results.json.gz` and includes its exact original gzip bytes as base64 in the source-owned `scripts/materialize-reviewer-reference.mjs`. This transport projection preserves the approved reference: **6680 bytes**, SHA-256 **2ae79da9d2e8ad7e50f4b967043f970a664a350c28f3fb48c01640c373077e5a**; it is not regenerated or recompressed evidence.

`npm run build:reviewer` first runs that Node-built-in-only helper; `npm test` runs the same helper via `pretest`. Paths resolve relative to the helper's `import.meta.url`, not the shell directory. Embedded length/hash validation precedes writing. Missing reference: create exclusively; identical reference: no-op; different existing reference: fail without overwrite. `npm ci` does not materialize it: no postinstall hook, new dependency or network script is added. The original private source gzip and initial source archive remain unchanged; normal app/build commands retain their behavior.

The external source inventory counts **101 Git-published UTF-8 text files**, including this helper but excluding the generated gzip. After materialization the reviewer directory has **102 source/reference files** (101 text + one original-byte reference); generated build output and installed dependencies are not source inventory entries. The separate hosting inventory remains five files and contains neither this helper nor the compatibility gzip.

## Inspect

- Synthetic source defaults to `unprotected`: NEEDS_PROTECTION. All 12 scenarios use the fictional fixed clock **2026-11-04T00:00:00.000Z** for generation and evaluation. `stale` preserves all 60-second offsets and remains UNKNOWN / STALE_DATA. Displayed observation age is relative to that fictional clock; synthetic green results are fixture-only.
- Recorded source is the real November 4 capture, not live data or DreamShield execution. Interpretation is fixed at its historical capture time; separate current wall-clock age never enters evaluation or export. UNKNOWN / READ_FAILED, knownIdsOnly, failed aggregate, absolute **0.1 USDso** SL and **9,999 bps** distance remain visible. Two known IDs do not repair failed discovery.
- Open Evidence details for capture block/hash, raw reason codes and the single export action. The linked sanitized evidence asset is packaged and checked against its recorded SHA-256. Static sources contain zero operations, so there is no operation timeline.
- Recheck reinterprets the same packaged observation; it does not make it fresh. Switching source/scenario or Recheck invalidates the prior ready/export context immediately. Failed or obsolete reads/digests cannot restore it.

## Export identity

`dreamshield-static-readonly-observation`, schemaVersion 1, is **not** a G1 lifecycle artifact or an origin attestation. The download, displayed assessment, recorded metadata and displayed digest share one immutable generation-owned ready context. `staticContext.snapshotSha256` hashes UTF-8 `JSON.stringify(snapshot)`, not the full download. Snapshot fields are top-level in the export: reconstruct them in the displayed snapshot's original key order before hashing. Source/scenario are context-owned; generation and wall-clock age are excluded, so repeated same-source exports are byte-identical. Live proof remains false / NONE.

No DreamShield-originated real order, G1, completed submission, hosted deployment or visual verification is established by this build. The normal local Express application's owner paths remain separate and unchanged. Registration/app-order acceptance and the G1 lifecycle gap remain unresolved; this static reviewer product does not complete them.

## Source identity

The publication branch is [review/dreamshield-20261105](https://github.com/peterpeter228/dreamshield-public/tree/review/dreamshield-20261105/reviewer). The publication receipt supplies the exact SHA-256 of the sorted reviewer source inventory (relative paths, byte counts and file hashes). That content digest identifies this staged version; no unpublished commit SHA or hosted URL is invented. The legacy repository root is not this reviewer package.
