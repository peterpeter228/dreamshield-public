# DreamShield gap analysis — 2026-10-26

> **Historical analysis; scope/action recommendations superseded on 2026-10-27.** See [STATE](../STATE.md#product-scope-and-safety-boundaries), [TASKS](../TASKS.md) and [readiness](../SUBMISSION_READINESS.md). Current product limits are one isolated owner/doctor-verified market on 50383, smallest valid 1–2 lots and 1–2 native stops. Whitelist remains unverified; two local Feedback reports exist but are unfiled. Public visibility does not establish reviewer access or updated sync. No wallet session/signing/trading, mainnet, outreach, Feedback filing, X publication, submission or visibility change was performed. Use **2026-11-02 06:59 Asia/Shanghai** as the planning cutoff, not the later conflicting body time. Original observations below remain historical, not current permission or fresh verification.

Historical scope: this analysis records the 2026-10-26 state after Phase1 and **before Phase2** added the local Feedback reports and submission-readiness pack. Its tables and recommendations are preserved observations from that checkpoint, not a current inventory or a new eligibility/live verification. Linked state, metadata and product documents may describe later work.

Research sources for that checkpoint: HackathonRadar mirror of DoraHacks rules ([hackathonradar](https://www.hackathonradar.com/database/hackathon/dreamdex-perps-builder-bounty-2026)), Eventbrite/MoonHub mirrors, local [competition-verification.md](../../research/competition-verification.md) (2026-10-24 live DoraHacks fetch), [STATE.md](../STATE.md), [submission.json](../../evidence/submission.json), [DIFFERENTIATION.md](../DIFFERENTIATION.md).  
Contemporaneous source-access limits: search service rate-limited (429, ~5min); auxiliary research CLI version0.9.4 installed but **not authenticated**; direct DoraHacks HTTP retrieval returned Cloudflare405/CAPTCHA. These are historical research limits, not fresh access checks.

## Official MVP checklist vs DreamShield

| Requirement | Source | DreamShield status | Gap |
|---|---|---|---|
| Whitelisted DoraHacks email to submit Builds | DoraHacks / mirrors | `whitelistVerified: false` | **Hard blocker** — Discord ticket / SomniaHacks TG with DoraHacks email |
| GitHub repo | Rules | Original private GitHub repository existed at this checkpoint | Judge review access unverified; any later public release requires separate authorization |
| Real perps orders on Somnia Tokyo (50383) | MVP track | G1 `BLOCKED_EXTERNAL` / `realPerpsOrder: false` | **Hard blocker** — needs owner wallet + live lifecycle |
| README: what / who / how to run | MVP track | Strong offline README | OK for offline; must not claim live G1 |
| README **X posts** section with 2–3 links tagging @DreamDEXSomnia | MVP track | Drafts only; `xPost1/2: null` | **Hard blocker** — real posts |
| Feedback track: `feedback/*.md` one issue each | Feedback track | Only `feedback/README.md` | **Missed paid lane** — reproducible SDK/docs items unpaid |
| Deadline Nov 1 23:59 UTC (UI TZ conflict) | Rules | Not submitted | Submit early; clarify TZ |
| Eval: user value, real orders+hashes+repo+demo, accurate comms | Rules | Offline desk strong; live evidence absent | Live G1 + honest scope labeling |
| Somnia Reactivity/Agents | Plus, not mandatory | Not claimed | Optional later |

Prize context: MVP 3×$500; Feedback pool ≤$1,500 ($40/$15). ~156 participants / ~14 est. projects (HackathonRadar, fetched ~2026-10-26).

## Competitor gap (OrderAnchor #50160)

From local competition-verification source K + DIFFERENTIATION (author claims, **not independently re-verified for this historical analysis**):

| Dimension | OrderAnchor (author claim) | DreamShield | Edge |
|---|---|---|---|
| Live place/cancel | 2 cycles, 0 fills / no positions | None (G1 blocked) | **They lead on hard MVP evidence** |
| Tests | 63 claimed | **156** offline | DS leads offline rigor |
| Differentiation | Journal / recovery / export | Position↔native SL assessment (TP≠SL, wrong-side, partial, OCO, stale, residual) + Phase1 replay | **DS leads product story offline** |
| X posts | 3 claimed | 0 published | They lead |
| Evidence honesty | Author claims | Conservative gates, no fake live | DS safer for judges if live arrives |

**Net:** Offline product depth favors DreamShield; **eligibility + live proof + social** currently favor OrderAnchor-style submissions. Without G1+whitelist+X, win probability stays low regardless of offline polish.

## Win-probability levers (ranked)

1. **Whitelist** (eligibility) — zero without it  
2. **Live G1** (real perps + native SL readback hashes) — MVP must  
3. **2–3 X posts** tagging @DreamDEXSomnia  
4. **DoraHacks Build submit** before deadline  
5. **Feedback track filings** — cash + engagement signal while waiting on wallet  
6. Judge access to the delivery repository + crisp demo script / differentiation (already strong)
7. Optional: Reactivity/Agents plus

## Without wallet vs needs user

**Can do offline (code/docs):** Feedback markdown pack; submission readiness UI/checklist; README X section scaffold; judge packet; keep differentiation honest.  
**Needs user:** Discord whitelist; funded testnet wallet public address + signed lifecycle; publish X; formal submit; reviewer invite.
