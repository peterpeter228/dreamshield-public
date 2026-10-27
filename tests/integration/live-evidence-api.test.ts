import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {once} from 'node:events';
import type * as Viem from 'viem';
import type * as MarketsSdk from '@somnia-chain/markets-sdk';
import {fixture} from '../../fixtures/scenarios.js';
import {createSlDraft} from '../../packages/domain/index.js';
import type {EvidenceIdentity,EvidenceObservation,EvidenceProvenance,EvidenceRead} from '../../packages/domain/live-evidence.js';
import type {Operation,Snapshot} from '../../packages/domain/types.js';
import {Journal} from '../../packages/storage/index.js';
import type {Config} from '../../apps/server/config.js';

const offline=vi.hoisted(()=>{
 const forbidden=(name:string)=>vi.fn(()=>{throw new Error(`OFFLINE_TEST_FORBIDS_${name}`);});
 return {
  capture:vi.fn(),read:vi.fn(),reconcile:vi.fn(),
  prepare:forbidden('PREPARE_OWNER_CALL'),send:forbidden('SEND_TRANSACTION'),
  cancel:forbidden('SEND_CANCELLATION'),wallet:forbidden('WALLET_ACCESS'),
  reader:forbidden('UNSTUBBED_PROTOCOL_READER'),client:forbidden('UNSTUBBED_RPC_CLIENT'),
  sign:forbidden('SIGN_TRANSACTION'),request:forbidden('WALLET_REQUEST'),
 };
});
vi.mock('../../packages/protocol/index.js',()=>({
 captureEvidenceObservation:offline.capture,readLiveSnapshot:offline.read,reconcileOperation:offline.reconcile,
 prepareOwnerCall:offline.prepare,executeNativeSl:offline.send,executeNativeCancel:offline.cancel,
 createProtocolReader:offline.reader,httpClient:offline.client,
 sendTransaction:offline.send,signTransaction:offline.sign,requestAddresses:offline.wallet,request:offline.request,
}));
vi.mock('viem',async importOriginal=>({
 ...await importOriginal<typeof Viem>(),
 createWalletClient:offline.wallet,createPublicClient:offline.client,
}));
vi.mock('@somnia-chain/markets-sdk',async importOriginal=>({...await importOriginal<typeof MarketsSdk>(),SomniaMarkets:offline.reader}));
import {createApp} from '../../apps/server/app.js';
import type {CaptureEvidenceInput} from '../../packages/protocol/index.js';

interface TestServer {
 config:Config;url:string;
 post:(path:string,body:unknown,headers?:Record<string,string>)=>Promise<Response>;
 get:(path?:string)=>Promise<Response>;
 close:()=>Promise<void>;
}
const CLOCK=Date.parse('2026-10-27T12:00:00.000Z');
const OWNER='0x1111111111111111111111111111111111111111';
const POOL='0x2222222222222222222222222222222222222222';
const OTHER_OWNER='0x5555555555555555555555555555555555555555';
const OTHER_POOL='0x6666666666666666666666666666666666666666';
const OPENING_HASH=`0x${'a'.repeat(64)}`;
const SECOND_OPENING_HASH=`0x${'b'.repeat(64)}`;
const BLOCK_HASH=`0x${'c'.repeat(64)}`;
const GENESIS_HASH=`0x${'d'.repeat(64)}`;
const capturePath='/api/owner/evidence/capture';
const directories:string[]=[];
const servers:{close:()=>Promise<void>}[]=[];

