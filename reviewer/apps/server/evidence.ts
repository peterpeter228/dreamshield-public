import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import type {EvidenceProvenance,LiveLifecycleEvidence} from '../../packages/domain/live-evidence.js';
import {sameEvidenceIdentity} from '../../packages/domain/live-evidence.js';
import type {Journal} from '../../packages/storage/index.js';
import {isInFlight} from '../../packages/domain/index.js';
import {verifyAccountExecution} from '../../packages/protocol/account-proof.js';

export function captureProvenance():EvidenceProvenance {
 const sdk=JSON.parse(readFileSync('node_modules/@somnia-chain/markets-sdk/package.json','utf8')).version as string;
 const viem=JSON.parse(readFileSync('node_modules/viem/package.json','utf8')).version as string;
 return {source:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),verifier:'dreamshield-g1-v1'},versions:{node:process.version,sdk,viem},lockSha256:createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),mode:'live-owner',capturedAt:new Date().toISOString()};
}
/** Export preserves immutable observations and current operation ambiguity; it never captures or reconciles. */
export function exportLifecycle(journal:Journal,owner:string,pool:string,selected?:string):LiveLifecycleEvidence|null {
 const lifecycleId=selected??journal.currentLifecycle(owner,pool);
 if(!lifecycleId)return null;
 const observations=journal.observations(owner,pool,lifecycleId);const opening=observations.find(row=>row.kind==='opening');
 if(!opening)return null;
 const start=Date.parse(opening.provenance.capturedAt);
 const residual=observations.find(row=>row.kind==='residual');const end=residual?Date.parse(residual.provenance.capturedAt):Infinity;
 const operations=journal.evidenceOperations(owner,pool).filter(row=>Date.parse(row.operation.createdAt)>=start&&Date.parse(row.operation.createdAt)<=end);
 for(const operation of journal.list())if(operation.owner.toLowerCase()===owner.toLowerCase()&&isInFlight(operation.state)&&!operations.some(row=>row.operation.id===operation.id))operations.push({operation,proof:operation.evidence??null});
 if(observations.some(row=>!sameEvidenceIdentity(row.identity,opening.identity))||operations.some(row=>row.proof&&!sameEvidenceIdentity(row.proof.identity,opening.identity)))throw new Error('LIFECYCLE_IDENTITY_MISMATCH');
 for(const proof of [opening.opening,...operations.flatMap(row=>row.proof?[row.proof]:[])]){
  if(!proof||(opening.identity.execution==='official-safe')!==!!proof.accountExecution)throw new Error('LIFECYCLE_EXECUTION_MISMATCH');
  if(proof.accountExecution&&verifyAccountExecution(opening.identity.owner,proof.transaction,proof.receipt,proof.accountExecution).signer.toLowerCase()!==opening.identity.signer.toLowerCase())throw new Error('LIFECYCLE_IDENTITY_MISMATCH');
 }
 const body={artifactType:'dreamshield-g1-lifecycle' as const,lifecycleId,provenance:{...opening.provenance,capturedAt:observations.at(-1)!.provenance.capturedAt},observations,operations};
 return opening.identity.execution==='official-safe'?{...body,schemaVersion:2,identity:{...opening.identity,execution:'official-safe'}}:{...body,schemaVersion:1,identity:opening.identity as LiveLifecycleEvidence['identity'] & {execution?:never}};
}
