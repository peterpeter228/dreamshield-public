import {beforeEach,describe,it,expect,vi} from 'vitest';
import {encodeFunctionData,parseAbi} from 'viem';
import {createCancelDraft,transitionOperation} from '../../packages/domain/index.js';
import {Journal} from '../../packages/storage/index.js';
import {fixture} from '../../fixtures/scenarios.js';
import type {Operation} from '../../packages/domain/types.js';
const rpc=vi.hoisted(()=>({getChainId:vi.fn(),getTransactionReceipt:vi.fn(),getBlock:vi.fn(),getTransaction:vi.fn()}));
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createPublicClient:()=>rpc}));
import {reconcileOperation} from '../../packages/protocol/index.js';
const snapshot=fixture('protected');
const draft={...createCancelDraft(snapshot,snapshot.stops[0]!.id),observedBlock:'100',createdAt:'2026-10-25T00:00:00.000Z'};
const hash=('0x'+'a'.repeat(64)) as `0x${string}`;
const input=encodeFunctionData({abi:parseAbi(['function cancelPendingOrder(uint128 orderId)']),functionName:'cancelPendingOrder',args:[BigInt(draft.stopId!)]});
const op:Operation={id:'a',idempotencyKey:'a',owner:draft.owner,pool:draft.pool,state:'Reconcile',draft,txHash:hash,error:null,createdAt:draft.createdAt,updatedAt:draft.createdAt};
beforeEach(()=>{vi.resetAllMocks();rpc.getChainId.mockResolvedValue(50383);rpc.getBlock.mockResolvedValue({hash:'canonical',number:101n,timestamp:BigInt(Date.parse(draft.createdAt)/1000)});rpc.getTransactionReceipt.mockResolvedValue({transactionHash:hash,status:'reverted',from:op.owner,to:draft.registry,blockNumber:101n,blockHash:'canonical',logs:[]});rpc.getTransaction.mockResolvedValue({hash,from:op.owner,to:draft.registry,input,value:0n,blockNumber:101n,blockHash:'canonical'});});
describe('Argon hash-path regressions: offline only',()=>{
 it('rejects hash smuggling on Draft to AwaitingSignature',()=>{expect(()=>transitionOperation({...op,state:'Draft',txHash:null},'AwaitingSignature',{txHash:hash})).toThrow();});
 it('marks first Unknown hash recovered and retains owner lock',()=>{const j=new Journal(':memory:');try{const a=j.reserve(draft,'a');j.transition(a.id,'AwaitingSignature');expect(j.transition(a.id,'Unknown',hash).hashProvenance).toBe('recovered');j.transition(a.id,'Reconcile');expect(()=>j.transition(a.id,'Failed',undefined,'reverted',{receiptFailed:true})).toThrow('PROVENANCE');expect(()=>j.reserve(draft,'b')).toThrow('IN_FLIGHT');}finally{j.close();}});
 it('keeps normal Submitted hash provenance while moving to Unknown',()=>{const a=transitionOperation({...op,state:'AwaitingSignature',txHash:null},'Submitted',{txHash:hash});expect(transitionOperation(a,'Unknown',{txHash:hash}).hashProvenance).toBeUndefined();});
 it('does not fail/unlock an unrelated reverted call',async()=>{rpc.getTransaction.mockResolvedValue({...await rpc.getTransaction(),input:'0x1234'});expect((await reconcileOperation(op)).state).toBe('NeedsReview');});
 it('does not fail/unlock a call with wrong attached value',async()=>{rpc.getTransaction.mockResolvedValue({...await rpc.getTransaction(),value:1n});expect((await reconcileOperation(op)).state).toBe('NeedsReview');});
 it('does not fail/unlock a historical matching reverted call',async()=>{rpc.getTransactionReceipt.mockResolvedValue({...await rpc.getTransactionReceipt(),blockNumber:100n});expect((await reconcileOperation(op)).state).toBe('NeedsReview');});
 it('does not fail/unlock a matching call predating draft time',async()=>{rpc.getBlock.mockResolvedValue({...await rpc.getBlock(),timestamp:1n});expect((await reconcileOperation(op)).state).toBe('NeedsReview');});
 it('keeps legacy unanchored draft locked for review',async()=>{expect((await reconcileOperation({...op,draft:{...draft,observedBlock:undefined}})).state).toBe('NeedsReview');});
 it('does not fail/unlock a transaction and receipt block mismatch',async()=>{rpc.getTransaction.mockResolvedValue({...await rpc.getTransaction(),blockHash:'other'});expect((await reconcileOperation(op)).state).toBe('NeedsReview');});
 it('can resolve a scoped anchored exact ordinary reverted transaction',async()=>{expect((await reconcileOperation(op)).state).toBe('Failed');});
});

import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../apps/server/app.js';
describe('actual owner state HTTP route plus real reconciler with offline RPC',()=>{
 it.each(['Submitted','Unknown'] as const)('keeps wrong-call %s injection locked after reconciliation',async state=>{
  const dir=mkdtempSync(join(tmpdir(),'dreamshield-argon-api-'));const seed=new Journal(join(dir,'dreamshield.sqlite'));const saved=seed.reserve(draft,'original');seed.close();
  const app=createApp({mode:'live-owner',ownerEnabled:true,host:'127.0.0.1',port:3000,dataDir:dir,owner:draft.owner,pool:draft.pool});const server=app.app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Missing listener');const url=`http://127.0.0.1:${address.port}`;
  try{
   const config=await(await fetch(url+'/api/config')).json();const post=(path:string,body:unknown)=>fetch(url+path,{method:'POST',headers:{'content-type':'application/json',origin:url,'x-dreamshield-token':config.csrfToken},body:JSON.stringify(body)});
   expect((await post(`/api/operations/${saved.id}/state`,{state:'AwaitingSignature',txHash:hash})).status).toBe(409);
   expect((await post(`/api/operations/${saved.id}/state`,{state:'AwaitingSignature'})).status).toBe(200);
   expect((await post(`/api/operations/${saved.id}/state`,{state,txHash:hash})).status).toBe(200);
   rpc.getTransaction.mockResolvedValue({...await rpc.getTransaction(),input:'0x1234'});
   const response=await post(`/api/operations/${saved.id}/reconcile`,{});expect(response.status).toBe(200);const body=await response.json();expect(body.operation.state).toBe('NeedsReview');expect(body.operation.error).toBe(state==='Unknown'?'RECOVERED_HASH_ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED':'TRANSACTION_DRAFT_MISMATCH');
   const check=new Journal(join(dir,'dreamshield.sqlite'));try{expect(()=>check.reserve(draft,'another')).toThrow('IN_FLIGHT');}finally{check.close();}
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));app.close();rmSync(dir,{recursive:true});}
 });
});