function dataDir(){const dir=mkdtempSync(join(tmpdir(),'dreamshield-evidence-api-'));directories.push(dir);return dir;}
function identity(owner=OWNER,pool=POOL):EvidenceIdentity {
 return {chainId:50383,genesisHash:GENESIS_HASH,owner,signer:owner,pool,
  marginBank:'0x4444444444444444444444444444444444444444',stopRegistry:'0x3333333333333333333333333333333333333333'};
}
function snapshot(owner=OWNER,pool=POOL,scenario='unprotected',at=Date.now()):Snapshot {
 const s=fixture(scenario,at);
 return {...s,mode:'live-owner',market:{...s.market!,pool,genesisHash:GENESIS_HASH,blockHash:BLOCK_HASH},
  position:{...s.position!,owner,pool,source:'chain'},stops:s.stops.map(stop=>({...stop,owner,pool}))};
}
function unknownRead<T>():EvidenceRead<T> {
 return {status:'unknown',value:null,block:null,consistency:'unavailable',error:'OFFLINE_STUB_NO_COMPLETE_READ'};
}
/** Deliberately incomplete synthetic reads exercise persistence, never G1 acceptance. */
function observation(input:CaptureEvidenceInput):EvidenceObservation {
 const s=snapshot(input.owner,input.pool);
 const block={number:'100',hash:BLOCK_HASH,timestamp:new Date().toISOString()};
 const base:EvidenceObservation={id:input.id,lifecycleId:input.lifecycleId,kind:input.kind,
  identity:identity(input.owner,input.pool),provenance:{...input.provenance,capturedAt:s.capturedAt},snapshot:s};
 if(input.kind==='opening')base.opening={
  transaction:{hash:input.openingTxHash!,chainId:50383,from:input.owner,to:input.pool,input:'0x',value:'0',blockNumber:'100',blockHash:BLOCK_HASH},
  receipt:{transactionHash:input.openingTxHash!,from:input.owner,to:input.pool,status:'success',block,canonicalBlockHash:BLOCK_HASH,logs:[]},
  order:unknownRead(),position:{status:'known',value:s.position!,block,consistency:'pinned',error:null},
 };
 if(input.kind==='residual'){
  base.snapshot={...s,complete:false,scope:'knownIdsOnly',readError:'OFFLINE_STUB_INCOMPLETE_RESIDUALS'};
  base.residuals={position:{status:'known',value:s.position!,block,consistency:'pinned',error:null},
   nativeStops:unknownRead(),restingOrders:unknownRead(),walletStt:unknownRead(),walletCollateral:unknownRead(),
   bankUnlockedCollateral:unknownRead(),bankLockedCollateral:unknownRead()};
 }
 return base;
}
function seededOpening(owner=OWNER,pool=POOL,lifecycleId='private-lifecycle'):EvidenceObservation {
 const provenance:EvidenceProvenance={source:{commit:'0'.repeat(40),verifier:'offline-test-only'},
  versions:{node:process.version,sdk:'0.32.1',viem:'2.57.11'},lockSha256:'0'.repeat(64),mode:'live-owner',
  capturedAt:new Date(CLOCK-1000).toISOString()};
 return observation({owner,pool,lifecycleId,id:`opening-${owner}-${pool}`,kind:'opening',openingTxHash:OPENING_HASH,provenance});
}
function rows(path:string){
 const db=new DatabaseSync(path);
 try{return {operations:db.prepare('SELECT * FROM operations ORDER BY rowid').all(),
  events:db.prepare('SELECT * FROM events ORDER BY rowid').all(),cursors:db.prepare('SELECT * FROM cursors ORDER BY key').all()};}
 finally{db.close();}
}
function expectChecksum(evidence:Record<string,unknown>){
 const {sha256,...body}=evidence;
 expect(sha256).toBe(createHash('sha256').update(JSON.stringify(body)).digest('hex'));
}
async function serve(overrides:Partial<Config>={}):Promise<TestServer>{
 const config:Config={mode:'live-owner',ownerEnabled:true,owner:OWNER,pool:POOL,host:'127.0.0.1',port:3000,...overrides,dataDir:overrides.dataDir??dataDir()};
 const instance=createApp(config);const server=instance.app.listen(0,'127.0.0.1');
 await once(server,'listening');
 const address=server.address();if(!address||typeof address==='string')throw new Error('Missing test server address');
 const url=`http://127.0.0.1:${address.port}`;
 const conf=await(await fetch(url+'/api/config')).json();
 let closed=false;
 const handle:TestServer={config,url,
  post:(path:string,body:unknown,headers:Record<string,string>={})=>fetch(url+path,{method:'POST',
   headers:{'Content-Type':'application/json',origin:url,'x-dreamshield-token':conf.csrfToken??'not-an-owner-token',...headers},body:JSON.stringify(body)}),
  get:(path='/api/evidence')=>fetch(url+path),
  close:async()=>{if(closed)return;closed=true;const done=once(server,'close');server.close();await done;instance.close();},
 };
 servers.push(handle);return handle;
}
async function capture(server:TestServer,kind:EvidenceObservation['kind'],openingTxHash?:string){
 const response=await server.post(capturePath,{kind,...(openingTxHash?{openingTxHash}:{})});
 expect(response.status).toBe(200);return (await response.json()).observation as EvidenceObservation;
}

beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(CLOCK);
 for(const mock of Object.values(offline))mock.mockReset();
 for(const name of ['prepare','send','cancel','wallet','reader','client','sign','request'] as const){
  offline[name].mockImplementation(()=>{throw new Error(`OFFLINE_TEST_FORBIDS_${name.toUpperCase()}`);});
 }
 offline.capture.mockImplementation(async(input:CaptureEvidenceInput)=>observation(input));
 offline.read.mockImplementation(async({owner,pool}:{owner:string;pool:string})=>snapshot(owner,pool,'protected'));
 offline.reconcile.mockImplementation(async(_operation:Operation)=>{throw new Error('EXPORT_MUST_NOT_RECONCILE');});
});
afterEach(async()=>{
 try{for(const server of servers.splice(0).reverse())await server.close();}
 finally{for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true});vi.useRealTimers();}
 for(const name of ['prepare','send','cancel','wallet','reader','client','sign','request'] as const)expect(offline[name]).not.toHaveBeenCalled();
});

describe('local owner evidence HTTP capture (offline protocol stub, not live proof)',()=>{
 it('requires loopback origin and CSRF before any capture or persistence',async()=>{
  const server=await serve();const body={kind:'opening',openingTxHash:OPENING_HASH};
  const deniedHeaders:Record<string,string>[]=[
   {'x-dreamshield-token':''},{'x-dreamshield-token':'forged-token'},
   {origin:'http://other.example'},{'sec-fetch-site':'cross-site'},
   {host:'other.example',origin:'http://other.example'},
  ];
  for(const headers of deniedHeaders)expect((await server.post(capturePath,body,headers)).status).toBe(403);
  expect(offline.capture).not.toHaveBeenCalled();
  expect(rows(join(server.config.dataDir,'dreamshield.sqlite')).events).toEqual([]);
 });
 it.each([{owner:null},{pool:null},{owner:null,pool:null}])('requires configured scope %j',async scope=>{
  const server=await serve(scope);
  expect((await server.post(capturePath,{kind:'opening',openingTxHash:OPENING_HASH})).status).toBe(409);
  expect(offline.capture).not.toHaveBeenCalled();
  expect(rows(join(server.config.dataDir,'dreamshield.sqlite')).events).toEqual([]);
 });
 it('rejects client verification, identity, provenance, snapshots and lifecycle IDs',async()=>{
  const server=await serve();
  const forgedFields=[
   {readBackVerified:true},{receiptFailed:true},{verified:true},{liveWorkflowVerified:true},
   {assessment:{verdict:'VERIFIED'}},{proof:{receiptVerified:true}},{evidence:{readBackVerified:true}},
   {identity:identity(OTHER_OWNER)},{owner:OTHER_OWNER},{pool:OTHER_POOL},
   {id:'client-id'},{lifecycleId:'client-lifecycle'},{provenance:{source:{commit:'forged'}}},
   {snapshot:snapshot()},{opening:{verified:true}},{residuals:{walletStt:'0'}},{state:'Applied'},
  ];
  for(const fields of forgedFields){
   const response=await server.post(capturePath,{kind:'opening',openingTxHash:OPENING_HASH,...fields});
   expect(response.status,JSON.stringify(fields)).toBe(409);
  }
  for(const body of [{},{kind:'verified'},{kind:'opening'},{kind:'opening',openingTxHash:'0x123'},
   {kind:'gap',openingTxHash:OPENING_HASH},{kind:'missing-sl'},{kind:'gap'},{kind:'residual'}]){
   expect((await server.post(capturePath,body)).status).toBe(409);
  }
  expect(offline.capture).not.toHaveBeenCalled();
  const evidence=await(await server.get()).json();expect(evidence.lifecycle).toBeNull();expect(evidence.liveWorkflowVerified).toBe(false);
 });
 it('rejects a protocol result that substitutes owner, pool, lifecycle or stage',async()=>{
  const server=await serve();
  const substitute:((value:EvidenceObservation)=>EvidenceObservation)[]=[
   value=>({...value,identity:{...value.identity,owner:OTHER_OWNER}}),
   value=>({...value,identity:{...value.identity,pool:OTHER_POOL}}),
   value=>({...value,lifecycleId:'different-lifecycle'}),value=>({...value,kind:'gap'}),
  ];
  for(const change of substitute){
   offline.capture.mockImplementationOnce(async(input:CaptureEvidenceInput)=>change(observation(input)));
   expect((await server.post(capturePath,{kind:'opening',openingTxHash:OPENING_HASH})).status).toBe(409);
  }
  const journal=new Journal(join(server.config.dataDir,'dreamshield.sqlite'));
  try{expect(journal.currentLifecycle(OWNER,POOL)).toBeNull();expect(journal.observations(OWNER,POOL)).toEqual([]);}
  finally{journal.close();}
 });
 it('allocates lifecycle IDs, persists scoped immutable stages and exports the same history after restart',async()=>{
  const dir=dataDir();const path=join(dir,'dreamshield.sqlite');const seed=new Journal(path);
  try{
   seed.recordObservation(seededOpening(OTHER_OWNER,POOL,'other-owner-lifecycle'));
   seed.recordObservation(seededOpening(OWNER,OTHER_POOL,'other-pool-lifecycle'));
   seed.reserve(createSlDraft(snapshot(OTHER_OWNER),'2800',CLOCK),'private-other-owner');
   const otherPool=seed.reserve(createSlDraft(snapshot(OWNER,OTHER_POOL),'2800',CLOCK),'private-other-pool');
   seed.transition(otherPool.id,'Cancelled');
  }finally{seed.close();}
  const server=await serve({dataDir:dir});
  const opening=await capture(server,'opening',OPENING_HASH);
  expect(opening.lifecycleId).toMatch(/^[0-9a-f-]{36}$/i);expect(opening.id).toMatch(/^[0-9a-f-]{36}$/i);
  expect(opening.id).not.toBe(opening.lifecycleId);
  const input=offline.capture.mock.calls[0]![0] as CaptureEvidenceInput;
  expect(input).toMatchObject({owner:OWNER,pool:POOL,kind:'opening',openingTxHash:OPENING_HASH,lifecycleId:opening.lifecycleId,id:opening.id});
  expect(opening.provenance).toEqual(input.provenance);
  expect(input.provenance).toMatchObject({mode:'live-owner',capturedAt:new Date(CLOCK).toISOString(),
   versions:{node:process.version,sdk:'0.32.1',viem:'2.57.11'}});
  expect(input.provenance.source.commit).toMatch(/^[0-9a-f]{40}$/i);expect(input.provenance.source.verifier.length).toBeGreaterThan(0);
  expect(input.provenance.lockSha256).toBe(createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'));
  const captured=[opening];
  for(const [index,kind] of (['missing-sl','gap','residual'] as const).entries()){
   vi.setSystemTime(CLOCK+(index+1)*1000);captured.push(await capture(server,kind));
  }
  expect(new Set(captured.map(value=>value.id)).size).toBe(4);
  expect(captured.every(value=>value.lifecycleId===opening.lifecycleId)).toBe(true);
  const selected=`/api/evidence?lifecycleId=${opening.lifecycleId}`;
  const exported=await(await server.get(selected)).json();
  expect(exported.lifecycle).toMatchObject({schemaVersion:1,artifactType:'dreamshield-g1-lifecycle',lifecycleId:opening.lifecycleId,
   identity:identity(),provenance:{...opening.provenance,capturedAt:captured.at(-1)!.provenance.capturedAt},observations:captured,operations:[]});
  expect(exported.operations).toEqual([]);expect(exported.transactions).toEqual([]);expect(exported.liveWorkflowVerified).toBe(false);expectChecksum(exported);
  const beforeDuplicates=rows(path);
  for(const kind of ['missing-sl','gap','residual']){
   vi.setSystemTime(Date.now()+1000);
   expect((await server.post(capturePath,{kind})).status).toBe(409);
  }
  expect(rows(path)).toEqual(beforeDuplicates);
  const afterDuplicates=await(await server.get(selected)).json();
  expect(afterDuplicates.lifecycle).toEqual(exported.lifecycle);expect(afterDuplicates.snapshot).toEqual(exported.snapshot);
  vi.setSystemTime(Date.now()+1000);
  const second=await capture(server,'opening',SECOND_OPENING_HASH);
  expect(second.lifecycleId).not.toBe(opening.lifecycleId);
  expect((await(await server.get()).json()).lifecycle.observations).toEqual([second]);
  expect((await(await server.get(selected)).json()).lifecycle).toEqual(exported.lifecycle);
  for(const lifecycleId of ['other-owner-lifecycle','other-pool-lifecycle','missing']){
   const outside=await(await server.get(`/api/evidence?lifecycleId=${lifecycleId}`)).json();
   expect(outside.lifecycle).toBeNull();expect(outside.operations).toEqual([]);
  }
  const durable=rows(path);const captures=offline.capture.mock.calls.length;const reads=offline.read.mock.calls.length;
  await server.close();const restarted=await serve({dataDir:dir});
  const response=await restarted.get(selected);expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-disposition')).toBe('attachment; filename="dreamshield-evidence.json"');
  const restored=await response.json();
  expect(restored.lifecycle).toEqual(exported.lifecycle);expect(restored.snapshot).toBeNull();expect(restored.assessment).toBeNull();
  expect(restored.operations).toEqual([]);expect(restored.liveWorkflowVerified).toBe(false);expectChecksum(restored);
  expect(rows(path)).toEqual(durable);expect(offline.capture).toHaveBeenCalledTimes(captures);expect(offline.read).toHaveBeenCalledTimes(reads);
  expect(offline.reconcile).not.toHaveBeenCalled();
 });
 it('rejects a reconciliation Applied claim without proof and keeps the operation locked',async()=>{
  const server=await serve();const opening=await capture(server,'opening',OPENING_HASH);
  const path=join(server.config.dataDir,'dreamshield.sqlite');const journal=new Journal(path);
  let operation:Operation;
  try{
   operation=journal.reserve(createSlDraft(snapshot(),'2800',CLOCK),'proofless-applied');
   journal.transition(operation.id,'AwaitingSignature');operation=journal.transition(operation.id,'Submitted',SECOND_OPENING_HASH);
  }finally{journal.close();}
  offline.reconcile.mockResolvedValueOnce({state:'Applied',reason:'OFFLINE_FORGED_APPLIED_WITHOUT_PROOF',snapshot:snapshot(OWNER,POOL,'protected')});
  const response=await server.post(`/api/operations/${operation!.id}/reconcile`,{});expect(response.status).toBe(409);
  expect(offline.reconcile).toHaveBeenCalledTimes(1);
  const inspect=new Journal(path);
  try{
   expect(inspect.get(operation!.id)).toMatchObject({state:'Reconcile',txHash:SECOND_OPENING_HASH});
   expect(inspect.get(operation!.id)?.evidence).toBeUndefined();
   expect(()=>inspect.reserve(createSlDraft(snapshot(),'2800',CLOCK),'cannot-resend')).toThrow('IN_FLIGHT');
  }finally{inspect.close();}
  const before=rows(path);const evidence=await(await server.get(`/api/evidence?lifecycleId=${opening.lifecycleId}`)).json();
  expect(evidence.operations[0].state).toBe('Reconcile');expect(evidence.lifecycle.operations[0].proof).toBeNull();
  expect(evidence.assessment.verdict).toBe('PENDING');expect(evidence.liveWorkflowVerified).toBe(false);
  expect(rows(path)).toEqual(before);expect(offline.reconcile).toHaveBeenCalledTimes(1);
 });
 it.each(['NeedsReview','recovered'] as const)('exports incomplete observations without promoting or clearing a %s lock',async state=>{
  const server=await serve();const opening=await capture(server,'opening',OPENING_HASH);
  const path=join(server.config.dataDir,'dreamshield.sqlite');const journal=new Journal(path);
  let operation:Operation;
  try{
   const draft=createSlDraft(snapshot(),'2800',CLOCK);operation=journal.reserve(draft,`locked-${state}`);
   journal.transition(operation.id,'AwaitingSignature');
   if(state==='recovered')operation=journal.bindRecoveredHash(operation.id,SECOND_OPENING_HASH,OWNER,POOL);
   else{
    journal.transition(operation.id,'Submitted',SECOND_OPENING_HASH);journal.transition(operation.id,'Reconcile');
    operation=journal.transition(operation.id,'NeedsReview',undefined,'OFFLINE_AMBIGUOUS_READBACK');
   }
  }finally{journal.close();}
  const desk=await(await server.get('/api/desk')).json();
  expect(desk.assessment.verdict).toBe(state==='recovered'?'UNKNOWN':'NEEDS_REVIEW');
  expect(desk.assessment.reasonCodes).toContain('OPERATION_UNRESOLVED');
  vi.setSystemTime(CLOCK+1000);const residual=await capture(server,'residual');
  expect(residual.snapshot.complete).toBe(false);expect(residual.snapshot.position?.signedSize).toBe('1000000');
  const before=rows(path);const captures=offline.capture.mock.calls.length;const reads=offline.read.mock.calls.length;
  for(let index=0;index<2;index++){
   const evidence=await(await server.get(`/api/evidence?lifecycleId=${opening.lifecycleId}`)).json();
   expect(evidence.lifecycle.observations).toEqual([opening,residual]);
   expect(evidence.lifecycle.operations).toContainEqual({operation,proof:null});
   expect(evidence.operations).toEqual([operation]);expect(evidence.liveWorkflowVerified).toBe(false);
   expect(evidence.assessment.verdict).toBe('UNKNOWN');expect(evidence.assessment.coveredRaw).toBeNull();
   expect(evidence.lifecycle.observations[1].residuals.restingOrders).toEqual(unknownRead());
   expect(evidence.lifecycle.observations[1].residuals.walletStt.value).toBeNull();expectChecksum(evidence);
  }
  expect(rows(path)).toEqual(before);expect(offline.capture).toHaveBeenCalledTimes(captures);expect(offline.read).toHaveBeenCalledTimes(reads);
  expect(offline.reconcile).not.toHaveBeenCalled();
  const inspect=new Journal(path);
  try{
   expect(inspect.get(operation!.id)).toEqual(operation!);
   expect(()=>inspect.reserve(createSlDraft(snapshot(),'2800',CLOCK+1000),'must-stay-locked')).toThrow('IN_FLIGHT');
  }finally{inspect.close();}
 });
});

describe('private evidence isolation in non-owner modes (offline protocol stub)',()=>{
 it.each(['replay','live-readonly'] as const)('%s denies capture and never opens or exports a private journal',async mode=>{
  const dir=dataDir();const path=join(dir,'dreamshield.sqlite');const seed=new Journal(path);
  let privateOperation:Operation;
  try{
   seed.recordObservation(seededOpening());
   privateOperation=seed.reserve(createSlDraft(snapshot(),'2800',CLOCK),'private-owner-operation');
   seed.transition(privateOperation.id,'AwaitingSignature');
  }finally{seed.close();}
  const before=rows(path);const server=await serve({mode,ownerEnabled:false,dataDir:dir});
  expect((await(await server.get('/api/config')).json()).csrfToken).toBeNull();
  expect((await server.post(capturePath,{kind:'opening',openingTxHash:OPENING_HASH})).status).toBe(403);
  const initial=await(await server.get('/api/evidence?lifecycleId=private-lifecycle')).json();
  expect(initial).toMatchObject({mode,lifecycle:null,operations:[],transactions:[],liveWorkflowVerified:false,snapshot:null});
  const desk=await(await server.get('/api/desk')).json();
  expect(desk.snapshot.mode).toBe(mode);expect(desk.operations).toEqual([]);expect(desk.capabilities.ownerEnabled).toBe(false);
  const evidence=await(await server.get('/api/evidence?lifecycleId=private-lifecycle')).json();
  expect(evidence).toMatchObject({mode,lifecycle:null,operations:[],transactions:[],liveWorkflowVerified:false});expectChecksum(evidence);
  expect(JSON.stringify(evidence)).not.toContain(privateOperation!.id);expect(rows(path)).toEqual(before);
  expect(offline.capture).not.toHaveBeenCalled();expect(offline.reconcile).not.toHaveBeenCalled();
 });
 it('does not create an owner data directory for a read-only export',async()=>{
  const absent=join(dataDir(),'not-created');const server=await serve({mode:'live-readonly',ownerEnabled:false,dataDir:absent});
  expect((await server.get()).status).toBe(200);expect(existsSync(absent)).toBe(false);
  expect(offline.read).not.toHaveBeenCalled();expect(offline.capture).not.toHaveBeenCalled();
 });
});
