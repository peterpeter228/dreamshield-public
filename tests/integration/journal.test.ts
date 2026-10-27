import {describe,it,expect} from 'vitest';
import {Journal} from '../../packages/storage/index.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from '../../fixtures/scenarios.js';
import {loadConfig} from '../../apps/server/config.js';
import type {Operation,RepairDraft} from '../../packages/domain/types.js';
import type {EvidenceObservation,OperationEvidenceProof} from '../../packages/domain/live-evidence.js';

const d:RepairDraft={revision:1,fingerprint:'test',owner:'0x1',pool:'0x2',registry:'0x3',chainId:50383,action:'create-sl',stopId:null,isBid:false,triggerOperator:1,triggerPrice:'10',quantity:'0',intent:'reduceOnly',deposit:'1',createdAt:'2026-01-01T00:00:00Z'};
const hash='0x'+'a'.repeat(64);
function submitted(j:Journal,key='a'){
 const op=j.reserve(d,key);
 j.transition(op.id,'AwaitingSignature');
 return j.transition(op.id,'Submitted',hash);
}

describe('durable journal',()=>{
 it('idempotency and single owner lock are transactional',()=>{
  const j=new Journal(':memory:');
  try{
   const a=j.reserve(d,'a');
   expect(j.reserve(d,'a').id).toBe(a.id);
   expect(j.reserve({...d,createdAt:'2026-01-01T00:00:01Z'},'a').id).toBe(a.id);
   expect(()=>j.reserve({...d,pool:'other'},'b')).toThrow('IN_FLIGHT');
   expect(()=>j.reserve({...d,triggerPrice:'11'},'a')).toThrow('CONFLICT');
   expect(j.list()).toHaveLength(1);
  }finally{j.close();}
 });
 it.each(['AwaitingSignature','Reconcile'] as const)('recovers interrupted %s to unknown and keeps the owner locked',state=>{
  const dir=mkdtempSync(join(tmpdir(),'dreamshield-test-'));
  const path=join(dir,'test.db');let j=new Journal(path);
  try{
   const a=j.reserve(d,'a');j.transition(a.id,'AwaitingSignature');
   if(state==='Reconcile'){j.transition(a.id,'Submitted',hash);j.transition(a.id,'Reconcile');}
   j.close();j=new Journal(path);
   expect(j.recover()).toBe(1);expect(j.recover()).toBe(0);
   expect(j.get(a.id)?.state).toBe('Unknown');
   expect(j.get(a.id)?.txHash).toBe(state==='Reconcile'?hash:null);
   expect(()=>j.reserve(d,'b')).toThrow('IN_FLIGHT');
   expect(()=>j.transition(a.id,'Submitted',hash)).toThrow('INVALID_TRANSITION');
   expect(j.transition(a.id,'Reconcile').state).toBe('Reconcile');
  }finally{j.close();rmSync(dir,{recursive:true});}
 });
 it('requires a submitted hash and preserves it on every later transition',()=>{
  const j=new Journal(':memory:');
  try{
   const a=j.reserve(d,'a');expect(()=>j.transition(a.id,'Applied')).toThrow();
   j.transition(a.id,'AwaitingSignature');
   expect(()=>j.transition(a.id,'Submitted')).toThrow('HASH_REQUIRED');
   expect(()=>j.transition(a.id,'Submitted','')).toThrow('INVALID_TX_HASH');
   j.transition(a.id,'Submitted',hash);
   expect(()=>j.transition(a.id,'Reconcile','0x'+'b'.repeat(64))).toThrow('HASH_IMMUTABLE');
   expect(j.get(a.id)?.state).toBe('Submitted');
   expect(j.transition(a.id,'Reconcile').txHash).toBe(hash);
  }finally{j.close();}
 });
 it('cannot mark applied without independent read-back proof',()=>{
  const j=new Journal(':memory:');
  try{
   const a=submitted(j);j.transition(a.id,'Reconcile');
   expect(()=>j.transition(a.id,'Applied')).toThrow('READ_BACK_REQUIRED');
   expect(j.get(a.id)?.state).toBe('Reconcile');
   expect(()=>j.reserve(d,'b')).toThrow('IN_FLIGHT');
   expect(j.transition(a.id,'Applied',undefined,'Verified native stop read-back',{readBackVerified:true}).state).toBe('Applied');
   expect(j.reserve({...d,revision:2},'b').state).toBe('Draft');
  }finally{j.close();}
 });
 it('requires a verified reverted receipt before releasing a failed operation',()=>{
  const j=new Journal(':memory:');
  try{
   const a=submitted(j);j.transition(a.id,'Reconcile');
   expect(()=>j.transition(a.id,'Failed')).toThrow('EXPLICIT_FAILURE_REQUIRED');
   expect(j.get(a.id)?.state).toBe('Reconcile');
   expect(j.transition(a.id,'Failed',undefined,'RECEIPT_REVERTED',{receiptFailed:true}).state).toBe('Failed');
  }finally{j.close();}
 });
 it('unknown without a hash cannot become applied even with a proof flag',()=>{
  const j=new Journal(':memory:');
  try{
   const a=j.reserve(d,'a');j.transition(a.id,'AwaitingSignature');j.transition(a.id,'Unknown');j.transition(a.id,'Reconcile');
   expect(()=>j.transition(a.id,'Applied',undefined,undefined,{readBackVerified:true})).toThrow('HASH_REQUIRED');
   expect(j.get(a.id)?.state).toBe('Reconcile');
  }finally{j.close();}
 });
 it('NeedsReview is reconcilable and never releases the owner lock',()=>{
  const j=new Journal(':memory:');
  try{
   const a=submitted(j);j.transition(a.id,'Reconcile');j.transition(a.id,'NeedsReview');
   expect(()=>j.reserve({...d,pool:'other'},'b')).toThrow('IN_FLIGHT');
   expect(()=>j.transition(a.id,'Cancelled')).toThrow('INVALID_TRANSITION');
   expect(j.transition(a.id,'Reconcile').state).toBe('Reconcile');
   expect(j.transition(a.id,'Unknown').txHash).toBe(hash);
  }finally{j.close();}
 });
 it('deduplicates events and persists cursor',()=>{
  const j=new Journal(':memory:');
  try{
   expect(j.recordEvent('block:log',{})).toBe(true);expect(j.recordEvent('block:log',{})).toBe(false);
   j.setCursor('chain','100');expect(j.getCursor('chain')).toBe('100');
  }finally{j.close();}
 });
});
describe('mode boundary',()=>{
 it('defaults to replay no writes',()=>expect(loadConfig({}).ownerEnabled).toBe(false));
 it('rejects contradictory writes and public owner',()=>{
  expect(()=>loadConfig({APP_MODE:'replay',ALLOW_TESTNET_WRITES:'true'})).toThrow();
  expect(()=>loadConfig({APP_MODE:'live-owner',HOST:'0.0.0.0',READ_ONLY:'false',ALLOW_TESTNET_WRITES:'true'})).toThrow();
  expect(()=>loadConfig({ALLOWED_CHAIN_ID:'50312'})).toThrow();
 });
 it('allows explicit local owner only',()=>expect(loadConfig({APP_MODE:'live-owner',READ_ONLY:'false',ALLOW_TESTNET_WRITES:'true'}).ownerEnabled).toBe(true));
});

