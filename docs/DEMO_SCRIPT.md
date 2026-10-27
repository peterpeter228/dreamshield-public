# 90-second review demo

## Setup before recording

Run the local replay quickstart in [README](../README.md#run-locally). Record at 1440×900 with readable browser zoom. Start with `protected` selected and the scenario selector, verdict, reasons and stop table already visible; keep that layout throughout the scenario switches. Have a local JSON viewer ready for the actual downloaded export and [STATE](STATE.md#gate-status) ready in a second tab. Setup and server startup are outside the 90 seconds.

Keep a persistent **REPLAY · fictional fixtures · no live transactions** disclaimer on fixture footage. Do not connect a wallet, click **Review in owner wallet**, request signatures or run chain probes. Never edit replay footage to imply real execution. This is a recording plan, not an existing video. [Current built-browser evidence](../evidence/mvp-2026-10-27/NOTES.md) records 12 replay scenarios and no-send surfaces, not owner execution. [LIVE_HANDOFF](LIVE_HANDOFF.md) documents the separate locked scope and still-unexecuted actual owner reserve/export/discard boundary.

## Timed walkthrough

Use the visible selector for each change, wait for the new assessment, and point to its friendly reason label. Codes below are presenter reference and remain raw in evidence; there is no need to read them aloud. Keep narration to one sentence per case. This demonstrates DreamShield's assessment focus, not proof that OrderAnchor lacks equivalent features; see the [sourced comparison](DIFFERENTIATION.md).

| Time | On screen | Short narration / key distinction |
|---|---|---|
| 0–7s | Start on `protected`, with REPLAY and snapshot scope visible. | “These are fictional replay positions. Verified means matching stop configuration, not guaranteed execution.” |
| 7–18s | Select `tp-only`; point to `NEEDS_PROTECTION` and the TP-only reason. | “A closing-side take profit is not a stop loss.” The diagnostic retains `NO_MATCHING_SL` and adds `TAKE_PROFIT_ONLY`. |
| 18–29s | Select `wrong-side-sl`; show the long position and buy/GTE stop. | “This stop has the wrong closing direction for a long, so it provides no matching SL coverage.” Reasons include `NO_MATCHING_SL` and `WRONG_SIDE_SL`. |
| 29–40s | Select `trigger-met`; point to `NEEDS_REVIEW`. | “The trigger condition is already met. We must reconcile execution and remaining exposure, not assume a fill.” Reason: `TRIGGER_CONDITION_MET`. |
| 40–51s | Select `residual-stops`; show flat exposure and the pending stop row. | “No position does not mean no pending stops. Review residual orders before reopening.” Verdict stays `NO_POSITION`; reasons include `RESIDUAL_STOPS`. No cancellation is sent. |
| 51–60s | Select `partial`; point to position size and fixed covered quantity. | “A fixed-size stop covers only part of this position; whole-at-trigger is a different configuration.” `NEEDS_REVIEW` / `PARTIAL_COVERAGE`. |
| 60–69s | Select `oco-broken`; show the pending stop's missing sibling link. | “A sibling ID is not proof of an intact OCO pair.” `NEEDS_REVIEW` / `OCO_LINK_INVALID`. |
| 69–77s | Select `stale`, then `unknown` (incomplete discovery), about four seconds each. | “Stale or incomplete data withdraws verification. Unknown never means an empty account.” Both show `UNKNOWN`. |
| 77–85s | Export the current evidence JSON and open that actual download in the prepared viewer. | “The browser downloads the exact server response, not a client-rewritten assessment. Replay context and raw reasons remain visible; this cannot satisfy real G1.” Point to mode, assessment/reason codes and the absent/incomplete live lifecycle; do not imply a checksum authenticates origin or current protection. |
| 85–90s | Show the G1 line in STATE. | “G1 is BLOCKED_EXTERNAL / NOT_RUN. This is offline assessment, not live acceptance.” |

If a load/download needs longer, retake with less narration rather than hiding missing results. Never substitute a prepared export for the current download, invent a hash or treat payload checksum as transaction proof/raw-file digest. Replay cannot read private owner history or capture owner observations; empty replay operations are not a cleared live account. Optional preview is unsigned, not a sent stop. Actual [current replay smoke](../evidence/mvp-2026-10-27/NOTES.md) exercised all 12 scenarios, preview with signing/cancel disabled, exact-body download, 15-second aging/read-failure revocation at CSS1376×771 DPR1; the downloaded replay was rejected as live proof by CLI ingestion. Synthetic no-wallet capture/restart proof is separately labelled; no real owner/G1 or video is established.

## Live evidence remains separate

No live G1 footage exists yet. Only separate owner execution authorization can permit a distinct real sequence: opening order/fill/nonzero position → missing SL → initial native SL/readback → selected cancellation/exposure gap → distinct replacement/readback → complete residual review. The locked bounds are one isolated owner, one doctor-verified BTC market on 50383, position = exactly one market-minimum order (~13 grid lots; AUTH-20261027-DREAM-LOT-SIZE) and 1–2 concurrent native stops. Actual transactions, native readbacks, provenance and matching source identity are required; replay cannot supply them. Local-owner read-only capture/export neither runs that lifecycle nor clears uncertain operation locks. Do not claim deployment, X publication, whitelist/reviewer acceptance or submission from this walkthrough.

