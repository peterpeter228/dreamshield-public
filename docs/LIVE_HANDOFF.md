# Owner testnet handoff (not executed)

No private key or seed phrase is required by DreamShield. Use an isolated browser-wallet EOA that you control, not a main funds wallet. The project does not assume a prior wallet address is authorized.

## Before any wallet request
1. Confirm Tokyo chain ID 50383 in wallet and both configured HTTP/WS transports.
2. Choose one market from `doctor:readonly`, verify pool/registry/code, decimals, tick/lot/min quantity and valid mark.
3. Provide the public owner address locally. Verify browser signer == owner. Linked bot permission does not authorize native stops.
4. Confirm test collateral eligibility and balance, STT gas, dynamic registry deposit per stop, and the exact maximum permitted test position/fees. These are not yet known, so no executable amount is preapproved.
5. Use official app for the initial perps order if needed; preserve actual receipt, decoded order/fill and current position. No fill is not a position.
6. Preview one native whole-position reduceOnly SL with valid trigger, exact deposit and fresh snapshot. Wallet native confirmation is required.
7. Record hash immediately; if outcome is unknown, reconcile that operation before another request. Never retry because a timeout elapsed.
8. Independently read the stop and position after receipt. A mined hash alone is not coverage verification.
9. Only when explicitly ready, cancel the selected test SL, observe the protection gap, create a replacement and verify. Canceling protection does not close the position. End by recording residual position, stops, orders and balances.

G1 remains NOT_RUN until all corresponding same-chain/account/market evidence exists. No mainnet, externally managed funds, signatures by an assistant, or real-money trading is authorized.

## Unknown outcome with a recovered hash

Select the original operation in the timeline and supply only the hash recovered from that wallet's activity. Recovery binds it immutably and never sends again. A manually supplied hash cannot by itself prove original-request provenance; even matching on-chain parameters may refer to another transaction. The application therefore retains NeedsReview and the account lock rather than automatically releasing it on a recovered hash. Do not delete the journal or change accounts/configuration to bypass this guard. Further provenance resolution remains a documented limitation, not a completed recovery acceptance claim.