describe('recovered transaction hash binding',()=>{
 it('binds a recovered hash on an unresolved original operation without releasing its owner lock',()=>{
  const j=new Journal(':memory:');try{
   const op=j.reserve(d,'recovery');j.transition(op.id,'AwaitingSignature');j.recover();
   const recovered=j.bindRecoveredHash(op.id,hash,d.owner,d.pool);
   expect(recovered.state).toBe('Unknown');expect(recovered.txHash).toBe(hash);
   expect(j.bindRecoveredHash(op.id,hash,d.owner,d.pool).txHash).toBe(hash);
   expect(()=>j.reserve(d,'other')).toThrow('IN_FLIGHT');
   expect(j.transition(op.id,'Reconcile').txHash).toBe(hash);
   expect(()=>j.transition(op.id,'Applied')).toThrow('ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED');
  }finally{j.close();}
 });
 it('rejects wrong scope, malformed hashes, replacement, and terminal-state recovery',()=>{
  const j=new Journal(':memory:');try{
   const op=j.reserve(d,'recovery');
   expect(()=>j.bindRecoveredHash(op.id,hash,d.owner,d.pool)).toThrow('RECOVERY_STATE');
   j.transition(op.id,'AwaitingSignature');j.transition(op.id,'Unknown');
   expect(()=>j.bindRecoveredHash(op.id,hash,'other',d.pool)).toThrow('SCOPE');
   expect(()=>j.bindRecoveredHash(op.id,hash,d.owner,'other')).toThrow('SCOPE');
   expect(()=>j.bindRecoveredHash(op.id,'0x123',d.owner,d.pool)).toThrow('INVALID_TX_HASH');
   expect(j.get(op.id)?.txHash).toBeNull();
   j.bindRecoveredHash(op.id,hash,d.owner,d.pool);
   expect(()=>j.bindRecoveredHash(op.id,'0x'+'b'.repeat(64),d.owner,d.pool)).toThrow('IMMUTABLE');
   j.transition(op.id,'Reconcile');
   expect(()=>j.transition(op.id,'Failed',undefined,undefined,{receiptFailed:true})).toThrow('ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED');
   expect(()=>j.bindRecoveredHash(op.id,hash,d.owner,d.pool)).toThrow('RECOVERY_STATE');
  }finally{j.close();}
 });
});


