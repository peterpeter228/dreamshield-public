import {createHash} from 'node:crypto';
import {constants,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {createWalletClient,custom,http,toHex,type Hex,type PublicClient} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {PLACE_ORDER_FOR_SELECTOR} from '@somnia-chain/markets-sdk';
import {chain,NETWORK,httpClient,checkedAddress,prepareStopCall,expectedDraftCall,readLiveSnapshot} from './index.ts';
import {operatorReadAbi} from './sdk-abi.ts';
import {validateDraft,assessProtection,FRESHNESS_MS} from '../domain/index.ts';
import {assessStopRisk} from '../domain/stop-risk.ts';
import type {RepairDraft,Snapshot} from '../domain/types.ts';
import type {Journal} from '../storage/index.ts';
const keys=['version','taskId','authorizationId','action','accountKind','credentialVariable','chainId','genesisHash','owner','pool','registry','operatorSelector','validFrom','expiresAt','maxGas','maxFeePerGasCap','maxPriorityFeePerGasCap','maxValue','maxTotalCost'] as const;
export type Policy=Readonly<Record<typeof keys[number],string|number>>;
export type Binding=Readonly<{policy:Policy;hash:string;authorizationId:string}>;
export type Envelope=Readonly<{nonce:string;gas:string;maxFeePerGas:string;maxPriorityFeePerGas:string;type:'eip1559'}>;
export type LocalPlan=Readonly<{version:1;action:'create-sl';operationId:string|null;requestId:string|null;draft:RepairDraft;sourceHash:string;genesisHash:string;expiresAt:number;to:Hex;data:Hex;value:string;binding:Binding|null;envelope:Envelope|null;executionReady:boolean;blockers:string[];digest:string}>;
export function fail(code:string):never {throw new Error(code);}
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v);
const same=(a:unknown,b:unknown)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
export function canonical(v:unknown):string {return JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);}
export const hash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
function freeze<T>(v:T):T {if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function policyScope(p:Policy,d:RepairDraft,genesis:string){
 if(p.version!==1||p.taskId!=='dreamdex-wallet-g1-20261105'||p.action!=='create-sl'||p.accountKind!=='eoa'||p.credentialVariable!=='DREAMSHIELD_G1_PRIVATE_KEY'||p.chainId!==50383||!same(p.genesisHash,genesis)||!same(p.owner,d.owner)||!same(p.pool,d.pool)||!same(p.registry,d.registry)||p.operatorSelector!==PLACE_ORDER_FOR_SELECTOR)fail('POLICY_SCOPE_MISMATCH');
 const now=BigInt(Math.floor(Date.now()/1000));if(BigInt(p.validFrom)>=BigInt(p.expiresAt)||now<BigInt(p.validFrom)||now>=BigInt(p.expiresAt))fail('POLICY_EXPIRED');
}
/** Only the already-authorized native launcher may supply this nonsecret binding. */
export function readJobPolicy(d:RepairDraft,genesis:string):Binding|null {
 const path=process.env.DREAMSHIELD_G1_POLICY_PATH,pin=process.env.DREAMSHIELD_G1_POLICY_SHA256,id=process.env.DREAMSHIELD_G1_AUTHORIZATION_ID;
 if(!path||!pin||!id)return null;
 let fd:number|undefined;
 try{
  if(!isAbsolute(path)||! /^[a-f0-9]{64}$/.test(pin)||! /^[A-Za-z0-9_.:-]{1,128}$/.test(id))fail('POLICY_INVALID');
  fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const stat=fstatSync(fd);if(!stat.isFile()||stat.size>16384)fail('POLICY_INVALID');
  const bytes=Buffer.alloc(16385);let n=0,r=0;while((r=readSync(fd,bytes,n,bytes.length-n,null))>0){n+=r;if(n>16384)fail('POLICY_INVALID');}
  const bounded=bytes.subarray(0,n);if(hash(bounded)!==pin)fail('POLICY_HASH_MISMATCH');const text=new TextDecoder('utf-8',{fatal:true}).decode(bounded);
  // Flat schema: count decoded property tokens as well as parsed keys, rejecting duplicates (including escaped names).
  const tokens=[...text.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map(m=>JSON.parse(`"${m[1]}"`));
  const p=JSON.parse(text);if(!p||Array.isArray(p)||Object.keys(p).length!==keys.length||tokens.length!==keys.length||new Set(tokens).size!==keys.length||keys.some(k=>!Object.hasOwn(p,k))||Object.keys(p).some(k=>!keys.includes(k as never)))fail('POLICY_INVALID');
  for(const k of ['validFrom','expiresAt','maxGas','maxFeePerGasCap','maxPriorityFeePerGasCap','maxValue','maxTotalCost'])if(!uint(p[k]))fail('POLICY_INVALID');
  if(['maxGas','maxFeePerGasCap','maxTotalCost'].some(k=>BigInt(p[k])<=0n)||BigInt(p.maxPriorityFeePerGasCap)>BigInt(p.maxFeePerGasCap))fail('POLICY_INVALID');
  for(const k of ['owner','pool','registry'])p[k]=checkedAddress(p[k]);if(! /^0x[0-9a-fA-F]{64}$/.test(p.genesisHash)||p.authorizationId!==id)fail('POLICY_SCOPE_MISMATCH');
  policyScope(p,d,genesis);return freeze({policy:p,hash:pin,authorizationId:id});
 }catch(e){if(e instanceof Error&&['POLICY_HASH_MISMATCH','POLICY_SCOPE_MISMATCH','POLICY_EXPIRED'].includes(e.message))throw e;return fail('POLICY_INVALID');}finally{if(fd!==undefined)closeSync(fd);}
}
export function createBuildWallet(owner:Hex){return createWalletClient({account:checkedAddress(owner),chain,transport:custom({request:async()=>fail('BUILD_ONLY_TRANSPORT_DENIED')},{retryCount:0})});}
export function assertCreate(d:RepairDraft){if(d.action!=='create-sl'||d.intent!=='reduceOnly'||d.quantity!=='0'||d.stopId!==null||d.chainId!==50383)fail('UNSUPPORTED_DRAFT');}
const rpcNonce=(n:number)=>{if(!Number.isSafeInteger(n)||n<0)fail('NONCE_INVALID');return BigInt(n);};
function caps(p:Policy,e:Envelope,value:bigint){
 const gas=BigInt(e.gas),fee=BigInt(e.maxFeePerGas),priority=BigInt(e.maxPriorityFeePerGas);
 if(gas<=0n||fee<=0n||priority<0n||priority>fee||gas>BigInt(p.maxGas)||fee>BigInt(p.maxFeePerGasCap)||priority>BigInt(p.maxPriorityFeePerGasCap)||value>BigInt(p.maxValue)||value+gas*fee>BigInt(p.maxTotalCost))fail('POLICY_CAP_EXCEEDED');
 return value+gas*fee;
}
async function wire(rpc:PublicClient,d:RepairDraft,call:{to:Hex;data:Hex;value:string},e:Envelope,simulate:boolean){
 const tx={from:checkedAddress(d.owner),to:call.to,data:call.data,value:toHex(BigInt(call.value)),nonce:toHex(BigInt(e.nonce)),gas:toHex(BigInt(e.gas)),maxFeePerGas:toHex(BigInt(e.maxFeePerGas)),maxPriorityFeePerGas:toHex(BigInt(e.maxPriorityFeePerGas)),type:'0x2' as const};
 const block=toHex(BigInt(d.observedBlock!));
 if(simulate){const data=await rpc.request({method:'eth_call',params:[tx,block]});if(typeof data!=='string'||! /^0x(?:[a-fA-F0-9]{2})*$/.test(data))fail('SIMULATION_FAILED');}
 const estimate=await rpc.request({method:'eth_estimateGas',params:[tx,block]});if(typeof estimate!=='string'||! /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(estimate)||BigInt(estimate)<=0n||BigInt(estimate)>BigInt(e.gas))fail('SIMULATION_FAILED');return BigInt(estimate);
}
async function context(rpc:PublicClient,d:RepairDraft,sourceHash:string,genesisHash:string,expiresAt:number,nonce?:string){
 if(Date.now()>=expiresAt||await rpc.getChainId()!==50383||(await rpc.getBlock({blockNumber:1n})).hash!==genesisHash||(await rpc.getBlock({blockNumber:BigInt(d.observedBlock!)})).hash!==sourceHash)fail('SOURCE_CHANGED');
 if(nonce!==undefined&&rpcNonce(await rpc.getTransactionCount({address:checkedAddress(d.owner),blockTag:'pending'}))!==BigInt(nonce))fail('NONCE_CHANGED');
 if(Date.now()>=expiresAt)fail('SOURCE_CHANGED');
}
async function verifiedCall(d:RepairDraft,s:Snapshot,rpc:PublicClient){
 assertCreate(d);const original:Snapshot=JSON.parse(d.fingerprint.slice('snapshot-v1:'.length));validateDraft(d,original);
 // Only capture time is observational; every authoritative/source field remains exact.
 const {capturedAt:originalTime,...source}=original,{capturedAt:freshTime,...current}=s;
 if(assessProtection(s).verdict!=='NEEDS_PROTECTION'||!Number.isFinite(Date.parse(freshTime))||Date.parse(freshTime)<Date.parse(originalTime)||canonical(source)!==canonical(current))fail('SNAPSHOT_CHANGED');
 const risk=assessStopRisk({...s,stops:[{id:'0',owner:d.owner,pool:d.pool,registry:d.registry,intent:'reduceOnly',isBid:d.isBid,quantity:d.quantity,triggerPrice:d.triggerPrice,triggerOperator:d.triggerOperator,stopOrderType:1,limitPrice:'0',status:'pending',siblingId:null,observedBlock:d.observedBlock!}]});if(risk?.quality!=='SENSIBLE')fail('SL_RISK_REFUSED');
 const owner=checkedAddress(d.owner),pool=checkedAddress(d.pool),registry=checkedAddress(d.registry);
 if(s.account?.code!=='empty'||await rpc.request({method:'eth_getCode',params:[owner,'latest']})!=='0x')fail('SMART_ACCOUNT_NOT_SUPPORTED');
 if(!await rpc.readContract({address:pool,abi:operatorReadAbi,functionName:'isOperatorAuthorized',args:[owner,registry,PLACE_ORDER_FOR_SELECTOR]}))fail('OPERATOR_APPROVAL_REQUIRED');
 const built=await prepareStopCall(d,owner,rpc,createBuildWallet(owner),true);const expected=expectedDraftCall(d);
 if(built.approvalRequired||!same(built.call.to,d.registry)||built.call.data!==expected.data||built.call.value!==expected.value)fail('CALL_MISMATCH');
 return {to:registry,data:expected.data,value:expected.value.toString()};
}
export async function prepareLocalPlan(d:RepairDraft,s:Snapshot,requestId:string|null,operationId:string|null=null):Promise<LocalPlan>{
 const rpc=httpClient(),owner=checkedAddress(d.owner),call=await verifiedCall(d,s,rpc);
 const sourceHash=s.market!.blockHash!,genesisHash=s.market!.genesisHash!;if(! /^0x[0-9a-fA-F]{64}$/.test(sourceHash)||! /^0x[0-9a-fA-F]{64}$/.test(genesisHash))fail('SOURCE_CHANGED');
 const binding=readJobPolicy(d,genesisHash);let expiresAt=Math.min(Date.parse(d.createdAt),Date.parse(s.market!.observedAt),Date.parse(s.capturedAt))+FRESHNESS_MS;let envelope:Envelope|null=null;
 const value=BigInt(call.value);
 if(binding){
  const p=binding.policy;expiresAt=Math.min(expiresAt,Number(BigInt(p.expiresAt)*1000n));await context(rpc,d,sourceHash,genesisHash,expiresAt);
  const nonce=rpcNonce(await rpc.getTransactionCount({address:owner,blockTag:'pending'}));const fees=await rpc.estimateFeesPerGas({type:'eip1559'});
  if(typeof fees.maxFeePerGas!=='bigint'||typeof fees.maxPriorityFeePerGas!=='bigint')fail('SIMULATION_FAILED');
  const ceiling:Envelope={nonce:nonce.toString(),gas:String(p.maxGas),maxFeePerGas:fees.maxFeePerGas.toString(),maxPriorityFeePerGas:fees.maxPriorityFeePerGas.toString(),type:'eip1559'};
  // Check fees/value independently; total cost uses the selected estimate, not the ceiling.
  caps({...p,maxTotalCost:(BigInt(p.maxValue)+BigInt(p.maxGas)*BigInt(p.maxFeePerGasCap)).toString()},ceiling,value);
  envelope={...ceiling,gas:(await wire(rpc,d,call,ceiling,false)).toString()};const total=caps(p,envelope,value);
  if(await rpc.getBalance({address:owner,blockNumber:BigInt(d.observedBlock!)})<total)fail('INSUFFICIENT_BALANCE');
  await wire(rpc,d,call,envelope,true);await context(rpc,d,sourceHash,genesisHash,expiresAt,envelope.nonce);policyScope(p,d,genesisHash);
 }
 const terms={version:1 as const,action:'create-sl' as const,operationId,requestId,draft:d,sourceHash,genesisHash,expiresAt,...call,binding,envelope,executionReady:!!envelope,blockers:binding?[]:['POLICY_BINDING_MISSING']};
 return freeze({...terms,digest:hash(canonical(terms))});
}
export async function sendLocalPlan(plan:LocalPlan,confirm:string,journal:Journal){
 freeze(plan);
 const {digest,...terms}=plan;assertCreate(plan.draft);if(digest!==confirm||digest!==hash(canonical(terms)))fail('CONFIRMATION_MISMATCH');
 if(!plan.executionReady||!plan.binding||!plan.envelope||!plan.operationId)fail('EXECUTION_NOT_READY');
 const op=journal.get(plan.operationId);if(!op||op.state!=='Draft'||op.txHash||canonical(op.draft)!==canonical(plan.draft))fail('UNSIGNED_DRAFT_REQUIRED');
 const binding=readJobPolicy(plan.draft,plan.genesisHash);if(canonical(binding)!==canonical(plan.binding))fail('POLICY_CHANGED');
 const rpc=httpClient(),e=plan.envelope,fresh=await readLiveSnapshot({owner:op.owner,pool:op.pool});const call=await verifiedCall(op.draft,fresh,rpc);
 if(call.to!==plan.to||call.data!==plan.data||call.value!==plan.value||fresh.market?.blockHash!==plan.sourceHash||fresh.market?.genesisHash!==plan.genesisHash)fail('PLAN_CHANGED');
 if(await rpc.getBalance({address:checkedAddress(op.owner),blockNumber:BigInt(op.draft.observedBlock!)})<caps(binding!.policy,e,BigInt(plan.value)))fail('INSUFFICIENT_BALANCE');
 await context(rpc,op.draft,plan.sourceHash,plan.genesisHash,plan.expiresAt,e.nonce);await wire(rpc,op.draft,plan,e,true);await context(rpc,op.draft,plan.sourceHash,plan.genesisHash,plan.expiresAt,e.nonce);policyScope(binding!.policy,op.draft,plan.genesisHash);
 assertCreate(op.draft);const nonce=Number(BigInt(e.nonce));rpcNonce(nonce);
 if(Date.now()>=plan.expiresAt)fail('SOURCE_CHANGED');
 const key=process.env.DREAMSHIELD_G1_PRIVATE_KEY;if(!key||! /^0x[0-9a-fA-F]{64}$/.test(key))fail('CREDENTIAL_NOT_READY');
 let account;try{account=privateKeyToAccount(key as Hex);}catch{return fail('CREDENTIAL_NOT_READY');}if(!same(account.address,op.owner))fail('CREDENTIAL_OWNER_MISMATCH');
 journal.transition(op.id,'AwaitingSignature');let txHash:Hex|undefined;
 try{const wallet=createWalletClient({account,chain,transport:http(NETWORK.http,{retryCount:0})});const submitted=await wallet.sendTransaction({account,chain,type:'eip1559',to:plan.to,data:plan.data,value:BigInt(plan.value),nonce,gas:BigInt(e.gas),maxFeePerGas:BigInt(e.maxFeePerGas),maxPriorityFeePerGas:BigInt(e.maxPriorityFeePerGas)});if(! /^0x[0-9a-fA-F]{64}$/.test(submitted))fail('SUBMISSION_UNKNOWN');txHash=submitted;journal.transition(op.id,'Submitted',txHash);return {state:'Submitted',txHash};}
 catch{try{journal.transition(op.id,'Unknown',txHash,'SUBMISSION_UNKNOWN');}catch{return {state:'Unknown',txHash,error:'JOURNAL_UNCERTAIN'};}return {state:'Unknown',txHash,error:'SUBMISSION_UNKNOWN'};}
}
