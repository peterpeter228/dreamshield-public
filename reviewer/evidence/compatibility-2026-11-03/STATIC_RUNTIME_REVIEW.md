# Independent complete-runtime static review

Reviewed 2026-11-03 16:06–16:08 UTC. Read-only analysis; no implementation/admission-policy change. This is a manual EVM static review, NOT a formal proof, compiler reproduction, deployment-origin certification, organizer approval, or security audit certification.

## Inputs and independent behavioral specification

Observed complete114-byte runtime (not itself trusted merely because it was observed):

```
60806040525f5463a619486e5f3560e01c146030575f8091368280378136915af43d5f803e15602c573d5ff35b3d5ffd5b60601b606c5260206060f3fea264697066735822122052ebe5837e93aeeebe7c7bd4a52dd4a1efcfd6f36c88f74ed36ebe47b30b033d64736f6c63430008220033
```

Recorded keccak256:0xcba2bdf3a8be3fdb4e591c4c0d50dbea84d7aff51a228f3f95db23d4520360a4. Parent independently measured this exact code on canonical50383 block40575918. This review does not elevate that observation to deployment provenance.

Independent specification: official Safe v1.5.0 `contracts/proxies/SafeProxy.sol`, read from the published official package, and public source https://raw.githubusercontent.com/safe-global/safe-smart-account/v1.5.0/contracts/proxies/SafeProxy.sol . The source explicitly describes sload(0), first4-byte masterCopy selector, shl96/mstore0x6c getter encoding, delegatecall and complete return/revert-data propagation. Source identity and publishing provenance remain distinct from proving this exact deployed artifact was compiled from it.

## Complete reachable opcode listing

Offsets hexadecimal; PUSH immediates excluded from instruction starts.

```
00 PUSH1 80        02 PUSH1 40       04 MSTORE
05 PUSH0          06 SLOAD          07 PUSH4 a619486e
0c PUSH0          0d CALLDATALOAD   0e PUSH1 e0
10 SHR            11 EQ            12 PUSH1 30
14 JUMPI
15 PUSH0          16 DUP1          17 SWAP2
18 CALLDATASIZE   19 DUP3          1a DUP1
1b CALLDATACOPY   1c DUP2          1d CALLDATASIZE
1e SWAP2          1f GAS           20 DELEGATECALL
21 RETURNDATASIZE 22 PUSH0          23 DUP1
24 RETURNDATACOPY 25 ISZERO         26 PUSH1 2c
28 JUMPI
29 RETURNDATASIZE 2a PUSH0          2b RETURN
2c JUMPDEST       2d RETURNDATASIZE 2e PUSH0
2f REVERT
30 JUMPDEST       31 PUSH1 60       33 SHL
34 PUSH1 6c       36 MSTORE         37 PUSH1 20
39 PUSH1 60       3b RETURN
3c INVALID
```

Bytes0x3d..0x6f contain51-byte CBOR metadata; bytes0x70..0x71 are `0033` (51). CBOR encodes an IPFS multihash and solc bytes `000822` (0.8.34). That metadata is retained in the FULL input hash; it is not stripped or generalized.

## Control-flow and stack derivation

Stack notation is bottom→top; S=256-bit storage slot0 value, N=calldata length, R=returndata length, O=delegate success bit.

1. Entry0x00–0x06: MSTORE(0x40,0x80), then SLOAD(0), leaves `[S]`.
2.0x07–0x14: compare `shr(224,calldataload(0))` with0xa619486e. Before JUMPI stack is `[S,condition,0x30]`. JUMPI consumes its destination and condition, leaving `[S]` on either path. The only target here is literal0x30.
3. Getter0x30: push96/SHL transforms S to `(S<<96) mod2^256`, erasing high96bits. MSTORE(0x6c,value) consumes stack. RETURN(0x60,0x20) terminates. Bytes0x60..0x6b remain zero because only prior write was0x40..0x5f; bytes0x6c..0x7f are low160bits of S. Thus returned32-byte word is canonical zero-padded address. Matching is based on first4bytes only; trailing calldata is ignored, as official v1.5 source explicitly specifies. Calldata shorter than4bytes is zero-padded by CALLDATALOAD and cannot equal this selector.
4. Fallback0x15–0x1b from `[S]`: PUSH0,DUP1,SWAP2 leave `[0,0,S]`; CALLDATASIZE,DUP3,DUP1 yield `[0,0,S,N,0,0]`; CALLDATACOPY consumes dest0/source0/lengthN leaving `[0,0,S]`. Full calldata is now in memory0..N−1.
5.0x1c–0x20: DUP2,CALLDATASIZE,SWAP2,GAS yield `[0,0,N,0,S,G]`. DELEGATECALL pops gasG,targetS,inputOffset0,inputSizeN,outputOffset0,outputSize0 and leaves `[O]`. EVM call-address interpretation uses low160bits of S; high96bits are not an extra target. The proxy address/storage context and original msg.sender/msg.value are preserved by DELEGATECALL. No CALLVALUE guard rejects payable forwarding. The actual forwarded gas is EVM-limited (including EIP-150) and is not literally all caller gas.
6.0x21–0x24: `[O,R,0,0]` before RETURNDATACOPY; full return data copied to memory0..R−1, leaving `[O]`. ISZERO and literal PUSH0x2c make the only other conditional jump. Failed delegate goes to0x2c and REVERT(0,R); success reaches0x29 and RETURN(0,R). Both terminate.

