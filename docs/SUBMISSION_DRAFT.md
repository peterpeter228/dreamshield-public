# DoraHacks submission working draft

Status: NOT SUBMITTED. Replace each `[REQUIRED]` with verified facts; never invent a Build URL.

Local materials and remaining blockers: [submission readiness](SUBMISSION_READINESS.md), [unsubmitted Feedback pack](../feedback/README.md), and [submission metadata](../evidence/submission.json). Local reports are not organizer acceptance or external filings.

## Project name
DreamShield — Perps Protection Desk

## Tagline
Know whether your DreamDEX perps position has a native stop loss, and repair gaps with evidence.

## Problem
A position can outlive its intended protection. A cancelled, partial, incorrectly directed or stale stop can look reassuring without covering the current position. Transaction success alone does not establish present protection.

## Solution
DreamShield separates stop discovery from authoritative readback. A focused desk explains missing SL coverage, prepares an owner-native reduce-only stop, journals the attempt before wallet approval and reconciles its canonical receipt and current state. Replay is explicit, stale data revokes green conclusions and unknown outcomes do not trigger blind resubmission.

## DreamDEX integration
Pinned `@somnia-chain/markets-sdk@0.32.1`, Somnia Tokyo chain 50383, native perps position and stop registry integration. Live RPC/configuration results: see evidence/g0. Actual owner trading lifecycle: [REQUIRED]. SDK integration is not claimed as a successful executed order.

## Intended users and repeat use
An isolated testnet perps owner checks protection after opening or changing a position, after cancelling a stop, or when returning to the terminal. First value is a clear missing/partial/stale protection explanation without treating receipt success as current coverage. Repeat value is rechecking the position–native-stop relationship and preserving evidence after changes. No paid demand or retention is claimed from replay tests.

## Implemented scope
One account and one market per local instance; explicit replay, live-readonly and gated local-owner modes. Bigint coverage checks, whole-position sentinel handling, native SL/cancel adapters, bounded discovery and pinned risk reads, durable operation journal, unsigned previews, evidence export and stale/uncertain no-green behavior are implemented. OCO relationship assessment is implemented; pair creation, relinking old legs, second-market flows and Reactivity are not claimed. Real owner execution is pending.

A manually recovered hash can be inspected but cannot automatically prove original-request provenance or release its lock. This is an explicit limitation, not completed automatic recovery.

## Technology and verification
React/TypeScript UI, Node/Express API, SQLite journal, viem and the pinned Markets SDK. No server signing key. The historical de3cfe50b5517278e72a4b9a06806af0f22cc342 checkpoint passed typecheck/build and 90 offline tests; later Argon remediation recorded 119 tests. Phase1 passed Node 24.22.1 typecheck/build and 156 offline tests and exercised all 12 desktop replay scenarios; see [Phase1 evidence](../evidence/phase1-2026-10-26/NOTES.md). Fresh Phase2 verification is recorded separately in [STATE](STATE.md), not attributed to those historical commits. Official RPC/SDK DNS/refusal failures were observed on 2026-10-24; Phase2 did not recheck transport, so current reachability is unverified. No Reactivity integration is claimed.

## Differentiation
Evidence and recovery rather than another trading terminal: clear freshness and discovery scope, whole-position versus fixed coverage, SL versus TP, native stop readback and durable unknown-outcome handling. See the [sourced differentiation matrix](DIFFERENTIATION.md) and [90-second replay script](DEMO_SCRIPT.md). OrderAnchor's author claims overlap journal/recovery/export scope and were not independently revalidated; no claim that it lacks equivalent features or that the market is competition-free.

## Demo and repository
- Repository: https://github.com/peterpeter228/dreamshield-public (delivery repository; reviewer access [REQUIRED] and unverified).
- Runnable local demo: README quickstart.
- Public read-only demo URL: optional delivery choice, not deployed. A runnable local demo and clearly labelled recording can supply building evidence; do not invent a mandatory public URL rule.
- Demonstration materials: docs/DEMO_ASSETS.md contains actual replay screenshots and exported JSON. docs/DEMO_SCRIPT.md is the recording script; no video or live footage exists yet. Supply a recording only if chosen or required by the current form.
- Real perps order hash, chain/block/account/pool: [REQUIRED].
- Native SL placement/readback and cancel/rebuild records: [REQUIRED].
- Whitelisted entrant identity/email: [REQUIRED, do not publish sensitive details].
- X post URLs (2–3): [REQUIRED; drafts below are not posts].
- Team: solo developer [confirm current entry details].

## Testing and limitations
Attach exact source SHA, commands/results, screenshots, protocol doctor output and remaining blockers. No guarantees of execution, returns or award selection. No mainnet operation performed; future award conditions are not already met.

## X drafts, not posted
1. Building DreamShield for DreamDEX: a focused way to inspect whether a perps position has a native stop loss. The current local replay demonstrates missing, partial and stale protection states. Live owner verification is the next gate. @DreamDEXSomnia [Recheck official tag immediately before authorized publication]
2. A successful transaction is not the same as verified protection. DreamShield records the attempt, checks the canonical receipt and reads native stop state back. Unknown outcomes stay unknown rather than silently retrying. @DreamDEXSomnia [Attach truthful demo; recheck official requirements before authorized publication]
3. DreamShield demo notes: replay and live evidence are clearly separated, quantity zero means whole remaining position at trigger time, and stale data removes a green verdict. @DreamDEXSomnia [Replace with actual live milestone only after execution; recheck official requirements]

## Whitelist request draft, not sent
Hi dreamDEX team, I would like to join the Perps Builder Bounty.

DoraHacks registration email: [REQUIRED: the owner’s matching registration email]
Planned track: MVP
Project: DreamShield — Perps Protection Desk
Scope: checking native protection against current perps exposure, preparing owner-confirmed native stops, and verifying results with explicit freshness and uncertainty handling.
Progress repository: https://github.com/peterpeter228/dreamshield-public (delivery repository; arrange explicitly approved access if needed).

Could you please confirm the email whitelist status for Build submission? Thank you.

This draft has not been sent to Discord, Telegram or any other destination. The [local Feedback reports](../feedback/README.md) document historical evidence only; current reproduction and deduplication remain NOT_RUN. Any external Feedback claim requires those checks and specific authorization.
