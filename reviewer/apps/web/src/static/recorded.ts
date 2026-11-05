/// <reference types="vite/client" />
import fixtureUrl from '../../../../fixtures/recorded/opening-2026-11-04.json?url';
import evidenceUrl from '../../../../evidence/recorded/opening-2026-11-04.sanitized.json?url';
import {assessDesk} from '../../../../packages/domain/desk';
import {sha256} from './export';
import type {RecordedObservation} from './export';
export const recordedEvidenceHref=evidenceUrl;
export async function readRecorded():Promise<RecordedObservation>{
 const packaged=async(asset:string)=>{const url=new URL(asset,document.baseURI);if(url.origin!==location.origin)throw new Error('PACKAGED_ORIGIN_REQUIRED');const response=await fetch(url,{credentials:'omit',redirect:'error'});if(!response.ok)throw new Error('PACKAGED_READ_FAILED');return response};
 const raw=await (await packaged(fixtureUrl)).json();
 const bytes=new Uint8Array(await (await packaged(evidenceUrl)).arrayBuffer());
 const s=raw.snapshot,c=raw.recordedCapture;
 if(raw.schemaVersion!==1||raw.kind!=='recorded-chain'||!s||!c||s.mode!=='replay'||s.scope!=='knownIdsOnly'||s.complete!==false||typeof s.readError!=='string'||!s.readError.trim()||s.stops?.length!==2||c.kind!=='recorded-chain'||c.attribution!=='official-dreamdex-ui-user-safe-not-dreamshield'||c.realSendProof!=='NONE'||c.liveWorkflowVerified!==false||s.capturedAt!==c.capturedAt||!Number.isFinite(Date.parse(s.capturedAt))||c.aggregateSnapshot?.complete!==false||!c.aggregateSnapshot.readError||s.readError!==c.aggregateSnapshot.readError||c.pin?.block!==s.market?.observedBlock||c.pin?.hash!==s.market?.blockHash||await sha256(bytes)!==c.sourceSha256)throw new Error('INVALID_CAPTURE');
 const assessment=assessDesk(s,[],Date.parse(s.capturedAt));
 if(assessment.verdict!=='UNKNOWN'||!assessment.reasonCodes.includes('READ_FAILED')||assessment.stopRisk?.quality!=='EXTREME_DISTANCE'||assessment.stopRisk.distanceBps!=='9999')throw new Error('INVALID_KNOWN_OBSERVATIONS');
 return {snapshot:s,recordedCapture:c};
}
