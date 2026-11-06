import {existsSync,mkdirSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Journal} from '../packages/storage/index.ts';
import {createSlDraft} from '../packages/domain/index.ts';
import {assessDesk} from '../packages/domain/desk.ts';
import {checkedAddress,readLiveSnapshot,reconcileOperation} from '../packages/protocol/index.ts';
import {assertCreate,canonical,fail,hash,prepareLocalPlan,sendLocalPlan,type LocalPlan} from '../packages/protocol/local-signer.ts';
// SDK diagnostics must never forward upstream messages/causes. Output is exclusively the safe JSON projection below.
for(const method of ['log','info','warn','error','debug','trace'] as const)console[method]=()=>{};
const refused=['INVALID_ARGUMENTS','INVALID_ADDRESS','UNSUPPORTED_DRAFT','UNSIGNED_DRAFT_REQUIRED','OPERATION_IN_FLIGHT','IDEMPOTENCY_CONFLICT','LOCAL_LOCKED','NOT_FOUND','PLAN_MISSING','PLAN_CONFLICT','CALL_MISMATCH','SL_RISK_REFUSED','OPERATOR_APPROVAL_REQUIRED','SMART_ACCOUNT_NOT_SUPPORTED','STOP_DEPOSIT_CHANGED','REGISTRY_POOL_MISMATCH','TRIGGER_NOT_ON_TICK','TRIGGER_ALREADY_MET','EXISTING_SL_REQUIRES_REVIEW','SNAPSHOT_CHANGED'];
const notReady=['EXECUTION_NOT_READY','CONFIRMATION_MISMATCH','CREDENTIAL_NOT_READY','CREDENTIAL_OWNER_MISMATCH','POLICY_INVALID','POLICY_HASH_MISMATCH','POLICY_SCOPE_MISMATCH','POLICY_EXPIRED','POLICY_CAP_EXCEEDED','POLICY_CHANGED'];
const failed=['SOURCE_CHANGED','NONCE_CHANGED','NONCE_INVALID','SIMULATION_FAILED','INSUFFICIENT_BALANCE','PLAN_CHANGED','READ_FAILED','PREPARATION_FAILED','JOURNAL_FAILED','RECONCILIATION_UNKNOWN','SUBMISSION_UNKNOWN','JOURNAL_UNCERTAIN'];
let stage='PREPARATION_FAILED';
async function main(){
 const [command,...args]=process.argv.slice(2);const allowed:Record<string,string[]>={inspect:['owner','pool'],plan:['owner','pool','trigger'],prepare:['owner','pool','trigger','request-id'],send:['operation','confirm'],reconcile:['operation']};
 if(!command||!Object.hasOwn(allowed,command)||args.length%2)fail('INVALID_ARGUMENTS');const options:Record<string,string>={};
 for(let n=0;n<args.length;n+=2){const k=args[n].slice(2),v=args[n+1];if(!args[n].startsWith('--')||!allowed[command].includes(k)||Object.hasOwn(options,k)||!v||v.startsWith('--'))fail('INVALID_ARGUMENTS');options[k]=v;}
 if(allowed[command].some(k=>!options[k]))fail('INVALID_ARGUMENTS');
 if(options.operation&&! /^[0-9a-f-]{36}$/i.test(options.operation)||options['request-id']&&! /^[0-9a-f-]{36}$/i.test(options['request-id'])||options.confirm&&! /^[a-f0-9]{64}$/.test(options.confirm))fail('INVALID_ARGUMENTS');
 const dir=resolve(process.env.DREAMSHIELD_LOCAL_STOP_DIR??'.dreamshield-local-stop'),dbPath=join(dir,'journal.sqlite'),mutating=['prepare','send','reconcile'].includes(command);
 let lock:number|undefined,journal:Journal|undefined,db:DatabaseSync|undefined;
 try{
  if(mutating){mkdirSync(dir,{recursive:true,mode:0o700});try{lock=openSync(join(dir,'invocation.lock'),'wx',0o600);}catch{fail('LOCAL_LOCKED');}journal=new Journal(dbPath);journal.recover();}
  if(existsSync(dbPath))db=new DatabaseSync(dbPath,{readOnly:true});
  const plans=():LocalPlan[]=>db?db.prepare("SELECT body FROM events WHERE id LIKE 'local-plan:%'").all().map(r=>JSON.parse(String(r.body))):[];
  const load=(id:string)=>{const plan=plans().find(p=>p.operationId===id);if(!plan)fail('PLAN_MISSING');const {digest,...terms}=plan;if(digest!==hash(canonical(terms)))fail('PLAN_CONFLICT');assertCreate(plan.draft);return plan;};
  if(command==='send'||command==='reconcile'){
   const op=journal!.get(options.operation);if(!op)fail('NOT_FOUND');assertCreate(op.draft);const plan=load(op.id);if(canonical(op.draft)!==canonical(plan.draft))fail('PLAN_CONFLICT');
   if(command==='send'){stage='SIMULATION_FAILED';return await sendLocalPlan(plan,options.confirm,journal!);}
   stage='RECONCILIATION_UNKNOWN';if(!['Submitted','Unknown','NeedsReview'].includes(op.state))fail('UNSIGNED_DRAFT_REQUIRED');
   if(!op.txHash)return {operation:op.id,state:op.state,error:'RECONCILIATION_UNKNOWN'};
   const pending=journal!.transition(op.id,'Reconcile'),result=await reconcileOperation(pending),reason=result.state==='Applied'?'CANONICAL_READBACK_VERIFIED':'RECONCILIATION_UNKNOWN';
   if(result.proof&&(result.proof.snapshot.account?.code!=='empty'||result.proof.snapshot.readError||result.proof.snapshot.readonlyWarmup?.length)){journal!.transition(op.id,'Unknown',undefined,'RECONCILIATION_UNKNOWN');return {operation:op.id,state:'Unknown',error:'RECONCILIATION_UNKNOWN'};}
   const next=journal!.transition(op.id,result.state,undefined,result.state==='Applied'?undefined:reason,{readBackVerified:result.state==='Applied'&&!!result.proof,receiptFailed:result.state==='Failed',evidence:result.proof??undefined,reason});
   if(next.state==='Unknown')process.exitCode=1;return {operation:next.id,state:next.state,txHash:next.txHash,reason,proofPersisted:!!result.proof};
  }
  const owner=checkedAddress(options.owner),pool=checkedAddress(options.pool);stage='READ_FAILED';
  const operations=db?db.prepare('SELECT body FROM operations').all().map(r=>JSON.parse(String(r.body))).filter(o=>o.owner.toLowerCase()===owner.toLowerCase()&&o.pool.toLowerCase()===pool.toLowerCase()):[];
  const key=hash(JSON.stringify({requestId:options['request-id'],owner,pool,action:'create-sl',stopId:null,triggerPrice:options.trigger}));
  if(command==='prepare'){
   const previous=plans().find(p=>p.requestId===options['request-id']&&p.draft.owner===owner&&p.draft.pool===pool);
   if(previous){const saved=load(previous.operationId!);if(saved.digest!==previous.digest)fail('PLAN_CONFLICT');const op=journal!.get(saved.operationId!);if(!op||op.state!=='Draft'||op.txHash)fail('UNSIGNED_DRAFT_REQUIRED');
    if(op.idempotencyKey!==key)fail('IDEMPOTENCY_CONFLICT');return {operation:op.id,state:op.state,plan:saved,idempotent:true};}
  }
  const snapshot=await readLiveSnapshot({owner,pool}),assessment=assessDesk(snapshot,operations);
  if(command==='inspect'){if(assessment.verdict==='UNKNOWN')process.exitCode=1;return {owner,pool,complete:snapshot.complete,verdict:assessment.verdict,reasonCodes:assessment.reasonCodes,block:snapshot.market?.observedBlock??null,expiresAt:assessment.expiresAt,operations:operations.map(o=>({id:o.id,state:o.state,txHash:o.txHash}))};}
  if(!snapshot.complete||assessment.verdict==='UNKNOWN')fail('READ_FAILED');stage='PREPARATION_FAILED';const draft=createSlDraft(snapshot,options.trigger);
  let plan=await prepareLocalPlan(draft,snapshot,options['request-id']??null);
  if(command==='prepare'){
   stage='JOURNAL_FAILED';const op=journal!.reserve(draft,key);
   const {digest:_digest,...terms}=plan;const bound={...terms,operationId:op.id};plan={...bound,digest:hash(canonical(bound))};
   if(!journal!.recordEvent(`local-plan:${op.id}`,plan)){if(canonical(load(op.id))!==canonical(plan))fail('PLAN_CONFLICT');}return {operation:op.id,state:op.state,plan};
  }
  return {plan};
 }finally{db?.close();journal?.close();if(lock!==undefined){closeSync(lock);unlinkSync(join(dir,'invocation.lock'));}}
}
try{const result=await main();if(result&&'error' in result)process.exitCode=1;process.stdout.write(JSON.stringify({scope:'local-eoa-testnet',realG1:'NOT_RUN',...result})+'\n');}
catch(e){const message=e instanceof Error?e.message:'',code=[...refused,...notReady,...failed].includes(message)?message:stage;process.exitCode=refused.includes(code)?3:notReady.includes(code)?2:1;process.stdout.write(JSON.stringify({scope:'local-eoa-testnet',realG1:'NOT_RUN',error:code})+'\n');}