describe('recovery never unlocks uncertain transactions',()=>{
 it('atomically makes awaiting recovery Unknown and prevents late cancellation or new reservation',()=>{
  const j=new Journal(':memory:');try{
   const op=j.reserve(d,'awaiting-recovery');j.transition(op.id,'AwaitingSignature');
   const recovered=j.bindRecoveredHash(op.id,hash,d.owner,d.pool);
   expect(recovered).toMatchObject({state:'Unknown',hashProvenance:'recovered',txHash:hash});
   expect(j.get(op.id)?.state).toBe('Unknown');
   expect(()=>j.transition(op.id,'Cancelled')).toThrow('INVALID_TRANSITION');
   expect(()=>j.reserve(d,'duplicate')).toThrow('IN_FLIGHT');
   j.transition(op.id,'Reconcile');
   expect(()=>j.transition(op.id,'Applied',undefined,undefined,{readBackVerified:true})).toThrow('PROVENANCE_REQUIRED');
   expect(()=>j.transition(op.id,'Failed',undefined,undefined,{receiptFailed:true})).toThrow('PROVENANCE_REQUIRED');
   j.transition(op.id,'NeedsReview');expect(()=>j.reserve(d,'duplicate')).toThrow('IN_FLIGHT');
  }finally{j.close();}
 });
 it('rejects attaching a hash to cancellation itself',()=>{
  const j=new Journal(':memory:');try{
   const op=j.reserve(d,'reject-cancel');j.transition(op.id,'AwaitingSignature');
   expect(()=>j.transition(op.id,'Cancelled',hash)).toThrow('KNOWN_TRANSACTION_CANNOT_BE_CANCELLED');
   expect(j.get(op.id)?.state).toBe('AwaitingSignature');
  }finally{j.close();}
 });
});

