import express from 'express';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import type { Config } from './config.js';
import {Journal} from '../../packages/storage/index.js';
import {createSlDraft,createCancelDraft} from '../../packages/domain/index.js';
import {assessDesk} from '../../packages/domain/desk.js';
import {readLiveSnapshot,reconcileOperation,captureEvidenceObservation} from '../../packages/protocol/index.js';
import {prepareUnsignedSafePlan,prepareFreshUnsignedSafePlan} from '../../packages/protocol/safe-plan.js';
import {fixture,SCENARIOS} from '../../fixtures/scenarios.js';
import type {Snapshot,OperationState,RecordedCapture} from '../../packages/domain/types.js';
import {captureProvenance,exportLifecycle} from './evidence.js';
export function createApp(config:Config){
 const app=express();const token=randomBytes(32).toString('hex');let latest:Snapshot|null=null;let recordedCapture:RecordedCapture|null=null;
 let journal:Journal|null=null;if(config.ownerEnabled){mkdirSync(config.dataDir,{recursive:true});journal=new Journal(join(config.dataDir,'dreamshield.sqlite'));journal.recover();}
 app.disable('x-powered-by');app.use(express.json({limit:'64kb'}));
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');if(config.ownerEnabled&&!['127.0.0.1','localhost','[::1]'].includes((req.headers.host??'').replace(/:\d+$/,''))){res.status(403).json({error:'LOCAL_HOST_REQUIRED'});return;}next();});
 app.get('/healthz',(_req,res)=>res.json({status:'alive',mode:config.mode}));
 app.get('/readyz',(_req,res)=>{const ok=config.mode==='replay'||!!latest&&assessDesk(latest,journal?.list()??[]).verdict!=='UNKNOWN';res.status(ok?200:503).json({ready:ok,mode:config.mode,chainRead:latest?.capturedAt??null});});
 app.get('/api/config',(_req,res)=>res.json({mode:config.mode,ownerEnabled:config.ownerEnabled,csrfToken:config.ownerEnabled?token:null,chainId:50383}));
 async function snapshot(scenario:string):Promise<Snapshot>{if(config.mode==='replay')return fixture(scenario);const value=await readLiveSnapshot({owner:config.owner,pool:config.pool,transport:config.mode==='live-readonly'?config.readonlyTransport:undefined});return {...value,mode:config.mode};}
 const snapshotId=(value:Snapshot|null)=>value?createHash('sha256').update(JSON.stringify(value)).digest('hex'):null;
 app.get('/api/recorded',async(_req,res)=>{
  if(config.mode!=='replay'){res.status(404).json({error:'RECORDED_CAPTURE_UNAVAILABLE'});return;}
  try{
   // Optional replay data: a missing asset must return 503, not prevent a live instance starting.
   const raw=(await import('../../fixtures/recorded/opening-2026-11-04.json',{with:{type:'json'}})).default;
   const s=raw.snapshot as Snapshot,c=raw.recordedCapture as RecordedCapture;
   const source='evidence/recorded/opening-2026-11-04.sanitized.json';
   const bytes=readFileSync(resolve(source)),evidence=JSON.parse(bytes.toString('utf8'));
   if(raw.schemaVersion!==1||raw.kind!=='recorded-chain'||s.mode!=='replay'||s.scope!=='knownIdsOnly'||s.complete!==false||!s.readError||s.stopDiscovery||!s.market||!s.position||s.market.genesisHash||s.market.stopDeposit!==null||s.position.source!=='chain'||s.stops.length!==2||c.kind!=='recorded-chain'||c.sourceFile!==source||c.sourceSha256!==createHash('sha256').update(bytes).digest('hex')||c.attribution!=='official-dreamdex-ui-user-safe-not-dreamshield'||c.realSendProof!=='NONE'||c.liveWorkflowVerified!==false||c.opening.operation!==1||c.opening.verifier.status!=='REJECTED'||!c.opening.verifier.error.includes('ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED')||!Number.isFinite(Date.parse(s.capturedAt))||s.capturedAt!==c.capturedAt||c.pin.block!==s.market.observedBlock||c.pin.hash!==s.market.blockHash||c.pin.timestamp!==evidence.pin.timestamp||c.pin.hash!==evidence.pin.hash||evidence.canonicalRecheck!==true||c.opening.txHash!==evidence.opening.transaction.hash||JSON.stringify(c.aggregateSnapshot)!==JSON.stringify(evidence.aggregateSnapshot)||!c.aggregateSnapshot.readError||c.aggregateSnapshot.complete!==false)throw new Error('INVALID_CAPTURE');
   if(c.sourceSha!==evidence.sourceSha||c.capturedAt!==evidence.startedAt||s.market.mark!==evidence.mark[1]||s.market.feedValid!==evidence.mark[0]||s.market.stopRegistry!==evidence.registry||s.position.signedSize!==evidence.position.size||s.position.entryPrice!==evidence.position.avgEntryPrice||s.position.owner!==evidence.account.factoryAccount||s.readError!==c.aggregateSnapshot.readError)throw new Error('CAPTURE_PROVENANCE_MISMATCH');
   for(const n of s.stops){
    const row=evidence.stopStates.find((row:{id:string})=>row.id===n.id),stored=row?.value[1],t=stored?.orderWithTrigger;
    if(!t||row.value[0]!==true||n.status!=='pending'||n.owner!==t.order.owner||n.quantity!==t.order.quantity||n.isBid!==t.order.isBid||n.triggerPrice!==t.triggerPrice||n.triggerOperator!==t.triggerOperator||n.stopOrderType!==t.orderType||n.limitPrice!==t.limitPrice||stored.intent!==0||n.intent!=='reduceOnly'||n.siblingId!==stored.siblingOrderId||n.observedBlock!==c.pin.block)throw new Error('KNOWN_ID_PROVENANCE_MISMATCH');
   }
   const assessment=assessDesk(s,[],Date.parse(s.capturedAt));
   if(assessment.verdict!=='UNKNOWN'||assessment.stopRisk?.quality!=='EXTREME_DISTANCE'||assessment.stopRisk.distanceBps!=='9999')throw new Error('INVALID_KNOWN_OBSERVATIONS');
   latest=s;recordedCapture=c;
   res.json({snapshot:s,assessment,snapshotId:snapshotId(s),operations:[],recordedCapture:c,capabilities:{account:null,monitoredOwner:null,mode:'replay',ownerEnabled:false,signerAvailable:false,reason:'Recorded known-ID chain observations from block 41611728. Incomplete discovery. Not live, not DreamShield-executed.'}});
  }catch{res.status(503).json({error:'RECORDED_CAPTURE_UNAVAILABLE'});}
 });
 app.get('/evidence/recorded/opening-2026-11-04.sanitized.json',(_req,res)=>{if(config.mode!=='replay'){res.sendStatus(404);return;}res.sendFile(resolve('evidence/recorded/opening-2026-11-04.sanitized.json'));});
 app.get('/api/desk',async(req,res)=>{try{const scenario=String(req.query.scenario??'unprotected');if(config.mode==='replay'&&!SCENARIOS.includes(scenario as typeof SCENARIOS[number])){res.status(400).json({error:'INVALID_SCENARIO'});return;}latest=await snapshot(scenario);recordedCapture=null;
  const lifecycleId=journal&&config.owner&&config.pool?journal.currentLifecycle(config.owner,config.pool):null;
  const historical=lifecycleId?journal!.observations(config.owner!,config.pool!,lifecycleId).find(row=>row.kind==='opening')?.snapshot.account?.historicalAuthorization:undefined;
  if(latest.account&&historical)latest.account.historicalAuthorization=historical;
  res.json({snapshot:latest,snapshotId:snapshotId(latest),assessment:assessDesk(latest,journal?.list()??[]),operations:journal?.list()??[],capabilities:{account:latest.account??null,monitoredOwner:config.mode==='replay'?null:config.owner,mode:config.mode,ownerEnabled:config.ownerEnabled,signerAvailable:false,reason:config.mode==='replay'?'Replay fixtures. No live transaction or current chain state.':'Owner signer must be verified in the browser; no server signing key.'}});}catch{res.status(503).json({error:'READ_FAILED',message:'No empty position or protection conclusion was inferred.'});}});
 app.get('/api/evidence',(req,res)=>{
  const expected=req.query.snapshotId;
  if(expected!==undefined&&(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected)||expected!==snapshotId(latest))){res.status(409).json({error:'SNAPSHOT_CHANGED',message:'The displayed snapshot is no longer the current export context. Recheck before downloading.'});return;}

  const lifecycle=journal&&config.owner&&config.pool?exportLifecycle(journal,config.owner,config.pool,typeof req.query.lifecycleId==='string'?req.query.lifecycleId:undefined):null;
  const operations=journal&&config.owner&&config.pool?journal.list().filter(op=>op.owner.toLowerCase()===config.owner!.toLowerCase()&&op.pool.toLowerCase()===config.pool!.toLowerCase()).map(({evidence,...summary})=>summary):[];
  const body={schemaVersion:1,project:'DreamShield',mode:recordedCapture?'replay':config.mode,snapshotId:snapshotId(latest),exportedAt:new Date().toISOString(),snapshot:latest,assessment:latest?assessDesk(latest,recordedCapture?[]:operations,recordedCapture?Date.parse(latest.capturedAt):Date.now()):null,transactions:[],operations:recordedCapture?[]:operations,lifecycle:recordedCapture?null:lifecycle,liveWorkflowVerified:false,...(recordedCapture?{recordedCapture,realSendProof:'NONE'}:{})};
  res.setHeader('Content-Disposition','attachment; filename="dreamshield-evidence.json"');res.json({...body,sha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')});
 });
 app.use('/api',(req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method)){next();return;}if(!config.ownerEnabled||!journal){res.status(403).json({error:'READ_ONLY_INSTANCE'});return;}const origin=req.headers.origin;const expected=`http://${req.headers.host}`;if(origin!==expected||req.headers['x-dreamshield-token']!==token||req.headers['sec-fetch-site']==='cross-site'){res.status(403).json({error:'LOCAL_ORIGIN_AND_TOKEN_REQUIRED'});return;}next();});
 app.post('/api/owner/evidence/capture',async(req,res)=>{try{
  if(!config.owner||!config.pool)throw new Error('CONFIGURED_OWNER_AND_POOL_REQUIRED');
  const {kind,openingTxHash,...assertions}=req.body;
  if(Object.keys(assertions).length||!['opening','missing-sl','gap','residual'].includes(kind))throw new Error('INVALID_CAPTURE_REQUEST');
  if(kind==='opening'?(typeof openingTxHash!=='string'||!/^0x[0-9a-f]{64}$/i.test(openingTxHash)):openingTxHash!==undefined)throw new Error('OPENING_HASH_REQUIRED_ONLY_FOR_OPENING');
  const lifecycleId=kind==='opening'?randomUUID():journal!.currentLifecycle(config.owner,config.pool);
  if(!lifecycleId)throw new Error('OPENING_CAPTURE_REQUIRED');
  const identity=kind==='opening'?undefined:journal!.observations(config.owner,config.pool,lifecycleId).find(row=>row.kind==='opening')?.identity;
  const observation=await captureEvidenceObservation({owner:config.owner,pool:config.pool,kind,openingTxHash,lifecycleId,id:randomUUID(),provenance:captureProvenance(),...(identity?{identity}:{})});
  if(observation.identity.owner.toLowerCase()!==config.owner.toLowerCase()||observation.identity.pool.toLowerCase()!==config.pool.toLowerCase()||observation.lifecycleId!==lifecycleId||observation.kind!==kind)throw new Error('CAPTURE_SCOPE_MISMATCH');
  journal!.recordObservation(observation);latest=observation.snapshot;res.json({observation});
 }catch(error){res.status(409).json({error:error instanceof Error?error.message:'CAPTURE_FAILED'});}});
 app.post('/api/drafts',async(req,res)=>{try{const requestId=String(req.body.requestId??'');if(!/^[0-9a-f-]{36}$/i.test(requestId))throw new Error('REQUEST_ID_REQUIRED');const key=createHash('sha256').update(JSON.stringify({requestId,owner:config.owner,pool:config.pool,action:req.body.action??'create-sl',stopId:req.body.stopId??null,triggerPrice:req.body.triggerPrice??null})).digest('hex');const existing=journal!.list().find(o=>o.idempotencyKey===key);if(existing){res.json({draft:existing.draft,operation:existing});return;}const current=await snapshot('');const draft=req.body.action==='cancel-stop'?createCancelDraft(current,String(req.body.stopId??'')):createSlDraft(current,String(req.body.triggerPrice??''));const operation=journal!.reserve(draft,key);latest=current;res.json({draft,operation});}catch(e){res.status(409).json({error:e instanceof Error?e.message:'DRAFT_REJECTED'});}});
 app.post('/api/owner/safe-plan',async(req,res)=>{try{
  if(config.mode!=='live-owner'||!config.owner||!config.pool||!journal)throw new Error('LOCAL_OWNER_REQUIRED');
  const body=req.body;if(!body||Object.keys(body).some(key=>!['controller','triggerPrice','requestId'].includes(key))||typeof body.controller!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(body.controller)||typeof body.triggerPrice!=='string'||typeof body.requestId!=='string'||! /^[0-9a-f-]{36}$/i.test(body.requestId))throw new Error('INVALID_SAFE_PLAN_REQUEST');
  const owner=config.owner,pool=config.pool;
  const assertUnlocked=()=>{if(journal!.list().some(op=>op.owner.toLowerCase()===owner.toLowerCase()&&!['Applied','Failed','Cancelled'].includes(op.state)))throw new Error('OPERATION_IN_FLIGHT');};
  assertUnlocked();
  const {draft,plan}=await prepareFreshUnsignedSafePlan({owner,pool,controller:body.controller,triggerPrice:body.triggerPrice});
  assertUnlocked();
  if(draft.owner.toLowerCase()!==owner.toLowerCase()||draft.pool.toLowerCase()!==pool.toLowerCase()||draft.action!=='create-sl'||plan.account.toLowerCase()!==owner.toLowerCase()||plan.controller.toLowerCase()!==body.controller.toLowerCase())throw new Error('SAFE_PLAN_SCOPE_MISMATCH');
  if(!Number.isFinite(Date.parse(plan.expiresAt))||Date.now()>=Date.parse(plan.expiresAt)||Date.now()-Date.parse(draft.createdAt)>=15000)throw new Error('SAFE_PLAN_EXPIRED');
  const key=createHash('sha256').update(JSON.stringify({kind:'unsigned-safe-plan',owner,pool,controller:body.controller,triggerPrice:body.triggerPrice,requestId:body.requestId})).digest('hex');
  if(journal.list().some(op=>op.idempotencyKey===key))throw new Error('REQUEST_ALREADY_USED');
  const operation=journal.reserve(draft,key);res.json({operation,plan});
 }catch(error){res.status(409).json({error:error instanceof Error?error.message:'SAFE_PLAN_REJECTED'});}});
 // Unsigned plans never change operation state or invoke a wallet. Scope is journal/config only.
 function unsignedDraft(id:string){
  if(config.mode!=='live-owner'||!config.ownerEnabled||!journal)throw new Error('LOCAL_OWNER_REQUIRED');
  const op=journal.get(id);if(!op)throw new Error('NOT_FOUND');
  if(!config.owner||!config.pool||op.owner.toLowerCase()!==config.owner.toLowerCase()||op.pool.toLowerCase()!==config.pool.toLowerCase()||op.draft.owner.toLowerCase()!==config.owner.toLowerCase()||op.draft.pool.toLowerCase()!==config.pool.toLowerCase())throw new Error('OPERATION_SCOPE_MISMATCH');
  if(op.state!=='Draft'||op.txHash)throw new Error('UNSIGNED_DRAFT_REQUIRED');
  return op;
 }
 app.post('/api/operations/:id/safe-plan',async(req,res)=>{try{
  if(!req.body||Object.keys(req.body).some(key=>key!=='controller')||typeof req.body.controller!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(req.body.controller))throw new Error('EXPLICIT_CONTROLLER_REQUIRED');
  const op=unsignedDraft(String(req.params.id));
  const assertUnlocked=()=>{if(journal!.list().some(other=>other.id!==op.id&&other.owner.toLowerCase()===op.owner.toLowerCase()&&!['Applied','Failed','Cancelled'].includes(other.state)))throw new Error('OPERATION_IN_FLIGHT');};
  assertUnlocked();const plan=await prepareUnsignedSafePlan(op.draft,req.body.controller);
  const current=unsignedDraft(op.id);assertUnlocked();
  if(JSON.stringify(current.draft)!==JSON.stringify(op.draft))throw new Error('DRAFT_CHANGED');
  res.json({operation:current,plan});
 }catch(error){res.status(409).json({error:error instanceof Error?error.message:'SAFE_PLAN_REJECTED'});}});
 app.post('/api/operations/:id/discard-draft',(req,res)=>{try{
  if(!req.body||Object.keys(req.body).length)throw new Error('EMPTY_REQUEST_REQUIRED');
  const op=unsignedDraft(String(req.params.id));
  const operation=journal!.transition(op.id,'Cancelled',undefined,'Owner discarded unsigned draft locally');res.json({operation});
 }catch(error){res.status(409).json({error:error instanceof Error?error.message:'DISCARD_REJECTED'});}});
 app.post('/api/operations/:id/state',(req,res)=>{try{const allowed:OperationState[]=['AwaitingSignature','Submitted','Unknown','Cancelled'];if(!allowed.includes(req.body.state)){res.status(403).json({error:'READBACK_STATE_IS_SERVER_ONLY'});return;}const operation=journal!.transition(String(req.params.id),req.body.state,req.body.txHash,req.body.error);res.json({operation});}catch(e){res.status(409).json({error:e instanceof Error?e.message:'TRANSITION_REJECTED'});}});
 app.post('/api/operations/:id/recover-hash',(req,res)=>{try{
  if(!config.owner||!config.pool||req.body.owner?.toLowerCase()!==config.owner.toLowerCase()||req.body.pool?.toLowerCase()!==config.pool.toLowerCase())throw new Error('CONFIGURED_OWNER_AND_POOL_REQUIRED');
  const operation=journal!.bindRecoveredHash(String(req.params.id),req.body.txHash,config.owner,config.pool);
  res.json({operation});
 }catch(e){res.status(409).json({error:e instanceof Error?e.message:'HASH_RECOVERY_REJECTED'});}});
 app.post('/api/operations/:id/reconcile',async(req,res)=>{try{const op=journal!.get(String(req.params.id));if(!op){res.status(404).json({error:'NOT_FOUND'});return;}if(!config.owner||!config.pool||op.owner.toLowerCase()!==config.owner.toLowerCase()||op.pool.toLowerCase()!==config.pool.toLowerCase())throw new Error('CONFIGURED_OWNER_AND_POOL_REQUIRED');const pending=journal!.transition(op.id,'Reconcile');const result=await reconcileOperation(pending);if(result.snapshot)latest=result.snapshot;const operation=journal!.transition(op.id,result.state,undefined,result.state==='Applied'?undefined:result.reason,{readBackVerified:result.state==='Applied'&&!!result.proof,receiptFailed:result.state==='Failed',evidence:result.proof??undefined,reason:result.reason});res.json({operation,snapshot:result.snapshot,reconciliationReason:result.reason});}catch(e){res.status(409).json({error:e instanceof Error?e.message:'RECONCILE_REJECTED'});}});
 const web=resolve('dist/web');if(existsSync(web)){app.use(express.static(web));app.get('/{*path}',(_req,res)=>res.sendFile(join(web,'index.html')));}
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({error:err instanceof SyntaxError?'INVALID_JSON':'REQUEST_REJECTED'});});
 return {app,close:()=>journal?.close()};
}
