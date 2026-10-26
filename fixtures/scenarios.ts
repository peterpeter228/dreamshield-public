import type { Snapshot, NativeStopSnapshot } from '../packages/domain/types.js';
export const SCENARIOS=['unprotected','protected','partial','short','stale','oco-broken','no-position','unknown','tp-only','wrong-side-sl','trigger-met','residual-stops'] as const;
export function fixture(scenario:string='unprotected',now=Date.now()):Snapshot {
 const owner='0x1111111111111111111111111111111111111111';const pool='0x2222222222222222222222222222222222222222';const registry='0x3333333333333333333333333333333333333333';const at=new Date(scenario==='stale'?now-60000:now).toISOString();
 const stop:NativeStopSnapshot={id:'1',owner,pool,registry,intent:'reduceOnly',isBid:false,quantity:'0',triggerPrice:'2800000000000000000000',triggerOperator:1,stopOrderType:1,limitPrice:'0',status:'pending',siblingId:null,observedBlock:'100'};
 const stops=['protected','partial','oco-broken'].includes(scenario)?[{...stop,quantity:scenario==='partial'?'500000':'0',siblingId:scenario==='oco-broken'?'2':null}]:[];
 if(scenario==='tp-only')stops.push({...stop,triggerOperator:0,triggerPrice:'3200000000000000000000'});
 if(scenario==='wrong-side-sl')stops.push({...stop,isBid:true,triggerOperator:0,triggerPrice:'3200000000000000000000'});
 if(scenario==='trigger-met')stops.push({...stop,triggerPrice:'3000000000000000000000'});
 if(scenario==='residual-stops')stops.push({...stop});
 return {mode:'replay',market:{chainId:50383,pool,marginBank:'0x4444444444444444444444444444444444444444',stopRegistry:registry,symbol:'ETH / USDso',baseDecimals:6,quoteDecimals:18,tickSize:'1000000000000000000',lotSize:'1000',minQuantity:'1000',mark:'3000000000000000000000',feedValid:true,observedBlock:'100',blockHash:null,observedAt:at,stopDeposit:'150000000000000000'},position:{chainId:50383,owner,pool,signedSize:scenario==='no-position'||scenario==='residual-stops'?'0':scenario==='short'?'-1000000':'1000000',entryPrice:'2900000000000000000000',observedBlock:'100',observedAt:at,source:'fixture'},stops,scope:scenario==='unknown'?'unavailable':'indexedSnapshot',readError:scenario==='unknown'?'Simulated RPC timeout. No live request was sent.':null,capturedAt:at,complete:scenario!=='unknown'};
}
