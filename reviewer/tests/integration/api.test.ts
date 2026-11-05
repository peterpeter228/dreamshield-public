import {describe,it,expect,afterAll,vi} from 'vitest';import {createApp} from '../../apps/server/app.js';import {loadConfig} from '../../apps/server/config.js';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {once} from 'node:events';
import {fixture} from '../../fixtures/scenarios.js';
import {readLiveSnapshot} from '../../packages/protocol/index.js';
vi.mock('../../packages/protocol/index.js',async original=>{
 const actual=await original<typeof import('../../packages/protocol/index.js')>();
 return {...actual,readLiveSnapshot:vi.fn(async()=>({...fixture('protected'),mode:'live-readonly'}))};
});
const instance=createApp(loadConfig({}));const server=instance.app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();if(!address||typeof address==='string')throw new Error('Missing address');const url=`http://127.0.0.1:${address.port}`;afterAll(()=>new Promise<void>(resolve=>server.close(()=>{instance.close();resolve();})));
describe('public replay HTTP boundary',()=>{it('offers explicitly synthetic snapshots without wallet',async()=>{const r=await fetch(url+'/api/desk?scenario=unprotected');expect(r.status).toBe(200);const b=await r.json();expect(b.snapshot.mode).toBe('replay');expect(b.snapshot.position.source).toBe('fixture');expect(b.assessment.verdict).toBe('NEEDS_PROTECTION');expect(b.capabilities.ownerEnabled).toBe(false);});it('cannot mutate operations or draft even with forged client state',async()=>{for(const path of ['/api/drafts','/api/operations/fake/state','/api/operations/fake/reconcile']){const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:'Applied',triggerPrice:'2800'})});expect(r.status).toBe(403);}});it('stale is unknown and exports no transactions',async()=>{const r=await fetch(url+'/api/desk?scenario=stale');expect((await r.json()).assessment.verdict).toBe('UNKNOWN');const e=await(await fetch(url+'/api/evidence')).json();expect(e.transactions).toEqual([]);expect(e.liveWorkflowVerified).toBe(false);expect(e.sha256).toMatch(/^[a-f0-9]{64}$/);});it('rejects unknown fixtures and malformed JSON',async()=>{expect((await fetch(url+'/api/desk?scenario=other')).status).toBe(400);expect((await fetch(url+'/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status).toBe(400);});});

describe('differentiated offline replay HTTP evidence',()=>{
 it('binds a tab export to its exact displayed snapshot and rejects a different tab context',async()=>{
  const first=await(await fetch(url+'/api/desk?scenario=protected')).json();
  expect(first.snapshotId).toMatch(/^[a-f0-9]{64}$/);
  const matching=await fetch(url+'/api/evidence?snapshotId='+first.snapshotId);
  expect(matching.status).toBe(200);
  expect((await matching.json()).snapshot).toEqual(first.snapshot);
  const second=await(await fetch(url+'/api/desk?scenario=unprotected')).json();
  const changed=await fetch(url+'/api/evidence?snapshotId='+first.snapshotId);
  expect(changed.status).toBe(409);
  expect((await changed.json()).error).toBe('SNAPSHOT_CHANGED');
  const fresh=await fetch(url+'/api/evidence?snapshotId='+second.snapshotId);
  expect(fresh.status).toBe(200);
  expect((await fresh.json()).snapshot).toEqual(second.snapshot);
  expect((await fetch(url+'/api/evidence?snapshotId=invalid')).status).toBe(409);
 });
 it.each([
  {scenario:'tp-only',signedSize:'1000000',isBid:false,triggerOperator:0,triggerPrice:'3200000000000000000000',assessment:{verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','TAKE_PROFIT_ONLY'],coverageMode:'none',coveredRaw:'0',stopIds:[]}},
  {scenario:'wrong-side-sl',signedSize:'1000000',isBid:true,triggerOperator:0,triggerPrice:'3200000000000000000000',assessment:{verdict:'NEEDS_PROTECTION',reasonCodes:['NO_MATCHING_SL','WRONG_SIDE_SL'],coverageMode:'none',coveredRaw:'0',stopIds:[]}},
  {scenario:'trigger-met',signedSize:'1000000',isBid:false,triggerOperator:1,triggerPrice:'3000000000000000000000',assessment:{verdict:'NEEDS_REVIEW',reasonCodes:['TRIGGER_CONDITION_MET'],coverageMode:'unknown',coveredRaw:null,stopIds:['1']}},
  {scenario:'residual-stops',signedSize:'0',isBid:false,triggerOperator:1,triggerPrice:'2800000000000000000000',assessment:{verdict:'NO_POSITION',reasonCodes:['NO_POSITION','RESIDUAL_STOPS'],coverageMode:'none',coveredRaw:'0',stopIds:['1']}}
 ] as const)('serves $scenario and exports its raw, transaction-free evidence',async({scenario,signedSize,isBid,triggerOperator,triggerPrice,assessment})=>{
  const response=await fetch(`${url}/api/desk?scenario=${scenario}`);
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  const desk=await response.json();
  const expectedSnapshot={mode:'replay',scope:'indexedSnapshot',complete:true,readError:null,market:{chainId:50383,baseDecimals:6,quoteDecimals:18,mark:'3000000000000000000000',tickSize:'1000000000000000000',observedBlock:'100'},position:{signedSize,source:'fixture'},stops:[{id:'1',intent:'reduceOnly',isBid,quantity:'0',triggerPrice,triggerOperator,stopOrderType:1,limitPrice:'0',status:'pending',siblingId:null,observedBlock:'100'}]};
  expect(desk.snapshot).toMatchObject(expectedSnapshot);expect(desk.snapshot.stops).toHaveLength(1);
  expect(desk.assessment).toMatchObject({...assessment,scope:'indexedSnapshot'});
  expect(desk.operations).toEqual([]);expect(desk.capabilities).toMatchObject({mode:'replay',ownerEnabled:false,signerAvailable:false});
  const exported=await fetch(url+'/api/evidence');
  expect(exported.status).toBe(200);expect(exported.headers.get('content-disposition')).toBe('attachment; filename="dreamshield-evidence.json"');
  const evidence=await exported.json();
  expect(evidence).toMatchObject({schemaVersion:1,project:'DreamShield',mode:'replay',snapshot:expectedSnapshot,assessment:{...assessment,scope:'indexedSnapshot'},transactions:[],liveWorkflowVerified:false});
  expect(evidence.snapshot.stops).toHaveLength(1);expect(evidence.transactions).toEqual([]);
  const {sha256,...content}=evidence;
  expect(sha256).toBe(createHash('sha256').update(JSON.stringify(content)).digest('hex'));
 });
});

describe('recorded known-ID capture HTTP contract',()=>{
 it('keeps aggregate UNKNOWN, binds historical export and clears metadata on synthetic selection',async()=>{
  const response=await fetch(url+'/api/recorded');expect(response.status).toBe(200);const desk=await response.json();
  expect(desk).toMatchObject({operations:[],snapshot:{mode:'replay',scope:'knownIdsOnly',complete:false,position:{source:'chain'},market:{stopDeposit:null,observedBlock:'41611728'}},assessment:{verdict:'UNKNOWN',reasonCodes:['READ_FAILED'],coverageMode:'unknown',coveredRaw:null,stopRisk:{quality:'EXTREME_DISTANCE',distanceBps:'9999'}},capabilities:{mode:'replay',ownerEnabled:false}});
  expect(desk.snapshot).not.toHaveProperty('stopDiscovery');expect(desk.snapshot.market).not.toHaveProperty('genesisHash');
  const exported=await fetch(url+'/api/evidence?snapshotId='+desk.snapshotId),body=await exported.json();expect(exported.status).toBe(200);
  expect(body.assessment).toEqual(desk.assessment);expect(body.snapshot).toEqual(desk.snapshot);
  expect(body).toMatchObject({mode:'replay',operations:[],transactions:[],lifecycle:null,liveWorkflowVerified:false,realSendProof:'NONE',recordedCapture:{aggregateSnapshot:{market:null,position:null,scope:'unavailable',complete:false},opening:{operation:1,verifier:{status:'REJECTED',error:'Error: ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED'}}}});
  const {sha256,...content}=body;expect(sha256).toBe(createHash('sha256').update(JSON.stringify(content)).digest('hex'));
  expect((await fetch(url+'/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
  const synthetic=await(await fetch(url+'/api/desk?scenario=protected')).json();expect(synthetic.assessment.verdict).toBe('VERIFIED');expect(synthetic).not.toHaveProperty('recordedCapture');
  expect((await fetch(url+'/api/evidence?snapshotId='+desk.snapshotId)).status).toBe(409);expect(await(await fetch(url+'/api/evidence?snapshotId='+synthetic.snapshotId)).json()).not.toHaveProperty('recordedCapture');
 });
 it.each(['live-readonly','live-owner'] as const)('rejects %s recorded requests without changing latest/export/readiness or querying',async mode=>{
  const dir=mkdtempSync(join(tmpdir(),'recorded-boundary-')),config={mode,host:'127.0.0.1',port:4311,ownerEnabled:mode==='live-owner',dataDir:dir,owner:fixture().position!.owner,pool:fixture().market!.pool};
  const local=createApp(config),server=local.app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error('Missing address');const base=`http://127.0.0.1:${address.port}`;
  try{
   const desk=await(await fetch(base+'/api/desk')).json(),before=await(await fetch(base+'/api/evidence')).json(),ready=await(await fetch(base+'/readyz')).json(),reads=vi.mocked(readLiveSnapshot).mock.calls.length;
   const rejected=await fetch(base+'/api/recorded');expect(rejected.status).toBe(404);expect(await rejected.json()).toEqual({error:'RECORDED_CAPTURE_UNAVAILABLE'});
   const after=await(await fetch(base+'/api/evidence?snapshotId='+desk.snapshotId)).json();expect(after.snapshot).toEqual(before.snapshot);expect(after.operations).toEqual(before.operations);expect(after.lifecycle).toEqual(before.lifecycle);expect(after).not.toHaveProperty('recordedCapture');expect(await(await fetch(base+'/readyz')).json()).toEqual(ready);expect(vi.mocked(readLiveSnapshot).mock.calls.length).toBe(reads);
  }finally{const closed=once(server,'close');server.close();await closed;local.close();rmSync(dir,{recursive:true})}
 });
});
