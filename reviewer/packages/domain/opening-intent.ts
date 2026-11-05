/** Pure assessment of supplied inputs ONLY. No chain reads, quote, simulation,
 * calldata, authorization or executable plan. A future trusted adapter must obtain
 * and verify every fact independently; passing this function is not such proof.
 * Deliberately separate from RepairDraft and all reduce-only protection logic.
 */
export interface OpeningIntent {
 chainId:50383;owner:string;pool:string;controller:string;side:'long'|'short';
 orderType:'LIMIT';quantityAtomic:string;limitPriceAtomic:string;
 maxNotionalQuoteAtomic:string;expireTimestampNs:string;
}
export interface OpeningBlock {number:string;hash:string;timestampMs:number;}
export interface OpeningInputFacts {
 scope:{chainId:50383;owner:string;pool:string;controller:string};
 block:OpeningBlock;canonical:OpeningBlock;
 evidence:Record<'account'|'market'|'position'|'orders'|'funding',{complete:boolean;block:OpeningBlock}>;
 accountSupported:boolean;controllerEoaOwner:boolean;unresolvedOperation:boolean;
 baseDecimals:number;tickSizeAtomic:string;lotSizeAtomic:string;minQuantityAtomic:string;
 /** Explicit local policy limits, not organizer rules or inferred safe sizing. */
 maxQuantityAtomic:string;maxNotionalQuoteAtomic:string;maxExpiryTimestampNs:string;
 signedPositionAtomic:string;openOrderCount:number;feedValid:boolean;
 funding:{autoPullModelled:boolean;ownWalletPullAtomic:string|null;mainWalletPullAtomic:string|null;
  lockAmountAtomic:string|null;feeHeadroomAtomic:string|null;unlockedCollateralAtomic:string|null;
  marginSufficient:boolean|null};
}
export interface OpeningIntentAssessment {
 status:'BLOCKED'|'INPUT_VALID_NOT_EXECUTABLE';basis:'SUPPLIED_INPUTS_ONLY';
 authorization:false;chainVerified:false;quoteVerified:false;simulationVerified:false;
 warning:string;reasons:string[];notionalQuoteAtomic:string|null;expiresAtMs:number|null;
}
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d*)$/.test(v)&&v.length<=78&&BigInt(v)<2n**256n;
const address=(v:unknown):v is string=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x0{40}$/i.test(v);
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const validBlock=(b:OpeningBlock)=>b&&uint(b.number)&&BigInt(b.number)>0n&&/^0x[0-9a-fA-F]{64}$/.test(b.hash)&&Number.isSafeInteger(b.timestampMs)&&b.timestampMs>=0;
const sameBlock=(a:OpeningBlock,b:OpeningBlock)=>validBlock(a)&&validBlock(b)&&a.number===b.number&&same(a.hash,b.hash)&&a.timestampMs===b.timestampMs;
export function assessOpeningIntentInputs(intent:OpeningIntent,facts:OpeningInputFacts,nowMs:number):OpeningIntentAssessment {
 const reasons:string[]=[];let notional:string|null=null,expires:number|null=null;
 const require=(ok:unknown,reason:string)=>{if(!ok)reasons.push(reason);};
 try {
  require(Number.isSafeInteger(nowMs)&&nowMs>=0,'INVALID_CLOCK');
  require(intent.chainId===50383&&facts.scope.chainId===50383,'CHAIN_MISMATCH');
  for(const key of ['owner','pool','controller'] as const)require(address(intent[key])&&address(facts.scope[key])&&same(intent[key],facts.scope[key]),`SCOPE_${key.toUpperCase()}_MISMATCH`);
  require(intent.side==='long'||intent.side==='short','EXPLICIT_SIDE_REQUIRED');
  require(intent.orderType==='LIMIT','LIMIT_ONLY');
  require(validBlock(facts.block)&&sameBlock(facts.block,facts.canonical),'CANONICAL_INPUT_MISMATCH');
  if(validBlock(facts.block)){
   expires=facts.block.timestampMs+15000;
   require(Number.isSafeInteger(expires)&&nowMs>=facts.block.timestampMs&&nowMs<expires,'STALE_OR_FUTURE_INPUT');
  }
  for(const key of ['account','market','position','orders','funding'] as const){
   const evidence=facts.evidence[key];require(evidence?.complete===true&&sameBlock(facts.block,evidence.block),`INCOMPLETE_OR_MIXED_${key.toUpperCase()}`);
  }
  require(facts.accountSupported===true&&facts.controllerEoaOwner===true,'ACCOUNT_INPUT_UNSUPPORTED');
  require(facts.unresolvedOperation===false,'UNRESOLVED_OPERATION');
  require(facts.signedPositionAtomic==='0','EXISTING_OR_UNKNOWN_POSITION');
  require(facts.openOrderCount===0,'EXISTING_OR_UNKNOWN_ORDERS');
  require(facts.feedValid===true,'FEED_UNKNOWN_OR_INVALID');
  const values=[intent.quantityAtomic,intent.limitPriceAtomic,intent.maxNotionalQuoteAtomic,intent.expireTimestampNs,facts.tickSizeAtomic,facts.lotSizeAtomic,facts.minQuantityAtomic,facts.maxQuantityAtomic,facts.maxNotionalQuoteAtomic,facts.maxExpiryTimestampNs];
  require(values.every(v=>uint(v)&&BigInt(v)>0n),'INVALID_POSITIVE_ATOMIC_INPUT');
  require(Number.isInteger(facts.baseDecimals)&&facts.baseDecimals>=0&&facts.baseDecimals<=77,'INVALID_BASE_DECIMALS');
  if(values.every(v=>uint(v)&&BigInt(v)>0n)&&Number.isInteger(facts.baseDecimals)&&facts.baseDecimals>=0&&facts.baseDecimals<=77){
   const quantity=BigInt(intent.quantityAtomic),price=BigInt(intent.limitPriceAtomic),scale=10n**BigInt(facts.baseDecimals);
   require(price%BigInt(facts.tickSizeAtomic)===0n,'PRICE_OFF_TICK');
   require(quantity%BigInt(facts.lotSizeAtomic)===0n,'QUANTITY_OFF_LOT');
   require(quantity>=BigInt(facts.minQuantityAtomic)&&quantity<=BigInt(facts.maxQuantityAtomic),'QUANTITY_OUTSIDE_LIMITS');
   const ceiling=(quantity*price+scale-1n)/scale;notional=ceiling.toString();
   require(ceiling<=BigInt(intent.maxNotionalQuoteAtomic)&&ceiling<=BigInt(facts.maxNotionalQuoteAtomic),'NOTIONAL_CAP_EXCEEDED');
   require(BigInt(intent.maxNotionalQuoteAtomic)<=BigInt(facts.maxNotionalQuoteAtomic),'USER_CAP_EXCEEDS_CONTEXT_CAP');
   require(Number.isSafeInteger(nowMs)&&BigInt(intent.expireTimestampNs)>BigInt(nowMs)*1000000n&&BigInt(intent.expireTimestampNs)<=BigInt(facts.maxExpiryTimestampNs),'ORDER_EXPIRY_OUTSIDE_LIMITS');
   const orderExpiryMs=BigInt(intent.expireTimestampNs)/1000000n;
   if(expires!==null&&Number.isSafeInteger(expires)&&orderExpiryMs<BigInt(expires))expires=Number(orderExpiryMs);
   require(expires!==null&&nowMs<expires,'ASSESSMENT_WINDOW_EXPIRED');
  }
  const f=facts.funding;
  require(f.autoPullModelled===true,'AUTO_PULL_UNMODELLED');
  require(uint(f.ownWalletPullAtomic)&&uint(f.mainWalletPullAtomic),'WALLET_PULL_UNKNOWN');
  // Conservative input-only scope: no implicit Safe or linked-main top-up.
  require(f.ownWalletPullAtomic==='0'&&f.mainWalletPullAtomic==='0','WALLET_PULL_NOT_IN_SCOPE');
  require(f.marginSufficient===true,'MARGIN_UNKNOWN_OR_INSUFFICIENT');
  const fundingValues=[f.lockAmountAtomic,f.feeHeadroomAtomic,f.unlockedCollateralAtomic];
  require(fundingValues.every(uint),'FUNDING_AMOUNT_UNKNOWN');
  if(fundingValues.every(uint))require(BigInt(f.unlockedCollateralAtomic!)>=BigInt(f.lockAmountAtomic!)+BigInt(f.feeHeadroomAtomic!),'IN_BANK_FUNDING_INSUFFICIENT');
 } catch {reasons.push('MALFORMED_INPUT');}
 return {status:reasons.length?'BLOCKED':'INPUT_VALID_NOT_EXECUTABLE',basis:'SUPPLIED_INPUTS_ONLY',authorization:false,chainVerified:false,quoteVerified:false,simulationVerified:false,warning:'Supplied-input assessment only. No live verification, authorization, quote, simulation or execution readiness. Zero modelled wallet pull at a supplied block does not prohibit future runtime auto-pull.',reasons:[...new Set(reasons)],notionalQuoteAtomic:notional,expiresAtMs:expires};
}
