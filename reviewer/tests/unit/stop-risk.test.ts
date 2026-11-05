import {describe,it,expect} from 'vitest';
import recorded from '../../fixtures/recorded/opening-2026-11-04.json';
import {fixture} from '../../fixtures/scenarios.js';
import {assessStopRisk} from '../../packages/domain/stop-risk.js';
import {assessDesk} from '../../packages/domain/desk.js';
import type {Snapshot,Operation} from '../../packages/domain/types.js';
const capture=recorded.snapshot as Snapshot;
describe('known-order risk never establishes aggregate coverage',()=>{
 it('retains failed real aggregate and reports the known absolute-price risk',()=>{
  const result=assessDesk(capture,[],Date.parse(capture.capturedAt));
  expect(result).toMatchObject({verdict:'UNKNOWN',reasonCodes:['READ_FAILED'],coverageMode:'unknown',coveredRaw:null,stopRisk:{quality:'EXTREME_DISTANCE',distanceBps:'9999',triggerPrice:'100000000000000000',quantity:'13000',quantityMode:'fixed'}});
  expect(recorded.recordedCapture.aggregateSnapshot).toMatchObject({market:null,position:null,stops:[],scope:'unavailable',complete:false});
 });
 it('downgrades only an otherwise complete synthetic extreme SL',()=>{
  const s=fixture('protected');s.stops[0]!.triggerPrice='1000000000000000000';
  expect(assessDesk(s,[])).toMatchObject({verdict:'NEEDS_REVIEW',coverageMode:'unknown',coveredRaw:null,reasonCodes:expect.arrayContaining(['STOP_DISTANCE_EXTREME'])});
 });
 it('retains unresolved-operation precedence with the same warning',()=>{
  const s=fixture('protected');s.stops[0]!.triggerPrice='1000000000000000000';
  const op={owner:s.position!.owner,pool:s.market!.pool,state:'Unknown'} as Operation;
  expect(assessDesk(s,[op])).toMatchObject({verdict:'UNKNOWN',reasonCodes:expect.arrayContaining(['OPERATION_UNRESOLVED']),stopRisk:{quality:'EXTREME_DISTANCE'}});
 });
 it('handles sensible, absent and already-met synthetic stops',()=>{
  expect(assessStopRisk(fixture('protected'))).toMatchObject({quality:'SENSIBLE',distanceBps:'666',quantityMode:'whole-at-trigger'});
  expect(assessStopRisk(fixture('no-position'))).toBeNull();
  expect(assessStopRisk(fixture('trigger-met'))).toMatchObject({quality:'TRIGGER_MET',distanceBps:'0'});
  const short=fixture('short');short.stops=[{...fixture('protected').stops[0]!,isBid:true,triggerOperator:0,triggerPrice:'3200000000000000000000'}];
  expect(assessStopRisk(short)).toMatchObject({quality:'SENSIBLE',distanceBps:'666'});
 });
 it.each(['ambiguous','mark','quantity','scope','block','trigger'] as const)('does not invent a selected order for unusable %s',kind=>{
  const s=fixture('protected');
  if(kind==='ambiguous')s.stops.push({...s.stops[0]!,id:'2'});
  if(kind==='mark')s.market!.mark='0';if(kind==='quantity')s.stops[0]!.quantity='1e2';
  if(kind==='scope')s.stops[0]!.owner='0x'+'9'.repeat(40);
  if(kind==='block')s.stops[0]!.observedBlock='99';if(kind==='trigger')s.stops[0]!.triggerPrice='bad';
  expect(assessStopRisk(s)).toMatchObject({quality:'UNASSESSED',stopId:null,triggerPrice:null,distanceBps:null,quantity:null});
 });
});
