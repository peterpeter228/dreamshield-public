# DreamShield: competition and native protection verification

Verified 2026-10-24 22:17–22:19 UTC (2026-10-25 06:17–06:19 Asia/Shanghai).
Read the supplied guide from its shared Library-materialized file. The guide is design input, not live evidence. All web sources below were freshly fetched with Firecrawl maxAge=0 except Link a Bot (web open, reported crawled today). No login, whitelist application, external communication, registration, wallet action, signature, transaction, payment or exploit was performed.

## Rules and deliverables matrix

| Topic | Verified current requirement | Evidence/status | Project implication |
|---|---|---|---|
| Tracks | Feedback and MVP; may enter either or both | CONFIRMED, A/B | DreamShield is a trader-tool MVP; feedback is optional and not a substitute. |
| Eligibility | Registration open to everyone; only whitelisted emails can submit Builds | CONFIRMED public rule, A | User's actual whitelist state UNKNOWN. Use DoraHacks registration email. |
| Whitelist channels | Official Discord ticket or SomniaHacks Telegram, providing DoraHacks email | CONFIRMED, A | Draft is not submission. Do not assume Q&A request equals whitelist success. |
| Individual/Chinese participation | No additional restriction found in read competition Details/Tracks | PARTIAL, A/B | “Everyone” is not proof of payout/KYC/regional eligibility. No user identity verified. |
| AI coding | AI-agent products explicitly listed; no explicit AI-assisted coding policy/disclosure rule found | UNKNOWN policy, A/B | Do not conflate product category with permission policy. Truthful assistance disclosure is prudent, not claimed mandatory. |
| Deadline | Body: November 1, 2026 23:59 UTC = November 2 07:59 Beijing | CONFIRMED body, A | UI simultaneously says UTC-4, November 1 18:59 (22:59 UTC if label applied literally). Preserve discrepancy; submit well before either, guide's November 1 20:00 Beijing target is safe. |
| Results | By November 8 | CONFIRMED, A | No exact result hour or timezone stated. |
| MVP prize | Three winners, $500 each: $300 announcement, $200 after perps mainnet launch if MVP places mainnet orders within 30 days | CONFIRMED, A/B | Not guaranteed $500 cash; future mainnet is separate risk/authorization decision. |
| Reward currency/chain/KYC | Not specified in reviewed rules; Q&A question lacks visible answer | UNKNOWN, A/C | Do not promise USDC, a chain, or no KYC. |
| Repo | Details explicitly requires GitHub; sidebar says GitHub/GitLab/Bitbucket | CONFLICT, A/C | Prefer GitHub. Q&A non-GitHub acceptance query has no visible official response. |
| Real testnet activity | MVP must place real perps orders on Somnia Tokyo testnet | CONFIRMED, A/B | Offline/simulation cannot meet this requirement; require actual chain evidence. |
| README | Purpose, audience, run instructions; X posts section with 2–3 real links tagging @DreamDEXSomnia | CONFIRMED, A/B | Draft posts/placeholder links do not satisfy. |
| Evaluation | User value/credible scope/repeat use/technical execution; real orders+hashes+repo+demo; accurate communications | CONFIRMED, A | Protection lifecycle should distinguish placement, fill, position, stop config, and freshness. |
| Somnia primitives | Reactivity/Agents a plus | CONFIRMED, A | Not a mandatory feature. Ordinary watchContractEvent is not itself verified Reactivity use. |
| Test funding | Arena grants paper USDso weekly; extra bounty USDso only to non-Arena account; moving it into Arena forbidden | CONFIRMED, A | Account eligibility and actual funding UNKNOWN. |
| Feedback | Reproducible, first valid report only; $40 critical/major, $15 other accepted; $1,500 budget cap | CONFIRMED, A/B | Acceptance/payment only organizer can establish; do not claim novelty from an untested hypothesis. |
| Security | Do not publish vulnerabilities in repo; designated private security@dreamdex.io channel | CONFIRMED, A | Keep findings private. This report does not authorize sending them. |
| Builds listing | Organizer marks list private | CONFIRMED, D | Cannot infer low competition or number of entrants. |
| Announcements | Public scrape lists none | OBSERVED, E | Not proof there are no private/channel announcements. |

## Native protection boundaries

