# Competition page historically displayed deadline times one hour apart

Severity: normal
Area: docs
Status: candidate

This is a non-security documentation-feedback candidate based on a preserved historical research note, not a claim about the page's present contents or the platform's actual closing time.

- Local filing: this repository report only.
- Historical observation: recorded during the 2026-10-24 22:17–22:19 UTC research review.
- Current reproduction: **NOT_RUN**; no new webpage fetch or browser check was performed for this report.
- Duplicate check: **NOT_RUN**; novelty and first-valid-report eligibility are unestablished.
- External submission: **NOT_SUBMITTED**. Organizer acceptance: **NOT_RECORDED** (not an organizer rejection).

## Steps to reproduce

### Review the preserved historical observation (offline)

1. Open [competition-verification.md](../research/competition-verification.md), lines 3–4 and the deadline row at line 15. The note records the competition Details body as **November 1, 2026, 23:59 UTC** and its simultaneous sidebar/UI display as **November 1, 18:59, UTC−4**.
2. Check that note's source A at line 59: [official competition Details page](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail), historically retrieved with HTTP 200 at approximately **22:17:50 UTC on 2026-10-24**. The note records Firecrawl with `maxAge=0`, after an initial `web.open` returned 405. These are historical retrieval details, not a request executed in this phase.
3. Apply the displayed fixed offset literally: `2026-11-01 18:59 UTC−4 + 4 hours = 2026-11-01 22:59 UTC`. Compare this with `2026-11-01 23:59 UTC`: the two stated instants differ by **one hour**, with the sidebar interpretation earlier.

### Later authorized reproduction procedure — not executed in this phase

1. When a fresh read is authorized, open the official Details URL above without submitting a Build or taking any account, wallet or messaging action.
2. Record the observation time and the exact deadline date, time and timezone label shown in both the body and sidebar. If a browser is used, record the actual browser/OS/locale/timezone for that new observation rather than assigning those values to the historical research.
3. Normalize both displayed values to UTC using the offsets actually shown, and compare the resulting instants. If the historical pair is still shown, it yields `22:59 UTC` versus `23:59 UTC`. If the page has changed or a label is absent, preserve that actual result; do not claim the historical discrepancy was freshly reproduced.
4. Ask for one unambiguous official cutoff only through a separately authorized communication. This procedure does not test a submission at either cutoff and does not establish when the platform actually closes.

## Expected

The competition page's body and sidebar should identify the same deadline instant, or explicitly explain any different cutoff they represent. The [historical source-A record](../research/competition-verification.md) is the basis for comparing two displays on the same official Details page, not proof of a browser conversion rule or backend deadline contract.

An organizer clarification should name the authoritative cutoff and align the displayed timezone/time pair. This report does not choose either historical display as proof of the actual server-enforced deadline.

## Actual

The [preserved research note](../research/competition-verification.md), line 15, records:

| Historical page location | Recorded display | Literal UTC interpretation |
|---|---|---|
| Details body | November 1, 2026, 23:59 UTC | November 1, 2026, 23:59 UTC |
| Sidebar/UI | November 1, 18:59, UTC−4 | November 1, 2026, 22:59 UTC |

The sidebar interpretation is **one hour earlier** than the body. The practical issue is an ambiguous published cutoff for someone planning a submission; this is not evidence that anyone lost submission access or that the platform closed early.

The evidence is a historical written research observation. This report does not contain a new webpage observation, a raw page capture or a screenshot corroborating that observation. It does not attribute the difference to daylight saving time, a browser locale or a particular implementation bug.

## Evidence

| Report field | Preserved evidence / limit |
|---|---|
| Reproduction command | No exact historical Firecrawl invocation or shell command is recorded in the note. It records `maxAge=0`, an initial `web.open` 405 and a successful alternate fetch; the manual procedure above is for later authorized execution, not a claimed replay of an exact historical command. |
| Actual output/log path | [competition-verification.md](../research/competition-verification.md), lines 3–4, 15, 57–59 and 72. It preserves the reported body/sidebar values, retrieval source/method and timing limitations. No raw HTML, screenshot or browser recording is supplied as evidence by this report. |
| Source URL and retrieval provenance | Source A: [official competition Details](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail), historically HTTP 200 at approximately 2026-10-24 22:17:50 UTC. The note says retrieval times are observed call-completion approximations, not server publication timestamps. No fresh fetch was performed. |
| Code commit and source lines | Website source commit, page revision and exact raw page source lines are **not recorded**. The local research-note lines above identify the preserved observation; they are not website implementation lines. No historical repository commit is asserted. |
| Transaction and block, if applicable | N/A: a public competition-page display finding, not a chain call or transaction. No transaction or block hash applies. |
| Independent verification result | No new independent verification. Offset arithmetic above follows directly from the recorded labels; it does not independently corroborate the historical page display. Current reproduction **NOT_RUN**. |
| Duplicate check | **NOT_RUN**. No `duplicate_of`, first-report claim, organizer validation or reward entitlement is established. |

## Environment

| Field | Sourced value / missing detail |
|---|---|
| Node | N/A to the webpage finding. The historical fetch runtime/version is **not recorded** in the research note. |
| SDK and lockfile | N/A to the webpage finding. Separate DreamShield project context: SDK `0.32.1` and viem `2.57.11` are declared in [package.json](../package.json) and [package-lock.json](../package-lock.json); they are not the webpage's runtime or reproduction prerequisites. |
| OS/runtime | Historical fetch host OS, Firecrawl version, browser version, browser locale and browser timezone are **not recorded** in the cited research note. The note's UTC and Asia/Shanghai review timestamps do not establish browser locale or timezone. |
| Network and chain ID | N/A to the webpage finding. Separate DreamShield context is Somnia Tokyo / Hideki chain `50383`, from [repository configuration](../packages/protocol/index.ts), lines 7–11. No chain interaction is needed to compare displayed deadlines. |
| Target contract/pool | N/A. Target is the public [competition Details page](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail). |
| Public account address | N/A. The historical note records no login, registration, wallet action, signature or transaction; no account address is needed. |
| Captured at | Historical review: 2026-10-24 22:17–22:19 UTC; source-A fetch completed at approximately 22:17:50 UTC. Deadline displays refer to November 1, 2026. No new capture timestamp is asserted. |

## Provenance, non-claims and submission boundary

This self-contained report reorganizes the preserved [historical competition research](../research/competition-verification.md). The source URL identifies the historical page; linking it here does not imply it was opened again. The research note, not a newly retained raw capture, is the evidence available for this report.

- No current page discrepancy, current outage, actual early closing, failed submission, organizer-confirmed deadline or backend behavior is claimed.
- No DST explanation, browser-locale explanation, screenshot, raw HTML capture or website source-code diagnosis is claimed. Literal `UTC−4` conversion is sufficient to identify the one-hour inconsistency in the recorded values.
- No SDK, blockchain or contract defect is alleged by this webpage finding. Project versions and chain ID above are context only.
- This local filing is neither external filing nor organizer acceptance. Before any authorized submission, recheck the page, preserve non-sensitive evidence, check duplicates by underlying issue and affected page/revision, and confirm it is non-security feedback. Security vulnerabilities must remain private and use the designated `security@dreamdex.io` channel only with separate authorization; no external message was sent in this phase.
