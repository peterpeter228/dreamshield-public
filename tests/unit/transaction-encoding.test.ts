import {describe,it,expect} from 'vitest';
import {buildPlacePerpStopOrder,buildCancelPerpStopOrder} from '../../node_modules/@somnia-chain/markets-sdk/dist/perp/stops.js';
import type {Writer} from '../../node_modules/@somnia-chain/markets-sdk/dist/writer.js';
import {expectedDraftCall,stopParams} from '../../packages/protocol/index.js';
import {createSlDraft,createCancelDraft} from '../../packages/domain/index.js';
import {fixture} from '../../fixtures/scenarios.js';
// Pinned SDK build-only internals: throw on accidental network or signing access.
const forbidden=new Proxy({}, {get(){throw new Error('OFFLINE_ONLY_NO_RPC_OR_WALLET');}});
const writer=(owner:string)=>({chain:{id:50383},fromAddress:owner,publicClient:forbidden,walletClient:forbidden}) as unknown as Writer;
describe('exact expected calldata matches pinned SDK build-only output',()=>{
 it.each(['unprotected','short'])('matches native %s whole-position SL including zero builder defaults',async scenario=>{const snapshot=fixture(scenario);const d=createSlDraft(snapshot,scenario==='short'?'3100':'2900');const sdk=await buildPlacePerpStopOrder(writer(d.owner),{...stopParams(d),skipOperatorApproval:true});expect(expectedDraftCall(d)).toEqual({data:sdk.stopOrder.data,value:sdk.stopOrder.value});});
 it('matches native cancel calldata and zero value',()=>{const snapshot=fixture('protected');const d=createCancelDraft(snapshot,snapshot.stops[0]!.id);const sdk=buildCancelPerpStopOrder(writer(d.owner),{registry:d.registry as `0x${string}`,orderId:BigInt(d.stopId!)});expect(expectedDraftCall(d)).toEqual({data:sdk.data,value:sdk.value??0n});});
});
