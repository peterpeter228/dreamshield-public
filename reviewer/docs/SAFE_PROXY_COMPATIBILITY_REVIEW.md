# Reviewed SafeProxy compatibility — 2026-11-03

## User-approved assurance basis

The user approved the explicitly described change from requiring an unavailable official exact compiler build to independent complete-runtime review against official Safe behavior, exact fullhash pinning and adversarial/regression testing. This approval does not authorize wallet operations, publication or submission. The earlier formal-tool requirement was an overly strong proposed process, not an organizer rule or the old approach's guarantee.

This variant is **independently reviewed compatible runtime**, not an official compiler reproduction, formal proof, full audit or universal contextual equivalence. Source/build origin remains unverified. The observed hash is only the identifier of code independently reviewed; observation alone was not accepted as proof.

## Independent references and exact scope

- Official Safe v1.5.0 source: https://raw.githubusercontent.com/safe-global/safe-smart-account/v1.5.0/contracts/proxies/SafeProxy.sol . Downloaded through integrity-verified official npm1.5.0; source SHA256 `1bb576fcb7369de7a7631e8a5d93508b137c592ada55522495aa8ca042090624`.
- Somnia official architecture: https://new.docs.somnia.network/network/smart-accounts and addresses/chains docs. CREATE3/factory authenticity remains separate from runtime behavior; factory is upgradeable.
- Original123byte proxy exacthash `0x4e381985ca68b3e5d27b4425fa581c19cf33146d3f887a3cfca96f55528ea46f` retains official published-artifact trust.
- Reviewed114byte exacthash `0xcba2bdf3a8be3fdb4e591c4c0d50dbea84d7aff51a228f3f95db23d4520360a4` includes ALL CBOR metadata and length bytes. No metadata stripping, prefix matching, length/compiler-version admission or wallet-address exception.
- Exact bytes, full opcode/stack/control-flow derivation and limitations: [independent static review](../evidence/compatibility-2026-11-03/STATIC_RUNTIME_REVIEW.md).

The reviewer independently checked all reachable instructions: only getter/one slot0 DELEGATECALL, exact calldata and return/revert propagation, no proxy SSTORE/CREATE/SELFDESTRUCT or arbitrary jump, all normal paths halt before metadata. Delegated singleton storage changes remain possible and are still constrained by original proofs. Standard EVM PUSH0 semantics required; no claim of Somnia gas-schedule identity.

## Independent dynamic evidence and limits

EthereumJS EVM10.1.3 isolated officialnpm implementation, Cancun synthetic environment:94 comparison cases versus the complete published legacy runtime,0 mismatches in output/error/storage/context/delegate-frame scope. Explicit GAS-observing callee counterexample returns different gas values; do not claim universal/gas equivalence. No actual Safe/factory transaction or G0/G1 is established by those mocks.

[Report](../evidence/compatibility-2026-11-03/EVM_DIFFERENTIAL_RESULTS.md), harness `evm-differential.mjs`, exact dependency lock and legacy runtime fixture alongside it. Compressed full94 records `evm-results.json.gz` and SHA256 record preserve raw output; gas and mutation cases retained. For isolated reproduction, copy evm-package.json/package-lock.json to package.json/package-lock.json in a scratch directory, install with `npm ci --ignore-scripts`, and run the copied harness with legacy-proxy-runtime.json beside it. Product dependencies remain unchanged.

## Minimal implementation and retained guarantees

Only production change: replace the single private proxyhash constant with a private two-item Set and membership check. Singleton hash remains exact and unchanged. Factory derivation/response, singleton/fallback/storage slots, owners/threshold/modules/guard/configuration/history/nonce, sender and signed/ecrecover authorization, exact trace and successful internal CALL, owner-associated fill/position/native-stop validation, EOA v1, persistence and Unknown locks remain unchanged. Unsupported states still reject.

Independent diff review found no blocking issue. This is independent engineering review, not formal security-audit certification.

Historical assurance excerpt only. This is not a current runtime, browser or chain acceptance claim. The complete-runtime static and isolated EVM records below are historical, not an audit.
