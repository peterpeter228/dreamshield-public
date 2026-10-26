# Browser acceptance matrix (not an execution record)
Serve built UI via the local Express app. Record actual browser outcomes and screenshots separately from this matrix.

1. At 1440×1000, 768×1024, 375×812: inspect all content, focus controls, no horizontal document overflow.
2. Select Missing stop-loss: fixture banner, NEEDS_PROTECTION, no active stops, preview empty/zero/non-decimal/wrong-side/tick-misaligned inputs rejected; valid below-mark price shows unsigned preview, no transaction.
3. Short position: direction Short and reduce-only buy, above-mark trigger only.
4. Whole-position SL: configuration verified, whole-at-trigger explicitly, no fill guarantee. Leave >15 seconds: verdict becomes UNKNOWN and preview disabled; Recheck restores fresh replay only.
5. Partial coverage and broken OCO: review, no duplicate stop suggested. No position: no automatic open. Incomplete discovery: unknown, never infer zero orders.
6. Evidence accordion reveals timestamp/block/scope/raw tick; copy owner returns success or readable fallback; export JSON includes displayed scenario/snapshot and fixture mode.
7. Fetch failure after success: green revoked, old data explicitly historical, retry recovery. Rapid scenario changes: latest response wins.
8. Wallet absent/rejected: desk usable. Wallet wrong chain/different owner explicit. accountsChanged/chainChanged/disconnect clears connected identity. No wallet switch/sign/send request.
9. Timeline empty does not claim real activity; unresolved operation instructs no duplicate send; reconcile only rereads.
10. Developer console and network: no unhandled exceptions, no POST signing route, no live transaction during replay.

Replay actions and injected-wallet mocks must not be described as actual chain transactions or wallet approval evidence.
