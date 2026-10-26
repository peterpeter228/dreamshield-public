import {describe,it,expect,vi,afterAll} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../../fixtures/scenarios.js';
import {createCancelDraft} from '../../packages/domain/index.js';
import {Journal} from '../../packages/storage/index.js';
import type {Operation} from '../../packages/domain/types.js';
vi.mock('../../packages/protocol/index.js',()=>({
 readLiveSnapshot:vi.fn(async()=>{const s=fixture('protected');return {...s,mode:'live-owner',position:{...s.position!,source:'chain'}};}),
 reconcileOperation:vi.fn(async(op:Operation)=>({state:'Unknown',reason:op.txHash?'OFFLINE_TEST_UNVERIFIED_HASH':'TRANSACTION_HASH_MISSING',snapshot:null})),
}));
import {createApp} from '../../apps/server/app.js';
import {reconcileOperation} from '../../packages/protocol/index.js';
const dir=mkdtempSync(join(tmpdir(),'dreamshield-owner-api-'));
const snapshot=fixture('protected');const draft=createCancelDraft(snapshot,snapshot.stops[0]!.id);
const seed=new Journal(join(dir,'dreamshield.sqlite'));const original=seed.reserve(draft,'original');seed.transition(original.id,'AwaitingSignature');seed.close();
const instance=createApp({mode:'live-owner',ownerEnabled:true,host:'127.0.0.1',port:3000,dataDir:dir,owner:draft.owner,pool:draft.pool});
const server=instance.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();if(!address||typeof address==='string')throw Error('Missing address');const url=`http://127.0.0.1:${address.port}`;
const conf=await(await fetch(url+'/api/config')).json();
const hash='0x'+'a'.repeat(64);
const post=(path:string,body:unknown,token=conf.csrfToken)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',origin:url,'x-dreamshield-token':token},body:JSON.stringify(body)});
afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));instance.close();rmSync(dir,{recursive:true});});
describe('local owner recovery HTTP boundary (offline protocol mock)',()=>{
 it('suppresses green on desk and evidence with recovered Unknown cancellation',async()=>{
  const desk=await(await fetch(url+'/api/desk')).json();expect(desk.operations[0].state).toBe('Unknown');expect(desk.assessment.verdict).toBe('UNKNOWN');expect(desk.assessment.reasonCodes).toContain('OPERATION_UNRESOLVED');
  const evidence=await(await fetch(url+'/api/evidence')).json();expect(evidence.assessment.verdict).toBe('UNKNOWN');
 });
 it('requires CSRF, exact configured owner and pool, existing operation and valid hash',async()=>{
  const path=`/api/operations/${original.id}/recover-hash`;const body={owner:draft.owner,pool:draft.pool,txHash:hash};
  expect((await post(path,body,'wrong')).status).toBe(403);
  expect((await post(path,{...body,owner:'0x'+'9'.repeat(40)})).status).toBe(409);
  expect((await post(path,{...body,pool:'0x'+'9'.repeat(40)})).status).toBe(409);
  expect((await post(path,{...body,txHash:'bad'})).status).toBe(409);
  expect((await post('/api/operations/missing/recover-hash',body)).status).toBe(409);
 });
 it('persists a recovered hash without declaring success, and reconciles only the original operation',async()=>{
  const path=`/api/operations/${original.id}/recover-hash`;const body={owner:draft.owner,pool:draft.pool,txHash:hash};
  const response=await post(path,body);expect(response.status).toBe(200);const {operation}=await response.json();expect(operation.state).toBe('Unknown');expect(operation.id).toBe(original.id);expect(operation.txHash).toBe(hash);expect(operation.hashProvenance).toBe('recovered');
  expect((await post(`/api/operations/${original.id}/state`,{state:'Cancelled'})).status).toBe(409);
  expect((await post(`/api/operations/${original.id}/state`,{state:'Failed'})).status).toBe(403);
  expect((await post(path,body)).status).toBe(200);
  expect((await post(path,{...body,txHash:'0x'+'b'.repeat(64)})).status).toBe(409);
  const result=await(await post(`/api/operations/${original.id}/reconcile`,{})).json();expect(result.operation.state).toBe('Unknown');expect(result.operation.txHash).toBe(hash);expect(result.operation.error).toBe('OFFLINE_TEST_UNVERIFIED_HASH');
  expect(vi.mocked(reconcileOperation).mock.calls.at(-1)?.[0]).toMatchObject({id:original.id,txHash:hash,state:'Reconcile'});
  const inspect=new Journal(join(dir,'dreamshield.sqlite'));try{expect(inspect.get(original.id)?.txHash).toBe(hash);expect(()=>inspect.reserve(draft,'another')).toThrow('IN_FLIGHT');}finally{inspect.close();}
 });
});
