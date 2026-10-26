import {describe,it,expect,vi} from 'vitest';
import type {Operation} from '../../packages/domain/types.js';
const rpc=vi.hoisted(()=>({getChainId:vi.fn(),getTransactionReceipt:vi.fn(),getBlock:vi.fn(),getTransaction:vi.fn()}));
vi.mock('viem',async importOriginal=>({...await importOriginal<typeof import('viem')>(),createPublicClient:()=>rpc}));
import {reconcileOperation,expectedDraftCall} from '../../packages/protocol/index.js';
import {createCancelDraft} from '../../packages/domain/index.js';
import {fixture} from '../../fixtures/scenarios.js';
const snapshot=fixture('protected');const draft=createCancelDraft(snapshot,snapshot.stops[0]!.id);
const op:Operation={id:'original',idempotencyKey:'original',owner:draft.owner,pool:draft.pool,state:'Reconcile',draft,txHash:'0x'+'a'.repeat(64),hashProvenance:'recovered',error:null,createdAt:draft.createdAt,updatedAt:draft.createdAt};
describe('recovered transaction provenance (offline RPC mock)',()=>{
 it.each(['reverted','success'])('does not release recovered uncertainty for canonical %s receipt',async status=>{
  rpc.getChainId.mockResolvedValue(50383);
  rpc.getTransactionReceipt.mockResolvedValue({status,from:op.owner,to:draft.registry,blockNumber:100n,blockHash:'canonical',logs:[]});
  rpc.getBlock.mockResolvedValue({hash:'canonical'});
  const result=await reconcileOperation(op);
  expect(result).toMatchObject({state:'NeedsReview',reason:'RECOVERED_HASH_ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED'});
 });
 it('retains existing known-hash reverted receipt behavior',async()=>{
  rpc.getChainId.mockResolvedValue(50383);
  rpc.getTransactionReceipt.mockResolvedValue({status:'reverted',from:op.owner,to:draft.registry,blockNumber:100n,blockHash:'canonical',logs:[]});
  rpc.getBlock.mockResolvedValue({hash:'canonical',timestamp:BigInt(Math.ceil(Date.parse(draft.createdAt)/1000))});
  rpc.getTransaction.mockResolvedValue({hash:op.txHash,from:op.owner,to:draft.registry,blockNumber:100n,blockHash:'canonical',input:expectedDraftCall(draft).data,value:0n});
  expect((await reconcileOperation({...op,draft:{...draft,observedBlock:'99'},hashProvenance:undefined})).state).toBe('Failed');
 });
});
