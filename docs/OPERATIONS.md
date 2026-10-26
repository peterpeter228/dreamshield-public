# Local operation and handoff

## Reproducible startup

Use the pinned Node version and package-lock.json. Clone the delivery repository identified in the [README quickstart](../README.md#run-locally). If authentication is required, use your own existing GitHub setup; do not paste tokens into commands or the project. Source availability does not establish judge access. `.env.example` is documentation only: process environment is authoritative.

After changing application source, run `npm run build` again before starting the Express server. Development and replay serve `dist/web`, not live source. At the historical recovery checkpoint, a fresh clone installation had not been independently repeated; the existing locked installation was typechecked, tested and rebuilt.

## Offline verification and strict readiness

Under Node **24.22.1**, `npm run test:judge` is the explicit offline aggregate: typecheck, the existing test suite, production build, and evidence-schema verification. All four stages retain `&&` failure propagation. Only the last stage selects the verifier's existing offline mode: `npm run verify:evidence -- evidence/manifest.json --allow-incomplete`. The manifest path is required; this mode permits valid incomplete live evidence, not missing/malformed evidence or schema/project errors.

Standalone `npm run verify:evidence` and `npm run submission:check` remain strict and blocked while their prerequisites are missing. Run them independently and do not bypass their readiness checks with `--allow-incomplete`. An offline aggregate pass does not establish live execution, judge access, source release, hosting or submission. See [readiness](SUBMISSION_READINESS.md) for historical outcomes and remaining external gates.

## Health and readiness

- GET /healthz: process alive and current mode. It is not evidence of chain availability.
- GET /readyz: replay is ready locally; live readiness depends on the latest desk assessment. A live failure remains HTTP 503.
- GET /api/desk: fetches a current snapshot; discovery/read failure must not imply zero exposure.
- GET /api/evidence: exports the last desk snapshot with capture time, mode and integrity digest. It is not a fresh independent chain verification.

No automatic restart or background service has been installed. The server handles SIGINT/SIGTERM and closes its SQLite journal. Keep DATA_DIR local and durable for owner mode; do not delete or reset it to clear an unresolved transaction.

## Recovery

An interrupted AwaitingSignature or Reconcile operation becomes Unknown on restart and retains the account lock. Recover the original hash from the owner's wallet activity, open that exact operation and use hash recovery/reconcile. A hash is not success evidence; chain scope, canonical receipt and native state must still pass. If no hash can be recovered, stop and investigate. Do not create another stop merely because time passed.

## Release, hosting and judge access

No public source release or deployment was performed. Source release, hosted demonstration, and judge access to the delivery repository are separate permissions/tasks; none implies either of the others. Judge access remains unverified. Any future public demonstration must use replay/live-readonly, no server signer, no private owner journal and no publicly reachable owner mutation endpoints. Never tunnel a live-owner instance or run it behind a public reverse proxy.

## Remaining live acceptance

On 2026-10-24, SDK WebSocket DNS failures and a separate environment's connection refusal were recorded. These are historical observations, not a fresh outage diagnosis; Phase2 did not recheck transport and present reachability is unverified. Live acceptance requires a working permitted execution environment, not weaker genesis checks. Owner test limits, funding, exact market, browser wallet confirmation and the original order/SL/cancel/rebuild evidence remain outstanding. See [live handoff](LIVE_HANDOFF.md). Local replay readiness must not be labelled production or live acceptance.