| Topic | Current primary-source finding | Evidence | Required product boundary |
|---|---|---|---|
| SDK/network | Developer page uses SDK 0.32.1; Hideki/Tokyo chain 50383; SDK reads need WebSocket | F | Pin package and verify actual HTTP/WS chain state independently. |
| Pool addresses | poolAddress, marginBank and stopRegistry are market-specific fields | F | Do not hardcode arbitrary registry or equate symbol with identity. |
| Market units | Quote prices 18 decimals here; base decimals vary 6–24 | F | Read market decimals/tick/min/lot; bigint/string units. |
| Native stop | Trader.placePerpStopOrder supports reduceOnly (default) and opening intent | G | Explicit reduceOnly only for first release. Do not use generic spot stop facade by name similarity. |
| Quantity zero | 0 means whole position at trigger; fixed nonzero quantity only clamps downward | G/H | 0 is not dust or zero protection; fixed quantity does not cover future growth automatically. |
| Trigger enum | 0=GTE, 1=LTE; isBid is execution side | G | Long SL: sell/LTE; short SL: buy/GTE. TP must not count as SL. |
| Stop type | 0=LIMIT, 1=MARKET; MARKET limitPrice must be zero | G | Distinguish from ordinary CLOB enum. |
| Pair | Atomic two-leg arm; same side, opposite trigger operators, GTE trigger above LTE; both reduce-only; cannot attach opening leg | G | No fill-dependent parent/children bracket claim. |
| OCO fill | SDK docs say sibling cancelled/refunded when first fires and fills | G | Trigger alone is not proof of fill/flat. |
| Manual cancel | Cancelling one leaves other armed but unlinked; batch cancel is all-or-nothing and stale IDs revert | H | Refresh and read both legs; no assumption that manual cancel removes both. |
| No-fill sibling details | Guide describes no-fill unlink; fetched parameter docs do not fully define it | NOT REVALIDATED independently here | Mark exact no-fill/unlink behavior as needing pinned implementation/live verification, not guaranteed from this review. |
| Reduce-only drops | Official kit treats already flat/flipped/dust ReduceOnly* differently from NoFill/PlacementFailed | H | Do not label all drops bugs; refresh exposure. |
| Permission | Linked bot may place/cancel/reduce ordinary orders but cannot arm native TP/SL; wallet itself must do so | I | Owner signer/executor path required. Never infer persistent operator approval from request to build. |
| Gas deposit | Docs show 0.15 STT each; parameter docs/kit dynamically read per-leg amount, pair doubles it | F/G/H | Read registry amount at operation time plus separate transaction gas. |
| Markets/funds | Paper USDso allowlist and isolated-account limits apply | F/J | Verify selected account/market; no assumption all 21 markets accept voucher. |
| Mainnet | Trading overview still states no perps mainnet markets | J | No mainnet mode in contest P0. |

## Competition positioning

OrderAnchor #50160 is publicly available. Its author describes durable signed-transaction journaling, reconciliation of an uncertain original hash, SQLite recovery and public evidence export, with two real place/cancel cycles (zero fills/no positions), English demo, 63 passing tests and three X links. Those are author claims; this review did not rerun their verifier or independently verify chain/test outcomes. Source: K.

DreamShield should differentiate by current exposure versus native SL coverage, fixed-size undercoverage, side changes, OCO linkage and stale observations. Hash recovery/evidence export alone overlaps OrderAnchor. Neither source supports a prediction of winning.

## Sources and retrieval status

A. https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail — live fetch HTTP 200, 22:17:50 UTC. Initial web.open returned 405; permitted alternate Firecrawl succeeded.
B. https://dorahacks.io/hackathon/dreamdex-perps-bounty/tracks — live HTTP 200, 22:18:28 UTC.
C. https://dorahacks.io/hackathon/dreamdex-perps-bounty/qa — live HTTP 200, 22:18:07 UTC. Participant's claimed October 22 whitelist cutoff is not an organizer rule; no authoritatively confirmed cutoff obtained.
D. https://dorahacks.io/hackathon/dreamdex-perps-bounty/build — live HTTP 200, 22:18:22 UTC.
E. https://dorahacks.io/hackathon/dreamdex-perps-bounty/announcements — live HTTP 200, 22:18:15 UTC.
F. https://app.testnet.dreamdex.io/docs/developers/perps-testnet — live HTTP 200, 22:18:11 UTC.
G. https://prd.smk.somnia.host/docs/typescript/api/index/interfaces/PlacePerpStopOrderParams — live HTTP 200, 22:18:22 UTC. Generated docs version not independently tied to installed package by this review.
H. https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/stops.ts — fixed commit content fetched live HTTP 200, 22:18:51 UTC. Initial fetch rate-limited and not run; later fetch succeeded. Raw GitHub web.open cache miss. This is a pinned source, not proof of current deployed contract state.
I. https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot — web.open success 22:18:38 UTC, crawl metadata today.
J. https://app.testnet.dreamdex.io/docs/trading/perps-testnet — live HTTP 200, 22:18:15 UTC.
K. https://dorahacks.io/build/50160 — live HTTP 200, 22:18:08 UTC; third-party build content, not organizer validation.
L. https://app.testnet.dreamdex.io/docs/trading/perps-testnet/orders — live HTTP 200, 22:18:25 UTC.

Retrieval times are observed call-completion approximations within the stated review window, not server publication timestamps. No current wallet state, whitelist status, funded balance, signature capability, contract execution outcome, actual project deployment, submission receipt, or user X publication was established.
