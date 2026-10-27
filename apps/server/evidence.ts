import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import type {EvidenceProvenance,LiveLifecycleEvidence} from '../../packages/domain/live-evidence.js';
import type {Journal} from '../../packages/storage/index.js';
import {isInFlight} from '../../packages/domain/index.js';

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
 return {schemaVersion:1,artifactType:'dreamshield-g1-lifecycle',lifecycleId,identity:opening.identity,provenance:{...opening.provenance,capturedAt:observations.at(-1)!.provenance.capturedAt},observations,operations};
}
