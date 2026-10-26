# 90-second review demo

## Setup before recording

Run the local replay quickstart in [README](../README.md#run-locally). Record at 1440×900 with readable browser zoom. Start with `protected` selected and the scenario selector, verdict, reasons and stop table already visible; keep that layout throughout the scenario switches. Have a local JSON viewer ready for the actual downloaded export and [STATE](STATE.md#gate-status) ready in a second tab. Setup and server startup are outside the 90 seconds.

Keep a persistent **REPLAY · fictional fixtures · no live transactions** disclaimer on fixture footage. Do not connect a wallet, request signatures or run chain probes. Never edit replay footage to imply real execution. This is a recording plan, not a claim that a recording or new browser verification already exists.

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
| 77–85s | Export the current evidence JSON and open that actual download in the prepared viewer. | “The export preserves replay context and raw reasons; there are no transactions and live verification is false.” Point to `scenario`, `displayAssessment.reasonCodes`, and `serverEvidence.liveWorkflowVerified: false`; do not read the JSON aloud. |
| 85–90s | Show the G1 line in STATE. | “G1 is BLOCKED_EXTERNAL / NOT_RUN. This is offline assessment, not live acceptance.” |

If a local load or download needs longer, retake with less narration rather than hiding a missing result. Do not substitute a prepared export for the current download, invent a hash, or imply the unsigned export checksum is a transaction proof. Replay operation history is empty; that is honest. An optional stop preview outside this timed path is unsigned and is not a sent transaction.

## Live evidence remains separate

No live G1 footage exists yet. Only after separately authorized owner execution could a distinct uncut real sequence show opening order/position, wallet-confirmed native SL, chain readback, controlled cancellation, gap, rebuild, final readback and residual-risk review. That would require actual transaction links and matching source identity; replay cannot supply them. Do not claim deployment, social publication, whitelist acceptance or submission from this walkthrough.

