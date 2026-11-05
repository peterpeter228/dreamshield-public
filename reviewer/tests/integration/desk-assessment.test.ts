import {describe,it,expect} from 'vitest';
import {assessDesk} from '../../packages/domain/desk.js';
import {createCancelDraft} from '../../packages/domain/index.js';
import {fixture} from '../../fixtures/scenarios.js';
import type {Operation,OperationState} from '../../packages/domain/types.js';
function setup(state:OperationState){const snapshot=fixture('protected');const draft=createCancelDraft(snapshot,snapshot.stops[0]!.id);const op:Operation={id:'op',idempotencyKey:'key',owner:draft.owner,pool:draft.pool,state,draft,txHash:null,error:null,createdAt:draft.createdAt,updatedAt:draft.createdAt};return {snapshot,op};}
describe('desk assessment includes unresolved operations',()=>{
 it.each(['AwaitingSignature','Submitted','Unknown','Reconcile','NeedsReview'] as const)('never shows green with unresolved cancellation %s',state=>{const {snapshot,op}=setup(state);const result=assessDesk(snapshot,[op]);expect(result.verdict).not.toBe('VERIFIED');expect(result.reasonCodes).toContain('OPERATION_UNRESOLVED');expect(result.coveredRaw).toBeNull();});
 it('also suppresses green for unknown creation and respects different owner/pool',()=>{const {snapshot,op}=setup('Unknown');expect(assessDesk(snapshot,[{...op,draft:{...op.draft,action:'create-sl',stopId:null}}]).verdict).toBe('UNKNOWN');expect(assessDesk(snapshot,[{...op,owner:'different'}]).verdict).toBe('VERIFIED');expect(assessDesk(snapshot,[{...op,pool:'different'}]).verdict).toBe('VERIFIED');});
 it.each(['Draft','Applied','Failed','Cancelled'] as const)('allows fresh verified configuration for %s',state=>{const {snapshot,op}=setup(state);expect(assessDesk(snapshot,[op]).verdict).toBe('VERIFIED');expect(assessDesk(snapshot,[op],Date.parse(snapshot.capturedAt)+15000).verdict).toBe('UNKNOWN');});
 it('a newer local operation suppresses green before the desk refresh',()=>{const {snapshot,op}=setup('Draft');expect(assessDesk(snapshot,[op,{...op,state:'AwaitingSignature'}]).verdict).toBe('PENDING');});
});
