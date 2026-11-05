import type {StopRisk} from './stop-risk.js';
import type { OperationEvidenceProof } from './live-evidence.js';
export type Mode = 'replay' | 'live-readonly' | 'live-owner';
export type Scope = 'indexedSnapshot' | 'knownIdsOnly' | 'unavailable';
export interface MarketSnapshot { genesisHash?:string; chainId:number; pool:string; marginBank:string; stopRegistry:string; symbol:string; baseDecimals:number; quoteDecimals:number; tickSize:string; lotSize:string; minQuantity:string; mark:string; feedValid:boolean; observedBlock:string; blockHash:string|null; observedAt:string; stopDeposit:string|null; }
export interface PositionSnapshot { chainId:number; owner:string; pool:string; signedSize:string; entryPrice:string; observedBlock:string; observedAt:string; source:'chain'|'fixture'; }
export interface NativeStopSnapshot { id:string; owner:string; pool:string; registry:string; intent:'reduceOnly'|'opening'; isBid:boolean; quantity:string; triggerPrice:string; triggerOperator:0|1; stopOrderType:0|1; limitPrice:string; status:'pending'|'filled'|'cancelled'|'dropped'|'unknown'; siblingId:string|null; observedBlock:string; }
export interface AccountModel {
 address:string; block:{number:string;hash:string}|null; code:'empty'|'present'|'unknown'; codeHash:string|null;
 architecture:'official-safe'|'unclassified'|'unknown'; derivation:{accountId:string;index:string;from:0;to:19}|null;
 owners:string[]|null; threshold:string|null; controlRead:'known'|'unknown'|'error'; reason:string;
 historicalAuthorization?:{signer:string;transactionHash:string;blockNumber:string;blockHash:string};
}
export interface Snapshot { account?:AccountModel; readonlyWarmup?:{attempt:number;status:'passed'|'failed';ms:number;causes?:string[]}[]; stopDiscovery?:{fromBlock:string;toBlock:string;indexerWaitedThrough:string;mutationFree:boolean}; mode:Mode; market:MarketSnapshot|null; position:PositionSnapshot|null; stops:NativeStopSnapshot[]; scope:Scope; readError:string|null; capturedAt:string; complete:boolean; }
export type Verdict='NEEDS_PROTECTION'|'VERIFIED'|'NEEDS_REVIEW'|'PENDING'|'UNKNOWN'|'NO_POSITION';
export interface Assessment { stopRisk?:StopRisk; verdict:Verdict; reasonCodes:string[]; summary:string; coverageMode:'whole-at-trigger'|'fixed'|'none'|'unknown'; coveredRaw:string|null; stopIds:string[]; checkedAt:string; expiresAt:string; scope:Scope; }
export interface RepairDraft { observedBlock?:string; revision:number; fingerprint:string; owner:string; pool:string; registry:string; chainId:number; action:'create-sl'|'cancel-stop'; stopId:string|null; isBid:boolean; triggerOperator:0|1; triggerPrice:string; quantity:string; intent:'reduceOnly'; deposit:string; createdAt:string; }
export type OperationState='Draft'|'AwaitingSignature'|'Submitted'|'Unknown'|'Reconcile'|'Applied'|'NeedsReview'|'Failed'|'Cancelled';
export interface Operation { evidence?:OperationEvidenceProof; id:string; idempotencyKey:string; owner:string; pool:string; state:OperationState; draft:RepairDraft; txHash:string|null; hashProvenance?:'recovered'; error:string|null; createdAt:string; updatedAt:string; }
export interface RecordedCapture {
 kind:'recorded-chain';sourceSha:string;capturedAt:string;pin:{block:string;hash:string;timestamp:string};
 opening:{txHash:string;block:string;blockHash:string;operation:1;target:string;verifier:{status:'REJECTED';error:string}};
 attribution:'official-dreamdex-ui-user-safe-not-dreamshield';realSendProof:'NONE';liveWorkflowVerified:false;
 sourceFile:string;sourceSha256:string;aggregateSnapshot:Snapshot;limitations:string[];
}
export interface DeskResponse { recordedCapture?:RecordedCapture; snapshotId?:string; snapshot:Snapshot; assessment:Assessment; operations:Operation[]; capabilities:{account?:AccountModel|null; monitoredOwner?:string|null; mode:Mode; ownerEnabled:boolean; signerAvailable:boolean; reason:string}; }