describe('atomic durable reconciliation evidence (synthetic storage proof only)',()=>{
 function proof(operation:Operation):OperationEvidenceProof {
  const at='2026-10-27T12:00:00.000Z';const s=fixture('protected',Date.parse(at));
  const block={number:'100',hash:`0x${'b'.repeat(64)}`,timestamp:at};
  const snapshot={...s,mode:'live-owner' as const,market:{...s.market!,blockHash:block.hash,genesisHash:`0x${'c'.repeat(64)}`},
   position:{...s.position!,owner:operation.owner,pool:operation.pool,source:'chain' as const}};
  return {identity:{chainId:50383,genesisHash:snapshot.market.genesisHash,owner:operation.owner,signer:operation.owner,
   pool:operation.pool,marginBank:snapshot.market.marginBank,stopRegistry:operation.draft.registry},
   intent:{operationId:operation.id,idempotencyKey:operation.idempotencyKey,draftFingerprint:operation.draft.fingerprint,
    draftRevision:operation.draft.revision,txHash:operation.txHash!,hashProvenance:'original'},
   transaction:{hash:operation.txHash!,chainId:50383,from:operation.owner,to:operation.draft.registry,input:'0x',value:operation.draft.deposit,blockNumber:'100',blockHash:block.hash},
   receipt:{transactionHash:operation.txHash!,from:operation.owner,to:operation.draft.registry,status:'success',block,canonicalBlockHash:block.hash,logs:[]},
   event:{name:'PendingOrderCreated',address:operation.draft.registry,orderId:'1',logIndex:0},
   nativeReadback:{status:'known',value:snapshot.stops[0]!,block,consistency:'pinned',error:null},snapshot,reconciledAt:at};
 }
 function records(path:string){
  const db=new DatabaseSync(path);
  try{return {operations:db.prepare('SELECT * FROM operations ORDER BY rowid').all(),events:db.prepare('SELECT * FROM events ORDER BY rowid').all()};}
  finally{db.close();}
 }
 it('persists Operation.evidence and immutable state-bound proof events across restart',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dreamshield-proof-'));const path=join(dir,'proof.sqlite');let j=new Journal(path);
  try{
   const operation=submitted(j,'durable-proof');j.transition(operation.id,'Reconcile');
   const uncertain=proof(operation);uncertain.nativeReadback={status:'unknown',value:null,block:null,consistency:'unavailable',error:'OFFLINE_UNCERTAIN_READBACK'};
   j.transition(operation.id,'Unknown',undefined,'OFFLINE_UNCERTAIN_READBACK',{evidence:uncertain});
   j.transition(operation.id,'Reconcile');const evidence=proof(operation);
   const applied=j.transition(operation.id,'Applied',undefined,'OFFLINE_READBACK',{readBackVerified:true,evidence});
   expect(applied.evidence).toEqual(evidence);expect(j.get(operation.id)?.evidence).toEqual(evidence);
   const events=records(path).events;expect(events).toHaveLength(2);
   expect(j.recordEvent(String(events[1]!.id),{kind:'forged-replacement',proof:uncertain})).toBe(false);
   expect(records(path).events).toEqual(events);
   const persisted=JSON.parse(JSON.stringify(evidence)) as OperationEvidenceProof;
   evidence.snapshot.position!.signedSize='0';
   expect(j.get(operation.id)?.evidence).toEqual(persisted);
   j.close();j=new Journal(path);
   expect(j.recover()).toBe(0);expect(j.get(operation.id)?.evidence).toEqual(persisted);
   expect(j.evidenceOperations(d.owner,d.pool)[0]?.proof).toEqual(persisted);
   expect(records(path).events).toEqual(events);
  }finally{j.close();rmSync(dir,{recursive:true});}
 });
 it.each(['cyclic-proof','operation-serialization'] as const)('rolls back operation and proof event on %s failure',failure=>{
  const dir=mkdtempSync(join(tmpdir(),'dreamshield-proof-rollback-'));const path=join(dir,'proof.sqlite');const j=new Journal(path);
  try{
   const operation=submitted(j,'proof-rollback');const pending=j.transition(operation.id,'Reconcile');
   const before=records(path);const evidence=proof(operation);let serializations=0;
   const bad=failure==='cyclic-proof'?Object.assign({...evidence},{self:null as unknown}):Object.assign({...evidence},{toJSON(){
    serializations++;if(serializations>1)throw new Error('OFFLINE_OPERATION_SERIALIZATION_FAILURE');return evidence;
   }});
   if('self' in bad)bad.self=bad;
   expect(()=>j.transition(operation.id,'Applied',undefined,undefined,{readBackVerified:true,evidence:bad})).toThrow();
   expect(j.get(operation.id)).toEqual(pending);expect(j.get(operation.id)?.evidence).toBeUndefined();
   expect(records(path)).toEqual(before);expect(()=>j.reserve(d,'still-locked')).toThrow('IN_FLIGHT');
   expect(j.transition(operation.id,'Applied',undefined,undefined,{readBackVerified:true,evidence}).evidence).toEqual(evidence);
   expect(records(path).events).toHaveLength(1);
  }finally{j.close();rmSync(dir,{recursive:true});}
 });
});

describe('durable scoped observation cursor',()=>{
 it('retains the newer opening as current when an older capture completes late',()=>{
  const j=new Journal(':memory:');
  try{
   const snapshot=fixture('unprotected',Date.parse('2026-10-27T12:00:00.000Z'));
   const opening:EvidenceObservation={id:'opening-a',lifecycleId:'lifecycle-a',kind:'opening',snapshot,
    identity:{chainId:50383,genesisHash:`0x${'c'.repeat(64)}`,owner:snapshot.position!.owner,signer:snapshot.position!.owner,
     pool:snapshot.market!.pool,marginBank:snapshot.market!.marginBank,stopRegistry:snapshot.market!.stopRegistry},
    provenance:{source:{commit:'0'.repeat(40),verifier:'offline-cursor-test'},versions:{node:process.version,sdk:'0.32.1',viem:'2.57.11'},
     lockSha256:'0'.repeat(64),mode:'live-owner',capturedAt:snapshot.capturedAt}};
   const newer={...opening,id:'opening-b',lifecycleId:'lifecycle-b'};
   const delayed={...opening,id:'delayed-missing-a',kind:'missing-sl' as const};
   j.recordObservation(opening);j.recordObservation(newer);j.recordObservation(delayed);
   const {owner,pool}=opening.identity;
   expect(j.currentLifecycle(owner,pool)).toBe('lifecycle-b');
   expect(j.observations(owner,pool,'lifecycle-a')).toEqual([opening,delayed]);
   expect(j.observations(owner,pool,'lifecycle-b')).toEqual([newer]);
   const before=j.observations(owner,pool);
   for(const duplicate of [{...opening,id:'duplicate-opening-a'},{...delayed,id:'duplicate-missing-a'}]){
    expect(()=>j.recordObservation(duplicate)).toThrow('ALREADY_CAPTURED');
   }
   expect(j.observations(owner,pool)).toEqual(before);expect(j.currentLifecycle(owner,pool)).toBe('lifecycle-b');
  }finally{j.close();}
 });
});
