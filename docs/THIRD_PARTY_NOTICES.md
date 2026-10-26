# Third-party provenance

DreamShield depends on the published `@somnia-chain/markets-sdk@0.32.1`, pinned in [package.json](../package.json) and [package-lock.json](../package-lock.json). The read-only ABI declarations in [packages/protocol/sdk-abi.ts](../packages/protocol/sdk-abi.ts) and transaction ABI entries in [packages/protocol/transaction-abi.ts](../packages/protocol/transaction-abi.ts) are extracted from that pinned package; its MIT notice is retained in [packages/protocol/SDK-LICENSE.txt](../packages/protocol/SDK-LICENSE.txt). Other dependency licenses remain in their installed packages.

The project's domain, UI and journal implementation were written for DreamShield. No bot-kit strategy source was incorporated, and no claim is made that a bot-kit source commit was built or tested. Historical bot-kit research references are baselines, not an executed dependency. Before incorporating any future source from that repository, pin its exact commit and review/retain its license and attribution.

Product screenshots are captures of this project. No competitor branding or protected source was copied. Historical review and research records do not authorize disclosure of security findings; any such disclosure requires separate authorization.
