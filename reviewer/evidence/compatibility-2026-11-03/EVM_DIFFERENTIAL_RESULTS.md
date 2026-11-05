# Isolated EVM differential check

Run:2026-11-03 16:07–16:08UTC. Preparatory synthetic evidence only. No product admission/code/dependency changed. No wallet keys/signatures, RPC calls or transactions.

## Inputs and implementation
- Published Safe1.5.0 full123-byte runtime from integrity-verified official npm artifact `safe/package/build/artifacts/contracts/proxies/SafeProxy.sol/SafeProxy.json`.
- Full114-byte observedruntime from user faultpacket, including CBOR metadata. This observedruntime is NOT thereby independently trusted.
- @ethereumjs/evm10.1.3, common10.1.3, util10.1.3, officialnpm, installed with --ignore-scripts into isolated evm-check directory. Package-lock preserved.
- Official implementation docs checked: https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/evm . EVM Common explicitly Cancun; synthetic chain context, not Somnia's actual gas schedule.

## Actual commands and exits
1. `npm init -y` exit0.
2. `npm install --ignore-scripts @ethereumjs/evm @ethereumjs/common @ethereumjs/util` exit1: default <unavailable-default-cache> unavailable.
3. `npm install --cache <isolated-cache> --ignore-scripts @ethereumjs/evm @ethereumjs/common @ethereumjs/util` exit0,14packages.
4. `node differential.mjs` exit0,94comparison cases,0mismatches in comparison scope. Executed again after adding gas sensitivity and mutation demonstrations; exit0. Full final run.log retained.
5. `npm list --depth=0` exit0, three top-level packages10.1.3.

##94 comparisons
Ten synthetic delegate callees: STOP/empty return, calldata echo, revert echo, constant32-byte return,4096-byte return, empty revert, context ADDRESS+CALLER+CALLVALUE, delegated storagewrite/read, invalidopcode, no code.
Nine calldata inputs: empty,1/3-byte selector prefixes, exact masterCopy4bytes, selector+28zero bytes, selector+nonzero suffix, selector+60FFbytes, nongGetter4bytes,8192-byte calldata.
Additional zero and dirty-upper96-bit slot0 cases for getter/nongGetter.
Each fresh EVM compares output, error, delegated slot1 mutation and message frames (to, caller, delegatecall, codeAddress, data, value). Gas expenditure intentionally not part of equality. Synthetic msg.value7 and fundedcaller; no real wallet.

## Important counterexamples and limits
- Gas-observing delegatecallee returns DIFFERENT GAS values: at gasLimit5000, old209 vs new213; at1000000, old979662 vs new979666. Bothsucceed. Thus this is explicitly NOT universal observational or gas-context equivalence.
- At low2200/2500 both out-of-gas, but no comprehensive gas threshold sweep was performed. Somnia actualgas schedule differs and was not simulated.
- Selector shift opcode mutation changes getter behavior (returns echoed selector rather than slot0), demonstrating semantic regression visibility.
- Metadata-only byte mutation leaves sampled getter behavior unchanged. Therefore these tests cannot replace strict full-byte identity/provenance validation; arbitrary metadata variant must still be rejected by admission policy.
- Not a formal proof; finite inputs, finite mockcallees, no full Safe execution tests, no actualfactory/control/owner/trace/G0/G1 verification. Those existing protections must remain and need product-specific regressiontests separately.
- No trust-model change or observedhash whitelisting performed. User decision remains required for any independent disassembly/semantic proof admission alternative.

## Evidence files
- evm-check/differential.mjs (reproducible harness)
- evm-check/package-lock.json and package.json
- evm-check/results.json (94 full comparison records)
- evm-check/gas-limitations.json
- evm-check/mutation-demonstrations.json
- evm-check/run.log

Unknownruntime rejection is a policy-level requirement, not established by this EVM behavior test. No claim of safe automatic admission or source provenance is made.

Sanitization: historical host cache paths replaced by labels; result payloads unchanged.
