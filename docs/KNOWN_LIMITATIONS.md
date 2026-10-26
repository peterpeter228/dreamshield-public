# Known limitations

- No owner wallet/address, verified funded testnet account, position or signed transaction has been supplied for this build. G1 and live lifecycle acceptance are pending.
- Complete discovery depends on the official indexer. A stopped/lagging indexer cannot establish absence. Reads spanning blocks are conservatively unknown until a coherent view is obtained.
- Native stops reduce risk but cannot guarantee fill, price, availability, liquidation avoidance or profit.
- Current scope is one account and one market, native SL first. OCO observations are assessed; pair creation and Reactivity are not P0 completion claims.
- Operator permissions are a separate wallet decision. Missing approval is not automatically bypassed or sent.
- Smart-account behavior is not accepted without explicit support and verification.
- No public deployment, actual X posts, whitelist verification or DoraHacks submission. Drafts are not evidence of those actions.
- The 2026-10-24 official-page research recorded conflicting deadline time zones (body 23:59 UTC; sidebar 18:59 UTC−4 = 22:59 UTC). Phase2 did not re-fetch the page. Use an earlier internal deadline and obtain organizer clarification; see [historical Feedback report](../feedback/002-deadline-timezone-conflict.md).
- Judge access to the delivery repository remains unverified and must be resolved before actual submission. Public source release, vulnerability disclosure and external messaging each require separate authorization.

- The 2026-10-24 pinned SDK system-config read failed with nested WebSocket DNS EAI_AGAIN; a separate later environment recorded connection refusal. Phase2 did not recheck transport; present reachability is unverified. Earlier successful HTTP/WS observations do not establish current SDK/owner acceptance. See [diagnosis](../evidence/g0/SDK_DIAGNOSIS.md) and [local Feedback report](../feedback/001-sdk-ws-eai-again.md).
- Argon returned a static review on 2026-10-25 after separate authorization; modelVersion was null. Prior timeout remains historical. Independent fixes and tests are not a formal audit or a post-fix Argon approval.
- A manually recovered transaction hash is not proof that it belongs to the original interrupted request. Reconciliation can inspect it, but recovered provenance must remain NeedsReview rather than automatically becoming Applied/Failed or unlocking another send. This deliberately conservative limitation is separate from normal wallet-returned, durably recorded hashes.

- Responsive QA covers real desktop CSS768px and485px, plus zoomed desktop CSS323px. Chromium’s observed native minimum width prevented an exact375px viewport at100% zoom. Physical phone/touch behavior is not accepted by those tests. See tests/browser/RESPONSIVE_QA.md.

- Legacy drafts without observedBlock and same-second transaction timing ambiguity remain NeedsReview; owner lock is retained. Local client wallet-result reports are trusted, not cryptographically authenticated. See review/ARGON_VERIFICATION_2026-10-25.md.
