import express from 'express';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import type { Config } from './config.js';
import {Journal} from '../../packages/storage/index.js';
import {createSlDraft,createCancelDraft} from '../../packages/domain/index.js';
import {assessDesk} from '../../packages/domain/desk.js';
import {readLiveSnapshot,reconcileOperation,captureEvidenceObservation} from '../../packages/protocol/index.js';
import {fixture,SCENARIOS} from '../../fixtures/scenarios.js';
import type {Snapshot,OperationState} from '../../packages/domain/types.js';
import {captureProvenance,exportLifecycle} from './evidence.js';
export function createApp(config:Config){
 const app=express();const token=randomBytes(32).toString('hex');let latest:Snapshot|null=null;
 let journal:Journal|null=null;if(config.ownerEnabled){mkdirSync(config.dataDir,{recursive:true});journal=new Journal(join(config.dataDir,'dreamshield.sqlite'));journal.recover();}
 app.disable('x-powered-by');app.use(express.json({limit:'64kb'}));
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');if(config.ownerEnabled&&!['127.0.0.1','localhost','[::1]'].includes((req.headers.host??'').replace(/:\d+$/,''))){res.status(403).json({error:'LOCAL_HOST_REQUIRED'});return;}next();});
 app.get('/healthz',(_req,res)=>res.json({status:'alive',mode:config.mode}));
 app.get('/readyz',(_req,res)=>{const ok=config.mode==='replay'||!!latest&&assessDesk(latest,journal?.list()??[]).verdict!=='UNKNOWN';res.status(ok?200:503).json({ready:ok,mode:config.mode,chainRead:latest?.capturedAt??null});});
 app.get('/api/config',(_req,res)=>res.json({mode:config.mode,ownerEnabled:config.ownerEnabled,csrfToken:config.ownerEnabled?token:null,chainId:50383}));
 async function snapshot(scenario:string):Promise<Snapshot>{if(config.mode==='replay')return fixture(scenario);const value=await readLiveSnapshot({owner:config.owner,pool:config.pool});return {...value,mode:config.mode};}
 app.get('/api/desk',async(req,res)=>{try{const scenario=String(req.query.scenario??'unprotected');if(config.mode==='replay'&&!SCENARIOS.includes(scenario as typeof SCENARIOS[number])){res.status(400).json({error:'INVALID_SCENARIO'});return;}latest=await snapshot(scenario);res.json({snapshot:latest,assessment:assessDesk(latest,journal?.list()??[]),operations:journal?.list()??[],capabilities:{mode:config.mode,ownerEnabled:config.ownerEnabled,signerAvailable:false,reason:config.mode==='replay'?'Replay fixtures. No live transaction or current chain state.':'Owner signer must be verified in the browser; no server signing key.'}});}catch{res.status(503).json({error:'READ_FAILED',message:'No empty position or protection conclusion was inferred.'});}});
 app.get('/api/evidence',(req,res)=>{
  const lifecycle=journal&&config.owner&&config.pool?exportLifecycle(journal,config.owner,config.pool,typeof req.query.lifecycleId==='string'?req.query.lifecycleId:undefined):null;
  const operations=journal&&config.owner&&config.pool?journal.list().filter(op=>op.owner.toLowerCase()===config.owner!.toLowerCase()&&op.pool.toLowerCase()===config.pool!.toLowerCase()).map(({evidence,...summary})=>summary):[];
  const body={schemaVersion:1,project:'DreamShield',mode:config.mode,exportedAt:new Date().toISOString(),snapshot:latest,assessment:latest?assessDesk(latest,operations):null,transactions:[],operations,lifecycle,liveWorkflowVerified:false};
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
  const observation=await captureEvidenceObservation({owner:config.owner,pool:config.pool,kind,openingTxHash,lifecycleId,id:randomUUID(),provenance:captureProvenance()});
  if(observation.identity.owner.toLowerCase()!==config.owner.toLowerCase()||observation.identity.pool.toLowerCase()!==config.pool.toLowerCase()||observation.lifecycleId!==lifecycleId||observation.kind!==kind)throw new Error('CAPTURE_SCOPE_MISMATCH');
  journal!.recordObservation(observation);latest=observation.snapshot;res.json({observation});
 }catch(error){res.status(409).json({error:error instanceof Error?error.message:'CAPTURE_FAILED'});}});
 app.post('/api/drafts',async(req,res)=>{try{const requestId=String(req.body.requestId??'');if(!/^[0-9a-f-]{36}$/i.test(requestId))throw new Error('REQUEST_ID_REQUIRED');const key=createHash('sha256').update(JSON.stringify({requestId,owner:config.owner,pool:config.pool,action:req.body.action??'create-sl',stopId:req.body.stopId??null,triggerPrice:req.body.triggerPrice??null})).digest('hex');const existing=journal!.list().find(o=>o.idempotencyKey===key);if(existing){res.json({draft:existing.draft,operation:existing});return;}const current=await snapshot('');const draft=req.body.action==='cancel-stop'?createCancelDraft(current,String(req.body.stopId??'')):createSlDraft(current,String(req.body.triggerPrice??''));const operation=journal!.reserve(draft,key);latest=current;res.json({draft,operation});}catch(e){res.status(409).json({error:e instanceof Error?e.message:'DRAFT_REJECTED'});}});
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
