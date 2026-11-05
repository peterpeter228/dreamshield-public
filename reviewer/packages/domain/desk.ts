import { assessProtection, isInFlight } from './index.js';
import {assessStopRisk} from './stop-risk.js';
import type { Assessment, Operation, Snapshot } from './types.js';
/** Historical chain configuration is not a current green verdict while a local outcome is unresolved. */
export function assessDesk(snapshot:Snapshot,operations:readonly Operation[],now=Date.now()):Assessment {
 const risk=assessStopRisk(snapshot),base={...assessProtection(snapshot,now),...(risk?{stopRisk:risk}:{})};
 if(base.verdict==='UNKNOWN'||!snapshot.position||!snapshot.market)return base;
 const matching=operations.filter(op=>isInFlight(op.state)&&op.owner.toLowerCase()===snapshot.position!.owner.toLowerCase()&&op.pool.toLowerCase()===snapshot.market!.pool.toLowerCase());
 if(!matching.length){
  if(base.verdict==='VERIFIED'&&risk?.quality==='EXTREME_DISTANCE')return {...base,verdict:'NEEDS_REVIEW',reasonCodes:['STOP_DISTANCE_EXTREME',...base.reasonCodes],summary:'A native stop exists, but its trigger sits far from mark. It does not bound loss in a realistic move. Treat the position as unprotected.',coverageMode:'unknown',coveredRaw:null};
  return base;
 }
 const verdict=matching.some(op=>op.state==='Unknown')?'UNKNOWN':matching.some(op=>op.state==='NeedsReview')?'NEEDS_REVIEW':'PENDING';
 return {...base,verdict,reasonCodes:['OPERATION_UNRESOLVED',...base.reasonCodes],summary:'A local operation is unresolved. Reconcile its original transaction before relying on protection or sending again. The displayed stops are observations, not a confirmed outcome.',coverageMode:'unknown',coveredRaw:null};
}
