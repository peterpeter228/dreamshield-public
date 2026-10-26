# Feedback status

No externally submitted or organizer-accepted DreamDEX vulnerability/feedback finding is claimed.

## Local report index

Two self-contained non-security report files are filed **locally only**. A repository file is not an external filing, proof of novelty, or organizer acceptance. Both reports provide procedures for later authorized reproduction; this phase performed no network probe, webpage fetch or fresh reproduction.

| Report | Severity / Area | Local status | Historical evidence | Current reproduction |
|---|---|---|---|---|
| [001 — SDK WS DNS `EAI_AGAIN`](001-sdk-ws-eai-again.md) | normal (provisional) / SDK | Report file created; defect attribution inconclusive | 2026-10-24 nested `RpcError` → `UnknownRpcError` → `EAI_AGAIN`, repeated in a retry. Earlier direct-read controls and later `ECONNREFUSED` are separate observations, not proof of a current outage or SDK/deployment mismatch. | **NOT_RUN** |
| [002 — Deadline timezone conflict](002-deadline-timezone-conflict.md) | normal / docs | Report file created; historical candidate | 2026-10-24 research note records body November 1, 2026, 23:59 UTC versus sidebar 18:59 UTC−4 (= 22:59 UTC): **one hour** apart. Raw page capture/browser locale are not established by the cited evidence. | **NOT_RUN** |

For **both** reports: duplicate check **NOT_RUN**; external submission **NOT_SUBMITTED**; organizer acceptance **NOT_RECORDED** (not an organizer rejection). First-valid-report eligibility, reward availability and payment are unestablished. Only the organizer can confirm acceptance; acceptance would not itself establish payment. See each report for exact provenance, missing historical command/commit/environment details, controls and non-claims.

## Authorization, deduplication and security boundaries

Historical research hypotheses are not verified bugs or externally submitted findings. Earlier review and remediation reproduced issues in DreamShield's own recovery and presentation logic; their details remain in the review records and are not misrepresented as DreamDEX defects or bounty submissions.

Before any future feedback submission: reproduce against the pinned current environment, check existing public reports for duplication, preserve a minimal non-sensitive reproduction, classify whether security-sensitive, and obtain the required authorization for the specific external destination. Security issues must not be published publicly. No email, message or report has been sent.
