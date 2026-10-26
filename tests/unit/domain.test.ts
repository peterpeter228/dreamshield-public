import { describe, it, expect } from 'vitest';
import { assessProtection, parseAtomic, formatAtomic, floorGrid, ceilGrid, createSlDraft, createCancelDraft, validateDraft, fingerprintSnapshot, canTransition, transitionOperation, isInFlight } from '../../packages/domain/index.js';
import type { Snapshot, NativeStopSnapshot, Operation } from '../../packages/domain/types.js';
import { SCENARIOS, fixture as replayFixture } from '../../fixtures/scenarios.js';
const now=Date.parse('2026-10-24T22:00:00Z');
const a=(digit:string)=>`0x${digit.repeat(40)}`;
function fixture():Snapshot { return {mode:'replay', scope:'indexedSnapshot', complete:true, readError:null, capturedAt:new Date(now).toISOString(), market:{chainId:50383,pool:a('1'),marginBank:a('2'),stopRegistry:a('3'),symbol:'ETH/USDT',baseDecimals:4,quoteDecimals:2,tickSize:'5',lotSize:'10',minQuantity:'100',mark:'200000',feedValid:true,observedBlock:'100',blockHash:null,observedAt:new Date(now).toISOString(),stopDeposit:'1000000'},position:{chainId:50383,owner:a('4'),pool:a('1'),signedSize:'15000',entryPrice:'190000',observedBlock:'100',observedAt:new Date(now).toISOString(),source:'fixture'},stops:[]}; }
function sl(overrides:Partial<NativeStopSnapshot>={}):NativeStopSnapshot {return {id:'1',owner:a('4'),pool:a('1'),registry:a('3'),intent:'reduceOnly',isBid:false,quantity:'0',triggerPrice:'195000',triggerOperator:1,stopOrderType:1,limitPrice:'0',status:'pending',siblingId:null,observedBlock:'100',...overrides};}
function protectedSnapshot():Snapshot {const s=fixture();s.stops=[sl()];return s;}
describe('exact decimal math',()=>{
 it('round trips very large amounts without Number coercion',()=>{const raw=parseAtomic('900719925474099312345.123456789012345678',18);expect(formatAtomic(raw,18)).toBe('900719925474099312345.123456789012345678');});
 it('formats zero, negative and integer amounts',()=>{expect(formatAtomic(0n,18)).toBe('0');expect(formatAtomic(-12340n,3)).toBe('-12.34');expect(formatAtomic(100n,0)).toBe('100');expect(parseAtomic('-0.001',3)).toBe(-1n);});
 it.each(['1e3','NaN',' 1','1 ','01','1.','+1','Infinity'])('rejects noncanonical %s',(v)=>expect(()=>parseAtomic(v,2)).toThrow());
 it('rejects excess precision instead of rounding',()=>expect(()=>parseAtomic('1.001',2)).toThrow('EXCESS_PRECISION'));
 it('grids exactly',()=>{expect(floorGrid(13n,5n)).toBe(10n);expect(ceilGrid(13n,5n)).toBe(15n);expect(()=>floorGrid(1n,0n)).toThrow();});
});
describe('protection assessment',()=>{
 it('only complete fresh empty reads establish a gap',()=>expect(assessProtection(fixture(),now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL'],coverageMode:'none',coveredRaw:'0',stopIds:[]}));
 it.each(['read','incomplete','scope','stale','wrong-chain','wrong-pool','feed','block','fixture-live'])('fails closed on %s',(kind)=>{const s=protectedSnapshot();if(kind==='read')s.readError='timeout';if(kind==='incomplete')s.complete=false;if(kind==='scope')s.scope='knownIdsOnly';if(kind==='stale')s.capturedAt=new Date(now-15000).toISOString();if(kind==='wrong-chain')s.market!.chainId=1;if(kind==='wrong-pool')s.position!.pool=a('5');if(kind==='feed')s.market!.feedValid=false;if(kind==='block')s.position!.observedBlock='99';if(kind==='fixture-live')s.mode='live-readonly';expect(assessProtection(s,now).verdict).toBe('UNKNOWN');});
 it('expires green at precisely fifteen seconds',()=>{const s=protectedSnapshot();expect(assessProtection(s,now+14999).verdict).toBe('VERIFIED');expect(assessProtection(s,now+15000).verdict).toBe('UNKNOWN');});
 it('rejects stop from wrong owner rather than ignoring it as absent',()=>{const s=fixture();s.stops=[sl({owner:a('5')})];expect(assessProtection(s,now).verdict).toBe('UNKNOWN');});
 it.each(['long','short'] as const)('distinguishes a closing-side %s take-profit from stop-loss',direction=>{
  const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';
  s.stops=[sl({isBid:!long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','TAKE_PROFIT_ONLY'],coverageMode:'none',coveredRaw:'0',stopIds:[]});
 });
 it.each(['long','short'] as const)('does not describe opening or wrong-side TP-like %s stops as protection diagnostics',direction=>{
  const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';
  for(const stop of [
   sl({intent:'opening',isBid:!long,triggerOperator:long?1:0,triggerPrice:long?'190000':'210000'}),
   sl({intent:'opening',isBid:!long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'}),
   sl({intent:'opening',isBid:long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'}),
   sl({isBid:long,triggerOperator:long?1:0,triggerPrice:long?'190000':'210000'})
  ]){s.stops=[stop];expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL'],coverageMode:'none',coveredRaw:'0',stopIds:[]});}
 });
 it('preserves whole-position zero sentinel even for dust exposure',()=>{const s=protectedSnapshot();s.position!.signedSize='1';const r=assessProtection(s,now);expect(r.verdict).toBe('VERIFIED');expect(r.coveredRaw).toBe('1');expect(r.coverageMode).toBe('whole-at-trigger');});
 it('requires review for partial fixed coverage and clamps oversized fixed',()=>{const s=protectedSnapshot();s.stops[0]!.quantity='10000';expect(assessProtection(s,now).verdict).toBe('NEEDS_REVIEW');s.stops[0]!.quantity='20000';expect(assessProtection(s,now).coveredRaw).toBe('15000');});
 it('never sums multiple fixed stops',()=>{const s=fixture();s.stops=[sl({quantity:'10000'}),sl({id:'2',quantity:'10000'})];expect(assessProtection(s,now).reasonCodes).toContain('MULTIPLE_SL_LAYOUT');});
 it.each(['long','short'] as const)('withdraws green for a met %s SL trigger including equality',direction=>{const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';s.stops=[sl({isBid:!long,triggerOperator:long?1:0,triggerPrice:'200000'})];expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_REVIEW',reasonCodes:['TRIGGER_CONDITION_MET'],coverageMode:'unknown',coveredRaw:null,stopIds:['1']});s.market!.mark=long?'195000':'205000';expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_REVIEW',reasonCodes:['TRIGGER_CONDITION_MET'],coverageMode:'unknown',coveredRaw:null,stopIds:['1']});});
 it('handles short position SL direction',()=>{const s=fixture();s.position!.signedSize='-15000';s.stops=[sl({isBid:true,triggerOperator:0,triggerPrice:'210000'})];expect(assessProtection(s,now)).toMatchObject({verdict:'VERIFIED',reasonCodes:['WHOLE_POSITION_AT_TRIGGER','SL_ONLY','EXECUTION_NOT_GUARANTEED'],coverageMode:'whole-at-trigger',coveredRaw:'15000',stopIds:['1']});});
 it('validates reciprocal OCO and detects missing or one-way sibling',()=>{const s=protectedSnapshot();s.stops[0]!.siblingId='2';expect(assessProtection(s,now).reasonCodes).toContain('OCO_LINK_INVALID');s.stops.push(sl({id:'2',triggerOperator:0,triggerPrice:'210000',siblingId:null}));expect(assessProtection(s,now).verdict).toBe('NEEDS_REVIEW');s.stops[1]!.siblingId='1';expect(assessProtection(s,now).reasonCodes).toContain('OCO_LINK_MATCHED');});
 it('reports residual stops on flat position without green',()=>{const s=protectedSnapshot();s.position!.signedSize='0';expect(assessProtection(s,now)).toMatchObject({verdict:'NO_POSITION',reasonCodes:['NO_POSITION','RESIDUAL_STOPS'],coverageMode:'none',coveredRaw:'0',stopIds:['1']});});
 it('unknown status and duplicate IDs are not absence',()=>{const s=protectedSnapshot();s.stops[0]!.status='unknown';expect(assessProtection(s,now).verdict).toBe('UNKNOWN');s.stops=[sl(),sl()];expect(assessProtection(s,now).reasonCodes).toContain('DUPLICATE_STOP_IDS');});
 it.each(['long','short'] as const)('identifies a wrong-side reduce-only SL-like stop for a %s position',direction=>{
  const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';
  s.stops=[sl({isBid:long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','WRONG_SIDE_SL'],coverageMode:'none',coveredRaw:'0',stopIds:[]});
 });
 it.each(['long','short'] as const)('keeps %s TP price classification exact at one atomic unit beyond Number precision',direction=>{
  const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';const mark=900719925474099300000n;const delta=long?1n:-1n;
  s.market!.mark=mark.toString();s.market!.tickSize='1';s.stops=[sl({isBid:!long,triggerOperator:long?0:1,triggerPrice:(mark+delta).toString()})];
  expect(assessProtection(s,now).reasonCodes).toEqual(['NO_MATCHING_SL','TAKE_PROFIT_ONLY']);
  s.stops[0]!.triggerPrice=mark.toString();expect(assessProtection(s,now).reasonCodes).toEqual(['NO_MATCHING_SL']);
  s.stops[0]!.triggerPrice=(mark-delta).toString();expect(assessProtection(s,now).reasonCodes).toEqual(['NO_MATCHING_SL']);
 });
 it.each(['filled','cancelled','dropped'] as const)('does not diagnose historical %s stops as current TP-only or wrong-side protection',status=>{
  const s=fixture();s.stops=[sl({status,triggerOperator:0,triggerPrice:'210000'}),sl({id:'2',status,isBid:true,triggerOperator:0,triggerPrice:'210000'})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL'],coverageMode:'none',coveredRaw:'0',stopIds:[]});
 });
 it.each(['long','short'] as const)('does not add missing-protection diagnostics beside a valid %s SL',direction=>{
  const long=direction==='long';const s=fixture();s.position!.signedSize=long?'15000':'-15000';
  s.stops=[sl({isBid:!long,triggerOperator:long?1:0,triggerPrice:long?'190000':'210000'}),sl({id:'2',isBid:!long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'}),sl({id:'3',isBid:long,triggerOperator:long?0:1,triggerPrice:long?'210000':'190000'})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'VERIFIED',reasonCodes:['WHOLE_POSITION_AT_TRIGGER','SL_ONLY','EXECUTION_NOT_GUARANTEED'],coverageMode:'whole-at-trigger',coveredRaw:'15000',stopIds:['1']});
  s.stops[0]!.quantity='10000';expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_REVIEW',reasonCodes:['PARTIAL_COVERAGE'],coverageMode:'fixed',coveredRaw:'10000',stopIds:['1']});
 });
 it.each([
  ['opening SL',{intent:'opening'},['NO_MATCHING_SL']],
  ['opening TP',{intent:'opening',triggerOperator:0,triggerPrice:'210000'},['NO_MATCHING_SL']],
  ['wrong-side TP-like stop',{isBid:true},['NO_MATCHING_SL']],
  ['wrong-side SL',{isBid:true,triggerOperator:0,triggerPrice:'210000'},['NO_MATCHING_SL','WRONG_SIDE_SL']],
  ['already-met TP-like stop',{triggerOperator:0,triggerPrice:'200000'},['NO_MATCHING_SL']]
 ] as const)('does not label a mixed pending %s layout as TP-only',(kind,overrides,reasonCodes)=>{
  const s=fixture();s.stops=[sl({triggerOperator:0,triggerPrice:'210000'}),sl({id:'2',...overrides})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes,coverageMode:'none',coveredRaw:'0',stopIds:[]});
 });
 it('can diagnose multiple genuine TP stops while ignoring completed non-TP history',()=>{
  const s=fixture();s.stops=[sl({triggerOperator:0,triggerPrice:'210000'}),sl({id:'2',quantity:'10000',triggerOperator:0,triggerPrice:'220000'}),sl({id:'3',intent:'opening',status:'cancelled'})];
  expect(assessProtection(s,now)).toMatchObject({verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','TAKE_PROFIT_ONLY'],coverageMode:'none',coveredRaw:'0',stopIds:[]});
 });
});
describe('offline replay fixtures',()=>{
 it('retains all eight original scenario IDs and adds four distinct offline cases',()=>expect(SCENARIOS).toEqual(['unprotected','protected','partial','short','stale','oco-broken','no-position','unknown','tp-only','wrong-side-sl','trigger-met','residual-stops']));
 it.each([
  {scenario:'tp-only',signedSize:'1000000',isBid:false,triggerOperator:0,triggerPrice:'3200000000000000000000',assessment:{verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','TAKE_PROFIT_ONLY'],summary:'No matching native reduce-only stop-loss was found in this complete snapshot.',coverageMode:'none',coveredRaw:'0',stopIds:[]}},
  {scenario:'wrong-side-sl',signedSize:'1000000',isBid:true,triggerOperator:0,triggerPrice:'3200000000000000000000',assessment:{verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','WRONG_SIDE_SL'],summary:'No matching native reduce-only stop-loss was found in this complete snapshot.',coverageMode:'none',coveredRaw:'0',stopIds:[]}},
  {scenario:'trigger-met',signedSize:'1000000',isBid:false,triggerOperator:1,triggerPrice:'3000000000000000000000',assessment:{verdict:'NEEDS_REVIEW',reasonCodes:['TRIGGER_CONDITION_MET'],summary:'A stop condition is met. Execution and remaining exposure must be reconciled.',coverageMode:'unknown',coveredRaw:null,stopIds:['1']}},
  {scenario:'residual-stops',signedSize:'0',isBid:false,triggerOperator:1,triggerPrice:'2800000000000000000000',assessment:{verdict:'NO_POSITION',reasonCodes:['NO_POSITION','RESIDUAL_STOPS'],summary:'No current position. Pending stops remain and need review before reopening.',coverageMode:'none',coveredRaw:'0',stopIds:['1']}}
 ] as const)('$scenario has exact synthetic stop semantics and assessment',({scenario,signedSize,isBid,triggerOperator,triggerPrice,assessment})=>{
  const s=replayFixture(scenario,now);const at=new Date(now).toISOString();
  expect(s).toMatchObject({mode:'replay',scope:'indexedSnapshot',complete:true,readError:null,capturedAt:at,market:{chainId:50383,pool:a('2'),stopRegistry:a('3'),baseDecimals:6,quoteDecimals:18,tickSize:'1000000000000000000',mark:'3000000000000000000000',observedBlock:'100',observedAt:at},position:{chainId:50383,owner:a('1'),pool:a('2'),signedSize,entryPrice:'2900000000000000000000',observedBlock:'100',observedAt:at,source:'fixture'}});
  expect(s.stops).toEqual([{id:'1',owner:a('1'),pool:a('2'),registry:a('3'),intent:'reduceOnly',isBid,quantity:'0',triggerPrice,triggerOperator,stopOrderType:1,limitPrice:'0',status:'pending',siblingId:null,observedBlock:'100'}]);
  expect(BigInt(s.stops[0]!.triggerPrice)%BigInt(s.market!.tickSize)).toBe(0n);
  expect(assessProtection(s,now)).toEqual({...assessment,checkedAt:at,expiresAt:new Date(now+15000).toISOString(),scope:'indexedSnapshot'});
 });
 it.each([
  ['unprotected','1000000',null,'NEEDS_PROTECTION',['NO_MATCHING_SL'],'none','0',[]],
  ['protected','1000000',{quantity:'0',siblingId:null},'VERIFIED',['WHOLE_POSITION_AT_TRIGGER','SL_ONLY','EXECUTION_NOT_GUARANTEED'],'whole-at-trigger','1000000',['1']],
  ['partial','1000000',{quantity:'500000',siblingId:null},'NEEDS_REVIEW',['PARTIAL_COVERAGE'],'fixed','500000',['1']],
  ['short','-1000000',null,'NEEDS_PROTECTION',['NO_MATCHING_SL'],'none','0',[]],
  ['stale','1000000',null,'UNKNOWN',['STALE_DATA'],'unknown',null,[]],
  ['oco-broken','1000000',{quantity:'0',siblingId:'2'},'NEEDS_REVIEW',['OCO_LINK_INVALID'],'whole-at-trigger','1000000',['1']],
  ['no-position','0',null,'NO_POSITION',['NO_POSITION'],'none','0',[]],
  ['unknown','1000000',null,'UNKNOWN',['READ_FAILED'],'unknown',null,[]]
 ] as const)('preserves original %s fixture semantics', (scenario,signedSize,stop,verdict,reasonCodes,coverageMode,coveredRaw,stopIds)=>{
  const s=replayFixture(scenario,now);const at=new Date(scenario==='stale'?now-60000:now).toISOString();
  expect(s).toMatchObject({mode:'replay',capturedAt:at,scope:scenario==='unknown'?'unavailable':'indexedSnapshot',complete:scenario!=='unknown',readError:scenario==='unknown'?'Simulated RPC timeout. No live request was sent.':null,market:{mark:'3000000000000000000000',baseDecimals:6,quoteDecimals:18,observedAt:at},position:{signedSize,source:'fixture',observedAt:at}});
  expect(s.stops).toEqual(stop?[{id:'1',owner:a('1'),pool:a('2'),registry:a('3'),intent:'reduceOnly',isBid:false,triggerPrice:'2800000000000000000000',triggerOperator:1,stopOrderType:1,limitPrice:'0',status:'pending',observedBlock:'100',...stop}]:[]);
  expect(assessProtection(s,now)).toMatchObject({verdict,reasonCodes,coverageMode,coveredRaw,stopIds,checkedAt:new Date(now).toISOString(),expiresAt:new Date(Date.parse(at)+15000).toISOString(),scope:s.scope});
 });
 it.each(['tp-only','wrong-side-sl'] as const)('does not use %s diagnostics to weaken freshness or identity guards',scenario=>{
  const s=replayFixture(scenario,now);s.capturedAt=new Date(now-15000).toISOString();expect(assessProtection(s,now)).toMatchObject({verdict:'UNKNOWN',reasonCodes:['STALE_DATA'],coverageMode:'unknown',coveredRaw:null,stopIds:[]});
  s.capturedAt=new Date(now).toISOString();s.stops[0]!.owner=a('5');expect(assessProtection(s,now)).toMatchObject({verdict:'UNKNOWN',reasonCodes:['INVALID_STOP_DATA'],coverageMode:'unknown',coveredRaw:null,stopIds:[]});
 });
});
describe('repair drafts',()=>{
 it('creates whole-position native SL below mark even above entry',()=>{const s=fixture();const d=createSlDraft(s,'1950',now);expect(d).toMatchObject({triggerPrice:'195000',quantity:'0',triggerOperator:1,isBid:false,intent:'reduceOnly',deposit:'1000000'});expect(()=>validateDraft(d,s,now)).not.toThrow();});
 it('rejects wrong-side, non-tick and fixed quantity inputs',()=>{const s=fixture();expect(()=>createSlDraft(s,'2000',now)).toThrow('TRIGGER_ALREADY_MET');expect(()=>createSlDraft(s,'1950.01',now)).toThrow('TRIGGER_NOT_ON_TICK');expect(()=>createSlDraft(s,{triggerPrice:'1950',quantity:'1'},now)).toThrow('P0_WHOLE_POSITION_ONLY');});
 it('rejects stale, known-IDs-only, unknown-deposit and already protected repair',()=>{const s=fixture();expect(()=>createSlDraft(s,'1950',now+15000)).toThrow();s.scope='knownIdsOnly';expect(()=>createSlDraft(s,'1950',now)).toThrow();s.scope='indexedSnapshot';s.market!.stopDeposit=null;expect(()=>createSlDraft(s,'1950',now)).toThrow('STOP_DEPOSIT_UNKNOWN');expect(()=>createSlDraft(protectedSnapshot(),'1950',now)).toThrow();});
 it('binds full snapshot and refuses tampering',()=>{const s=fixture();const d=createSlDraft(s,'1950',now);expect(()=>validateDraft({...d,quantity:'1'},s,now)).toThrow('DRAFT_MISMATCH:quantity');s.market!.mark='201000';expect(()=>validateDraft(d,s,now)).toThrow('SNAPSHOT_CHANGED');});
 it('canonical fingerprint ignores object property insertion order only',()=>{const s=fixture();const rearranged={...structuredClone(s),market:Object.fromEntries(Object.entries(s.market!).reverse())} as Snapshot;expect(fingerprintSnapshot(s)).toBe(fingerprintSnapshot(rearranged));s.position!.signedSize='1';expect(fingerprintSnapshot(s)).not.toBe(fingerprintSnapshot(rearranged));});
 it('cancels one explicit stop and rejects opening/unknown targets',()=>{const s=protectedSnapshot();expect(createCancelDraft(s,'1',1,now)).toMatchObject({action:'cancel-stop',stopId:'1',deposit:'0'});expect(()=>createCancelDraft(s,'2',1,now)).toThrow();s.stops[0]!.intent='opening';expect(()=>createCancelDraft(s,'1',1,now)).toThrow();});
});
describe('operation lifecycle',()=>{
 const hash=`0x${'a'.repeat(64)}`;
 function operation():Operation {return {id:'op1',idempotencyKey:'key',owner:a('4'),pool:a('1'),state:'Draft',draft:createSlDraft(fixture(),'1950',now),txHash:null,error:null,createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()};}
 it('requires independent readback, not just a receipt',()=>{let op=transitionOperation(operation(),'AwaitingSignature',{},now);op=transitionOperation(op,'Submitted',{txHash:hash},now);op=transitionOperation(op,'Reconcile',{},now);expect(()=>transitionOperation(op,'Applied',{},now)).toThrow('READ_BACK_REQUIRED');expect(transitionOperation(op,'Applied',{readBackVerified:true},now).state).toBe('Applied');});
 it('never re-signs or retries unknown operation',()=>{expect(canTransition('Unknown','AwaitingSignature')).toBe(false);expect(canTransition('Unknown','Submitted')).toBe(false);expect(isInFlight('Unknown')).toBe(true);});
 it('requires hash for submitted and preserves hash forever',()=>{const op=transitionOperation(operation(),'AwaitingSignature',{},now);expect(()=>transitionOperation(op,'Submitted',{},now)).toThrow('TX_HASH_REQUIRED');const sent=transitionOperation(op,'Submitted',{txHash:hash},now);expect(()=>transitionOperation(sent,'Reconcile',{txHash:`0x${'b'.repeat(64)}`},now)).toThrow('TX_HASH_IMMUTABLE');});
 it('unknown without hash cannot be assumed failed or cancelled',()=>{const op=transitionOperation(transitionOperation(operation(),'AwaitingSignature',{},now),'Unknown',{},now);expect(transitionOperation(op,'Reconcile',{},now).txHash).toBeNull();expect(()=>transitionOperation(op,'Cancelled',{},now)).toThrow();expect(()=>transitionOperation(op,'Failed',{},now)).toThrow();});
});
