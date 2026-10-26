import { describe,it,expect } from 'vitest';
import { discoverStops,readLiveSnapshot,reconcileOperation,stopParams,NETWORK } from '../../packages/protocol/index.ts';
import type { PerpStopOrder } from '@somnia-chain/markets-sdk';
import type { Operation,RepairDraft } from '../../packages/domain/types.ts';
const draft:RepairDraft={revision:1,fingerprint:'test',owner:'0x1111111111111111111111111111111111111111',pool:'0x2222222222222222222222222222222222222222',registry:'0x3333333333333333333333333333333333333333',chainId:50383,action:'create-sl',stopId:null,isBid:false,triggerOperator:1,triggerPrice:'100',quantity:'0',intent:'reduceOnly',deposit:'150000000000000000',createdAt:new Date().toISOString()};
// Only row identity is used by the pagination algorithm; no contract behavior is mocked as live evidence.
const row=(id:string)=>({id} as PerpStopOrder);
describe('protocol fail-closed boundaries',()=>{
 it('unconfigured pool is not empty verified',async()=>{const s=await readLiveSnapshot({owner:null,pool:null});expect(s.complete).toBe(false);expect(s.position).toBeNull();expect(s.readError).toBe('POOL_NOT_CONFIGURED');});
 it('malformed owner fails before touching network',async()=>{const s=await readLiveSnapshot({owner:'bad',pool:draft.pool});expect(s.complete).toBe(false);expect(s.readError).toContain('INVALID_ADDRESS');});
 it('discovers paginated rows and terminates only on short page',async()=>{const offsets:number[]=[];const rows=await discoverStops(async o=>{offsets.push(o);return o===0?[row('a'),row('b')]:[row('c')];},3,2);expect(offsets).toEqual([0,2]);expect(rows).toHaveLength(3);});
 it('full last page is incomplete not empty',async()=>{await expect(discoverStops(async()=>[row('x')],1,1)).rejects.toThrow('PAGE_CAP');});
 it('duplicate page detects unstable pagination',async()=>{await expect(discoverStops(async()=>[row('x')],3,1)).rejects.toThrow('UNSTABLE');});
 it('discovery errors propagate',async()=>{await expect(discoverStops(async()=>{throw Error('indexer unavailable');})).rejects.toThrow('indexer unavailable');});
 it('whole-at-trigger remains zero and explicit reduceOnly',()=>{const p=stopParams(draft);expect(p.quantity).toBe(0n);expect(p.intent).toBe('reduceOnly');expect(p.limitPrice).toBe(0n);expect(p.stopOrderType).toBe(1);expect(p.skipOperatorApproval).toBeUndefined();expect(p.operatorRegistry).toBe(NETWORK.operatorRegistry);});
 it('rejects wrong chain and negative raw quantity',()=>{expect(()=>stopParams({...draft,chainId:50312})).toThrow('UNSUPPORTED');expect(()=>stopParams({...draft,quantity:'-1'})).toThrow('RAW_AMOUNT');});
 it('unknown transaction cannot be marked failed or automatically resent',async()=>{const op={txHash:null} as Operation;expect((await reconcileOperation(op)).state).toBe('Unknown');});
});
