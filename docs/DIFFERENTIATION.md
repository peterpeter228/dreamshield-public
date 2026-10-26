# DreamShield and OrderAnchor: scope and evidence

DreamShield's judge-facing demonstration is **position-to-native-stop assessment**, not simply a transaction journal. The offline desk asks whether an observed position has a matching reduce-only stop loss, and whether that conclusion is still justified by the available data. This is a runnable **REPLAY** demonstration with fictional positions and stops, not evidence of current chain protection or successful execution.

“DS-only” in a demo means scenarios demonstrated in this app. It does **not** mean OrderAnchor lacks those capabilities or could not implement them.

## Sources and comparison limits

- [Local competition research, “Competition positioning”](../research/competition-verification.md#competition-positioning), lines 51–55, and source K at line 69, records the OrderAnchor author's claims from [OrderAnchor #50160 on DoraHacks](https://dorahacks.io/build/50160). The recorded retrieval is historical; this comparison does not claim a fresh fetch.
- That author describes a durable signed-transaction journal, uncertain-original-hash reconciliation, SQLite recovery and public evidence export; two real place/cancel cycles with **zero fills and no positions**; an English demo, 63 passing tests and three X links. These are **author claims, not independently verified** here. We did not run OrderAnchor, rerun its verifier, or independently verify its chain, test or publication outcomes.
- DreamShield's implementation references are the [assessment rules](../packages/domain/index.ts), [replay fixtures](../fixtures/scenarios.ts), [replay UI](../apps/web/src/App.tsx) and [evidence endpoint](../apps/server/app.ts). Runnable implementation is not itself a fresh test or browser pass. Consult [STATE](STATE.md) and its linked evidence for actually exercised verification and historical scope.

In the matrix, **not established** means the cited OrderAnchor author summary does not establish that behavior. It is not a finding of missing support. No feature-by-feature OrderAnchor implementation review was performed.

## Comparison matrix

| Concern | DreamShield: runnable offline behavior / boundary | OrderAnchor: what the cited source establishes |
|---|---|---|
| Position-to-stop relationship | Assesses observed exposure against native stops using owner/pool/registry identity, reduce-only intent, closing side and trigger direction. `protected` demonstrates whole-position-at-trigger configuration; a verified configuration is not guaranteed execution. | Position-to-stop assessment is not established by the cited summary; no absence claim. |
| Take profit versus stop loss | `tp-only`: a closing-side reduce-only TP does not count as SL protection. Verdict `NEEDS_PROTECTION`; retains `NO_MATCHING_SL` and adds `TAKE_PROFIT_ONLY`. | TP/SL differentiation is not established by the cited summary; no absence claim. |
| Direction mismatch | `wrong-side-sl`: a long position with a reduce-only buy/GTE stop has the wrong closing direction. Verdict `NEEDS_PROTECTION`; retains `NO_MATCHING_SL` and adds `WRONG_SIDE_SL`. | Wrong-side-stop assessment is not established by the cited summary; no absence claim. |
| Partial sizing | `partial`: a fixed stop quantity below current position size yields `NEEDS_REVIEW` / `PARTIAL_COVERAGE`. Fixed size does not scale with position growth; quantity zero means whole position at trigger time. | Position-relative coverage sizing is not established by the cited summary; no absence claim. |
| Trigger already met | `trigger-met`: `NEEDS_REVIEW` / `TRIGGER_CONDITION_MET`. A satisfied trigger is not proof of a fill or a flat position; remaining exposure requires reconciliation. | Already-met-trigger assessment is not established by the cited summary; no absence claim. |
| Broken OCO relationship | `oco-broken`: `NEEDS_REVIEW` / `OCO_LINK_INVALID` for the missing sibling fixture. The assessor checks reciprocal pending linkage and compatible terms rather than treating a sibling ID as proof. | OCO-link assessment is not established by the cited summary; no absence claim. |
| Residual stops after flat | `residual-stops`: `NO_POSITION` with `NO_POSITION` and `RESIDUAL_STOPS` reasons. Pending stops remain visible for review before reopening; this is not an all-clear or automatic cancellation. | Residual-stop assessment is not established by the cited summary. The author's “no positions” claim does not establish this behavior. |
| Stale or incomplete observations | `stale` and `unknown`: `UNKNOWN`, never inferred zero exposure or verified protection. Freshness is reassessed in the desk; unavailable discovery fails closed. | Equivalent stale/incomplete assessment is not established by the cited summary; no absence claim. |
| Journal and recovery | Durable SQLite operation journal and unresolved-operation locking are implemented. Recovery and reconciliation have offline coverage; this is not a replay demonstration of real wallet recovery. See the [historical remediation record](../review/ARGON_VERIFICATION_2026-10-25.md). | Author claims durable signed-tx journaling, original-hash reconciliation and SQLite recovery. **Overlap**, not an exclusive DreamShield differentiator; claims not independently verified. |
| Evidence and presentation | Replay export preserves raw assessment reason codes alongside the displayed snapshot/assessment. The server export explicitly reports no transactions and `liveWorkflowVerified: false`; its checksum is unsigned, not a chain attestation. English walkthrough available. | Author claims public evidence export, an English demo, 63 tests and three X links. Export/demo are **overlap**; those outcomes were not independently verified. |
| Live lifecycle evidence | **G1 remains `BLOCKED_EXTERNAL` / `NOT_RUN`.** No real order → native SL → cancel → rebuild lifecycle or live acceptance is claimed. | Author claims two real place/cancel cycles, zero fills and no positions, not independently verified. Do not equate that claim to a filled-position SL lifecycle, or present DreamShield replay as matching live evidence. |

## What judges can inspect locally

Use the [README quickstart](../README.md#run-locally), then follow the [90-second walkthrough](DEMO_SCRIPT.md). The four added fixtures are `tp-only`, `wrong-side-sl`, `trigger-met` and `residual-stops`; the original eight remain available. Human-friendly labels explain the diagnostic codes without rewriting the raw assessment or evidence payload.

The defensible distinction is the concrete safety question shown on screen: **does this observed position have matching SL configuration, or is protection missing, uncertain or in need of review?** Journaling, hash recovery and export alone are not a claim of differentiation from OrderAnchor. This comparison makes no claim about winning, eligibility, competitor feature absence, or independently verified competitor execution.

No wallet connection, signature, live trade, chain probe, deployment, social publication, whitelist acceptance or submission is required or established by this offline demonstration. Live prerequisites and gate status remain in [STATE](STATE.md) and the [owner handoff](OWNER_HANDOFF.md).
