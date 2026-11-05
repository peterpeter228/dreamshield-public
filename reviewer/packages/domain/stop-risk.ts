import type {Snapshot} from './types.js';
/** DreamShield display policy, not a protocol or organizer limit. */
export const MAX_SL_DISTANCE_BPS=2000n;
export interface StopRisk {
 stopId:string|null;triggerPrice:string|null;operator:0|1|null;mark:string;distanceBps:string|null;
 quantity:string|null;quantityMode:'fixed'|'whole-at-trigger'|null;
 quality:'SENSIBLE'|'EXTREME_DISTANCE'|'TRIGGER_MET'|'UNASSESSED';note:string;
}
const atomic=/^(0|[1-9]\d*)$/,signed=/^-?(0|[1-9]\d*)$/,address=/^0x[0-9a-fA-F]{40}$/;
const same=(a:string,b:string)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
/** Known-order price observation only. Never establishes discovery or covered exposure. */
export function assessStopRisk(s:Snapshot):StopRisk|null {
 const m=s.market,p=s.position;if(!m||!p)return null;
 const unknown=(note:string):StopRisk=>({stopId:null,triggerPrice:null,operator:null,mark:m.mark,distanceBps:null,quantity:null,quantityMode:null,quality:'UNASSESSED',note});
 if(!signed.test(p.signedSize))return unknown('Position size is unusable.');
 const size=BigInt(p.signedSize);if(size===0n)return null;
 const long=size>0n,candidates=s.stops.filter(n=>n.status==='pending'&&n.intent==='reduceOnly'&&n.isBid===!long&&n.triggerOperator===(long?1:0));
 if(!candidates.length)return null;
 if(candidates.length!==1)return unknown('Multiple known SL candidates; no order selected.');
 const n=candidates[0]!;
 if(m.chainId!==50383||p.chainId!==m.chainId||![m.pool,m.stopRegistry,p.owner,p.pool].every(a=>address.test(a))||!same(p.pool,m.pool)||!same(n.owner,p.owner)||!same(n.pool,m.pool)||!same(n.registry,m.stopRegistry)||!atomic.test(m.observedBlock)||p.observedBlock!==m.observedBlock||n.observedBlock!==m.observedBlock||!m.feedValid||!atomic.test(m.mark)||BigInt(m.mark)<=0n||!atomic.test(m.tickSize)||BigInt(m.tickSize)<=0n||!atomic.test(n.id)||!atomic.test(n.quantity)||!atomic.test(n.triggerPrice)||BigInt(n.triggerPrice)<=0n||BigInt(n.triggerPrice)%BigInt(m.tickSize)!==0n)return unknown('Known order, mark or pinned identity is unusable.');
 const mark=BigInt(m.mark),trigger=BigInt(n.triggerPrice),difference=mark>trigger?mark-trigger:trigger-mark;
 const distance=difference*10000n/mark,met=long?mark<=trigger:mark>=trigger;
 const quality=met?'TRIGGER_MET':distance>MAX_SL_DISTANCE_BPS?'EXTREME_DISTANCE':'SENSIBLE';
 return {stopId:n.id,triggerPrice:n.triggerPrice,operator:n.triggerOperator,mark:m.mark,distanceBps:distance.toString(),quantity:n.quantity,quantityMode:n.quantity==='0'?'whole-at-trigger':'fixed',quality,note:quality==='EXTREME_DISTANCE'?'Trigger sits far from mark and does not bound loss in a realistic move; coverage remains separately assessed.':quality==='TRIGGER_MET'?'Trigger condition already met; reconcile execution.':'Known trigger distance is within the local display policy; execution is not assured.'};
}