There are no dynamic jump targets, loops, alternate entrypoints or fall-through into0x3c. EVM execution begins at0 for external calls. Every normally executing path halts at0x2b,0x2f or0x3b. Exceptional halts (e.g. out-of-gas, invalid/incompatible opcode) cannot resume into metadata. Consequently metadata is unreachable under the standard EVM instruction semantics for this complete byte sequence.

## Preserved properties and scope limits

- Proxy code itself performs exactly one SLOAD, no SSTORE, CREATE/CREATE2, SELFDESTRUCT, external CALL/STATICCALL or extra DELEGATECALL. The only external execution is the one slot0 delegatecall, unless getter selected.
- Delegatecall target can execute arbitrary code and modify proxy storage as normal Safe functionality permits. This review does NOT assert the singleton cannot change slot0 or other configuration; existing pinned singleton, slots, historical configuration, owner/signature and exact trace checks must remain.
- Constructor/deployment code is not part of this runtime. It does not prove initial singleton validation, factory authenticity or owner initialization. Existing factory derivation and configuration evidence remain necessary. CREATE3 address arithmetic alone does not bind runtime and the factory is upgradeable.
- This review does not prove data provided in a serialized AccountState came from a real canonical chain. Current on-chain reads, fullhash checks, before/after canonical history and authenticated workflow requirements remain distinct.
- Matching the reviewed behavior does not make arbitrary smart wallets acceptable. Any admissible variant would be this COMPLETE exact byte sequence/hash, never a prefix/template, observed-address exception or metadata-insensitive comparison.
- EVM fork must support PUSH0 (EIP-3855). Same chain ID is not proof of genesis/fork equivalence; existing chain/genesis checks remain required. This review does not inspect Somnia's complete EVM implementation.
- Resource limits apply: memory expansion, huge calldata/returndata, delegate failure and out-of-gas can fail. No availability, gas-equivalence, economic or transaction-success guarantee.
- Not universal contextual equivalence with the123-byte artifact: gas costs/gasleft and external code introspection (EXTCODEHASH/EXTCODESIZE of proxy) can distinguish variants. The claim is matching fallback safety behavior under standard EVM semantics, not identical execution in every context.

## Trust-root decision

This provides a concrete independent manual review anchored to the official Safe source behavior. It is not the missing exact official compiler StandardJSON reference. Accepting it instead would explicitly replace the build-provenance requirement for this variant with independently reviewed exact-bytecode behavior plus existing fullhash/configuration/provenance/authorization checks. That is a material assurance-policy decision for the user. No change is authorized or implemented by this document alone. A formal tool is not asserted as a new mandatory gate; further independent review/dynamic tests can strengthen confidence without pretending they reproduce the unavailable build.

## Tests to execute if user approves this assurance route

1. Exact complete114-byte code in a local EVM against a separately built/reference Safe proxy: empty calldata, lengths1–3, selector only, selector plus arbitrary suffix, nonmatching selectors, randomized calldata lengths including memory boundaries.
2. Getter for slot0=0, low160bit extremes, high96bits nonzero: canonical32-byte address result; no delegate invoked.
3. Fallback with stub singleton: original caller/address/value/storage context; exact calldata; return sizes0/1/31/32/33/large; exact revert bytes; delegate failure and resource failure propagate without a success claim.
4. Instrument trace: one delegatecall only, correct target, no proxy-created contracts or writes except those deliberately performed by singleton. Verify complete CFG/disassembly independently; test metadata cannot be reached through any selector or return path.
5. Any single-byte mutation in executable region or metadata, truncation, append, unknown hash rejected by production admission even if a mutation happens to preserve behavior. Fullhash remains exact.
6. Retain existing wrong factory/singleton/fallback/controller/owner/threshold/module/guard rejection, before/after configuration history, canonical binding, signed/ecrecover and sender-bound envelope, exact successful inner action, owner-linked fill/position/stop, EOA v1 and persistent Unknown locks.
7. Then actual pinned canonical Wallet1 observation with pre/post hash checks; only when supported, fresh complete G0. Neither local EVM tests nor this review is G0/G1 or permission to sign/transact.
