import {fixture} from '../../../../fixtures/scenarios';
import {assessDesk} from '../../../../packages/domain/desk';
import type {DeskResponse,RecordedCapture,Snapshot} from '../../../../packages/domain/types';
import {evidenceFilename} from '../presentation';
export const T=Date.parse('2026-11-04T00:00:00.000Z');
export type Selection={source:'synthetic'|'recorded';scenario:string};
export type ReadyContext=Readonly<Selection&{generation:number;data:DeskResponse;assessment:DeskResponse['assessment'];assessAt:number;snapshotJson:string;snapshotSha256:string}>;
export type StaticState={ready:ReadyContext|null;loading:boolean;error:string;notice:string};
export type RecordedObservation={snapshot:Snapshot;recordedCapture:RecordedCapture};
export interface StaticSession {readonly state:StaticState;invalidate():void;load(selection:Selection):Promise<void>;download(context:ReadyContext,handoff:(blob:Blob,filename:string)=>void):boolean}
export async function sha256(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),v=>v.toString(16).padStart(2,'0')).join('')}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
export function buildEvidenceExport(c:ReadyContext){return {artifactType:'dreamshield-static-readonly-observation',schemaVersion:1,...c.data.snapshot,assessment:c.assessment,...(c.data.recordedCapture?{recordedCapture:c.data.recordedCapture}:{}),liveWorkflowVerified:false,realSendProof:'NONE',staticContext:{mode:'static-readonly',source:c.source,scenario:c.scenario,assessAt:c.assessAt,snapshotSha256:c.snapshotSha256,capturedAt:c.data.snapshot.capturedAt,verdict:c.assessment.verdict,reasonCodes:c.assessment.reasonCodes,note:'Static client-side snapshot export. Not a lifecycle/G1 artifact, not fresh, not an origin attestation, no chain query.'}}}
/** The shell and tests share this exact load/commit/download ownership path. */
export function createStaticSession(readRecorded:()=>Promise<RecordedObservation>,publish:(state:StaticState)=>void,digest=sha256):StaticSession{
 let generation=0,state:StaticState={ready:null,loading:false,error:'',notice:''};
 const update=(next:StaticState)=>{state=next;publish(state)};
 const owns=(c:ReadyContext)=>state.ready===c&&c.generation===generation;
 return {
  get state(){return state},
  invalidate(){generation++;state={ready:null,loading:false,error:'',notice:''}},
  async load(selection:Selection){
   const token={...selection,scenario:selection.source==='recorded'?'recorded':selection.scenario,generation:++generation};
   const current=()=>generation===token.generation;
   update({ready:null,loading:true,error:'',notice:''});
   try{
    const observation=token.source==='recorded'?await readRecorded():{snapshot:fixture(token.scenario,T)};
    if(!current())return;
    const owned=freeze(structuredClone(observation)),snapshot=owned.snapshot;
    const assessAt=token.source==='recorded'?Date.parse(snapshot.capturedAt):T;
    const assessment=freeze(assessDesk(snapshot,[],assessAt)),snapshotJson=JSON.stringify(snapshot);
    const snapshotSha256=await digest(new TextEncoder().encode(snapshotJson));
    if(!current())return;
    const data=freeze({snapshot,assessment,operations:[],...('recordedCapture' in owned?{recordedCapture:owned.recordedCapture}:{}),capabilities:{mode:'replay' as const,ownerEnabled:false,signerAvailable:false,reason:'Static read-only observation. No chain query or transaction.'}});
    const ready=freeze({...token,data,assessment,assessAt,snapshotJson,snapshotSha256});
    update({ready,loading:false,error:'',notice:''});
   }catch{if(current())update({ready:null,loading:false,error:token.source==='recorded'?'READ_FAILED — recorded capture unavailable':'READ_FAILED — static snapshot unavailable',notice:''})}
  },
  download(c:ReadyContext,handoff:(blob:Blob,filename:string)=>void){
   const body=JSON.stringify(buildEvidenceExport(c));
   if(!owns(c))return false;
   handoff(new Blob([body],{type:'application/json'}),evidenceFilename('replay',c.source==='recorded'?'recorded':c.scenario));
   if(owns(c))update({...state,notice:'Static observation downloaded. Not G1, not fresh, not an origin attestation.'});
   return true;
  }
 };
}
