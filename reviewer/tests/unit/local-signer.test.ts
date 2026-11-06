import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {Journal} from '../../packages/storage/index.ts';
import {createBuildWallet} from '../../packages/protocol/local-signer.ts';
import type {RepairDraft} from '../../packages/domain/types.ts';

// Test-only loader: only public transport/discovery are replaced. Installed SDK
// construction, trader, unsigned encoder, canonical drafts and Journal remain real.
const preload=String.raw`
import {registerHooks,syncBuiltinESMExports} from 'node:module';
import {writeFileSync,readFileSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';
const denied=()=>{throw Error('OFFLINE_SENTINEL_RAW_CAUSE');},networkDenied=(...args)=>{if(globalThis.__offline?.armed)audit.networkRequests++;else audit.bootstrapDenied++;denied();};
globalThis.fetch=networkDenied;globalThis.WebSocket=class {constructor(){networkDenied();}};
net.connect=networkDenied;net.createConnection=networkDenied;tls.connect=networkDenied;http.request=networkDenied;https.request=networkDenied;http.get=networkDenied;https.get=networkDenied;syncBuiltinESMExports();
const env=process.env,mode=env.OFFLINE_MODE??'',audit={keyReads:0,walletRequests:0,networkRequests:0,bootstrapDenied:0,credentialTrapArmed:false,simulations:[],closes:0,preCredentialStops:0,deadlineAdvances:0};
process.env=new Proxy(env,{get(target,k){if(k==='DREAMSHIELD_G1_PRIVATE_KEY'&&globalThis.__offline?.armed){audit.keyReads++;throw Error('OFFLINE_SENTINEL_KEY_ACCESS');}return target[k];}});
process.on('exit',()=>writeFileSync(env.OFFLINE_AUDIT,JSON.stringify(audit)));
let clock=1793836800000+(mode.startsWith('later-')?1000:0);const OriginalDate=Date;globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
const owner='0x1111111111111111111111111111111111111111',pool='0x2222222222222222222222222222222222222222',registry='0x3333333333333333333333333333333333333333',other='0x4444444444444444444444444444444444444444',hash='0x'+'c'.repeat(64);
const stored={orderWithTrigger:{order:{owner,isBid:false,quantity:0n,userData:0n},orderType:1,triggerPrice:190n,triggerOperator:1,limitPrice:0n},orderId:1n,somiPaid:15n,siblingOrderId:0n,intent:0};
const {encodeEventTopics,encodeAbiParameters,parseAbi,parseAbiParameters,decodeFunctionData,encodeFunctionResult,toHex}=await import(new URL('./node_modules/viem/_esm/index.js','file://'+env.OFFLINE_ROOT+'/'));
const abiModule=await import(new URL('./packages/protocol/sdk-abi.ts','file://'+env.OFFLINE_ROOT+'/')),readAbi=['poolReadAbi','bankReadAbi','stopReadAbi','factoryReadAbi','tokenReadAbi','operatorReadAbi'].flatMap(k=>abiModule[k]);
const receiptMode=['receipt','recovered','receipt-error'].includes(mode),saved=receiptMode?JSON.parse(readFileSync(env.OFFLINE_SAVED_PLAN,'utf8')):null,txHash='0x'+'a'.repeat(64);
const eventAbi=parseAbi(['event PendingOrderCreated(uint128 indexed orderId,address indexed owner,bool isBid,uint256 quantity,uint256 triggerPrice,uint8 triggerOperator,uint8 orderType,address builder,uint96 builderFeeBpsTimes1k)']);
const log={address:registry,data:encodeAbiParameters(parseAbiParameters('bool,uint256,uint256,uint8,uint8,address,uint96'),[false,0n,190n,1,1,'0x0000000000000000000000000000000000000000',0n]),topics:encodeEventTopics({abi:eventAbi,eventName:'PendingOrderCreated',args:{orderId:1n,owner}}),logIndex:0,blockNumber:101n,blockHash:hash,transactionHash:txHash,transactionIndex:0,removed:false};
let estimateCount=0,nonceCount=0,paymentCount=0;
const rpc={
 getChainId:async()=>mode==='chain'?1:50383,
 getBlock:async args=>({number:args?.blockNumber??(receiptMode?102n:100n),hash:(mode==='noncanonical'||mode==='later-source')&&args?.blockNumber===100n?'0x'+'d'.repeat(64):hash,timestamp:1793836800n+(receiptMode?1n:0n)-(mode==='stale'?20n:0n)}),
 getCode:async({address})=>address.toLowerCase()===owner?(mode==='safe'?'0x01':'0x'):'0x01',
 getLogs:async()=>[],getTransactionCount:async()=>{nonceCount++;if(audit.simulations.some(s=>s.method==='eth_call')){if(mode==='later-boundary'){audit.preCredentialStops++;denied();}if(mode==='delayed-final'){await Promise.resolve();clock=1793836815000;audit.deadlineAdvances++;}}return mode==='unsafe-nonce'?9007199254740992:mode==='nonce'&&nonceCount>1?8:7;},
 // Fees are selected by the installed viem action from fixture baseFee/priority RPC responses.
 getBalance:async()=>mode==='balance'?1n:100000000n,
 getTransactionReceipt:async()=>{if(mode==='receipt-error')denied();return {transactionHash:txHash,status:'success',from:owner,to:registry,blockNumber:101n,blockHash:hash,logs:[log]};},
 getTransaction:async()=>({hash:txHash,from:owner,to:registry,blockNumber:101n,blockHash:hash,input:saved.data,value:BigInt(saved.value),chainId:50383}),
 readContract:async({functionName})=>{if(mode==='read')denied();switch(functionName){
 case 'getSystemConfig':return {fullyWired:true,perpPoolFactory:'0xE631fAEE547baeE07353E290f0562ea67d856560',collateralToken:'0xed7993A74dAe1e6656B704A424DcD8711aAf4F72'};
 case 'getPerpPoolStatuses':return [{perpPool:pool,baseToken:other}];case 'marginBank':return '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';case 'isPerpPoolRegistered':return true;
 case 'getStopOrderRegistry':return registry;case 'getOrderBookParameters':return {tickSize:1n,lotSize:1n,minQuantity:1n};case 'decimals':return mode==='decimal'?1:0;case 'symbol':return 'TEST';case 'tryGetMarkPrice':return [true,mode==='decimal'?2000n:mode==='later-mark'?201n:200n];
 case 'somiPaymentPerOrder':return mode==='deposit'&&paymentCount++?16n:15n;case 'getPosition':return {size:mode==='flat'?0n:mode==='later-position'?11n:10n,avgEntryPrice:150n};case 'isOperatorAuthorized':return mode!=='approval';case 'getPendingOrder':return [true,stored];default:return denied();}},
 request:async({method,params})=>{if(method==='eth_getCode')return rpc.getCode({address:params[0]});if(method==='eth_call'||method==='eth_estimateGas'){
 audit.simulations.push({method,params});if(mode==='simulation'||mode==='gas-fail')denied();if(method==='eth_call')return mode==='malformed-call'?'bad':'0x';
 return mode==='malformed-estimate'?'bad':mode==='gas-cap'?'0x186a1':mode==='final-gas'&&estimateCount++?'0x5209':'0x5208';}return denied();}
};
function fill(p,value){if(p.type.endsWith('[]'))return (value??[]).map(v=>fill({...p,type:p.type.slice(0,-2)},v));if(p.type==='tuple')return Object.fromEntries(p.components.map(c=>[c.name,fill(c,value?.[c.name])]));if(value!==undefined)return value;if(p.type==='address')return '0x'+'0'.repeat(40);if(p.type==='bool')return false;if(p.type==='string')return '';if(p.type.startsWith('bytes'))return '0x'+'0'.repeat(2*Number(p.type.slice(5)||0));return 0n;}
const request=async({method,params=[]})=>{
 if(method==='eth_chainId')return toHex(await rpc.getChainId());
 if(method==='eth_getBlockByNumber'){const block=await rpc.getBlock(params[0]==='latest'?undefined:{blockNumber:BigInt(params[0])});return {...block,number:toHex(block.number),timestamp:toHex(block.timestamp),baseFeePerGas:mode==='fee-cap'?'0x53':'0x7',gasLimit:'0x989680',gasUsed:'0x0',transactions:[],parentHash:hash};}
 if(method==='eth_getCode')return rpc.getCode({address:params[0]});if(method==='eth_getLogs')return [];
 if(method==='eth_getTransactionCount')return toHex(await rpc.getTransactionCount());if(method==='eth_getBalance')return toHex(await rpc.getBalance());
 if(method==='eth_maxPriorityFeePerGas'||method==='eth_gasPrice'){if(mode==='fees-fail')denied();return mode==='priority-cap'?'0x4':'0x2';}
 if(method==='eth_call'&&!params[0].type){const {functionName}=decodeFunctionData({abi:readAbi,data:params[0].data}),entry=readAbi.find(f=>f.type==='function'&&f.name===functionName),value=await rpc.readContract({functionName});const result=entry.outputs.length===1?fill(entry.outputs[0],value):entry.outputs.map((p,n)=>fill(p,value[n]));return encodeFunctionResult({abi:[entry],functionName,result});}
 if(method==='eth_getTransactionReceipt'){const receipt=await rpc.getTransactionReceipt();return {...receipt,status:'0x1',type:'0x2',blockNumber:'0x65',transactionIndex:'0x0',gasUsed:'0x5208',cumulativeGasUsed:'0x5208',effectiveGasPrice:'0xa',logs:receipt.logs.map(l=>({...l,blockNumber:'0x65',logIndex:'0x0',transactionIndex:'0x0'}))};}
 if(method==='eth_getTransactionByHash'){const tx=await rpc.getTransaction();return {...tx,blockNumber:'0x65',chainId:'0xc4cf',value:toHex(tx.value),type:'0x2',nonce:'0x7',gas:'0x5208',transactionIndex:'0x0'};}
 return rpc.request({method,params});
};
globalThis.__offline={request,discovery:{getPerpMarket:async()=>{if(mode==='build')denied();return {poolAddress:pool,stopRegistry:registry};},waitForIndexedBlock:async()=>{},listPerpStopOrders:async()=>mode==='existing'||receiptMode?[{id:'one',orderIdRaw:'1',owner,registry,market:{poolAddress:pool}}]:[],getIndexerFreshness:async()=>({chainId:50383,latestProcessedBlock:receiptMode?102:100})},audit,mode};
registerHooks({resolve(spec,context,next){if(spec==='viem'&&context.parentURL?.includes('/packages/protocol/'))return {url:'offline:viem',shortCircuit:true};return next(spec,context);},load(url,context,next){
 if(url==='offline:viem')return {format:'module',shortCircuit:true,source:
 'export * from '+JSON.stringify(new URL('./node_modules/viem/_esm/index.js','file://'+env.OFFLINE_ROOT+'/').href)+';import {createPublicClient as realPublic,createWalletClient as realWallet,custom} from '+JSON.stringify(new URL('./node_modules/viem/_esm/index.js','file://'+env.OFFLINE_ROOT+'/').href)+';export function createPublicClient(o){return realPublic({...o,transport:custom({request:globalThis.__offline.request},{retryCount:0})});}export function createWalletClient(o){return realWallet({...o,transport(...a){const t=o.transport(...a);return {...t,request(...r){globalThis.__offline.audit.walletRequests++;return t.request(...r);}};}});}'};
 // Arm at actual CLI evaluation, after tsx/Node worker startup enumerates its environment.
 const result=next(url,context);if(url.includes('/scripts/local-stop-cli.ts'))return {...result,source:'globalThis.__offline.armed=true;globalThis.__offline.audit.credentialTrapArmed=true;\n'+String(result.source)};if(url.endsWith('/markets-sdk/dist/createClient.js')){let source=String(result.source).replace('export function createClient(', 'function originalCreateClient(');source+='\nexport function createClient(...args){const client=originalCreateClient(...args);Object.assign(client,globalThis.__offline.discovery);const stop=client.stopLive;client.stopLive=function(...a){globalThis.__offline.audit.closes++;if(globalThis.__offline.mode==="cleanup")throw Error("OFFLINE_SENTINEL_CLEANUP");return stop.apply(this,a);};return client;}';return {...result,source};}return result;
}});
`;

const smoke=String.raw`
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync,symlinkSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
const root=resolve(process.argv[2]??process.cwd()),loader=join(dirname(fileURLToPath(import.meta.url)),'offline-preload.mjs'),temp=mkdtempSync(join(tmpdir(),'local-stop-smoke-')),receipts=[];
const owner='0x1111111111111111111111111111111111111111',pool='0x2222222222222222222222222222222222222222',registry='0x3333333333333333333333333333333333333333',sourceHash='0x'+'c'.repeat(64),request='11111111-1111-4111-8111-111111111111';
const {PLACE_ORDER_FOR_SELECTOR}=await import(new URL('./node_modules/@somnia-chain/markets-sdk/dist/index.js','file://'+root+'/'));
const basePolicy={version:1,taskId:'dreamdex-wallet-g1-20261105',authorizationId:'offline-native-job',action:'create-sl',accountKind:'eoa',credentialVariable:'DREAMSHIELD_G1_PRIVATE_KEY',chainId:50383,genesisHash:sourceHash,owner,pool,registry,operatorSelector:PLACE_ORDER_FOR_SELECTOR,validFrom:'1793836700',expiresAt:'1793836900',maxGas:'100000',maxFeePerGasCap:'100',maxPriorityFeePerGasCap:'3',maxValue:'15',maxTotalCost:'210015'};
const sha=x=>createHash('sha256').update(x).digest('hex');
function policy(overrides={},raw){const path=join(temp,'policy-'+receipts.length+'.json'),text=raw??JSON.stringify({...basePolicy,...overrides});writeFileSync(path,text);return {DREAMSHIELD_G1_POLICY_PATH:path,DREAMSHIELD_G1_POLICY_SHA256:sha(text),DREAMSHIELD_G1_AUTHORIZATION_ID:'offline-native-job'};}
function run(command,{mode='',binding={},dir='default',trigger='190',operation,confirm,extra=[],code=0,sentinel=true}={}){
 const args=['--import',loader,'--import','tsx',join(root,'scripts/local-stop-cli.ts'),command,...(['inspect','plan','prepare'].includes(command)?['--owner',owner,'--pool',pool]:['--operation',operation])];
 if(['plan','prepare'].includes(command))args.push('--trigger',trigger);if(command==='prepare')args.push('--request-id',request);if(command==='send')args.push('--confirm',confirm);args.push(...extra);
 const auditPath=join(temp,'audit-'+receipts.length+'.json'),env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,DREAMSHIELD_LOCAL_STOP_DIR:join(temp,dir),OFFLINE_MODE:mode,OFFLINE_ROOT:root,OFFLINE_AUDIT:auditPath,DREAMSHIELD_G1_PRIVATE_KEY:'OFFLINE_SENTINEL_NOT_A_KEY'};
 Object.assign(env,binding);
 env.OFFLINE_SAVED_PLAN=join(temp,'saved-plan.json');if(!sentinel)delete env.DREAMSHIELD_G1_PRIVATE_KEY;
 const result=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:20000});assert.equal(result.status,code,JSON.stringify({command,mode,status:result.status,stdout:result.stdout,stderr:result.stderr}));
 assert(!result.stdout.includes('OFFLINE_SENTINEL'));assert(!result.stderr.includes('OFFLINE_SENTINEL'));const output=JSON.parse(result.stdout),audit=JSON.parse(readFileSync(auditPath,'utf8'));assert.equal(audit.credentialTrapArmed,true);assert.equal(audit.keyReads,0);assert.equal(audit.networkRequests,0);assert.equal(audit.walletRequests,0);
 receipts.push({command,mode,exit:result.status,output,audit,stderr:result.stderr});return output;
}
function db(dir='default'){return new DatabaseSync(join(temp,dir,'journal.sqlite'));}
function rows(dir='default'){const d=db(dir);try{return {operations:d.prepare('SELECT body FROM operations').all(),events:d.prepare('SELECT body FROM events').all()};}finally{d.close();}}
function updateOp(id,modify,dir='default'){const d=db(dir);const op=JSON.parse(d.prepare('SELECT body FROM operations WHERE id=?').get(id).body);modify(op);d.prepare('UPDATE operations SET state=?,body=? WHERE id=?').run(op.state,JSON.stringify(op),id);d.close();}
try{
 assert.equal(run('inspect').verdict,'NEEDS_PROTECTION');
 const unready=run('plan').plan;assert.equal(unready.executionReady,false);assert.equal(unready.value,'15');assert.equal(unready.draft.quantity,'0');assert.equal(unready.sourceHash,sourceHash);
 const prepared=run('prepare'),before=rows();assert.equal(prepared.state,'Draft');assert.equal(before.operations.length,1);assert.equal(before.events.length,1);
 const repeat=run('prepare');assert.equal(repeat.operation,prepared.operation);assert.equal(repeat.plan.digest,prepared.plan.digest);assert.deepEqual(rows(),before);
 run('prepare',{trigger:'191',code:3});run('plan');assert.deepEqual(rows(),before);run('send',{operation:prepared.operation,confirm:prepared.plan.digest,code:2});
 const binding=policy(),ready=run('plan',{binding}).plan;assert.equal(ready.executionReady,true);assert.deepEqual(ready.envelope,{nonce:'7',gas:'21000',maxFeePerGas:'10',maxPriorityFeePerGas:'2',type:'eip1559'});assert.equal(ready.binding.hash,binding.DREAMSHIELD_G1_POLICY_SHA256);assert.deepEqual(rows(),before);
 const simulations=receipts.at(-1).audit.simulations;assert.equal(simulations.length,3);for(let n=0;n<3;n++){const [tx,block]=simulations[n].params;assert.deepEqual(tx,{from:owner,to:registry,data:ready.data,value:'0xf',nonce:'0x7',gas:n===0?'0x186a0':'0x5208',maxFeePerGas:'0xa',maxPriorityFeePerGas:'0x2',type:'0x2'});assert.equal(block,'0x64');}
 const readyPrepared=run('prepare',{binding,dir:'ready'});assert.equal(readyPrepared.plan.executionReady,true);const stored=JSON.parse(rows('ready').events[0].body);assert.deepEqual(stored,readyPrepared.plan);
 // Later observation time must cross the original fingerprint barrier without changing saved terms.
 const immutable=rows('ready');
 const boundary=run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',mode:'later-boundary',code:1});assert.equal(boundary.error,'SIMULATION_FAILED');assert.equal(receipts.at(-1).audit.preCredentialStops,1);assert.equal(receipts.at(-1).audit.simulations.length,2);assert.deepEqual(rows('ready'),immutable);
 for(const mode of ['later-mark','later-position','later-source']){assert.equal(run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',mode,code:3}).error,'SNAPSHOT_CHANGED');assert.deepEqual(rows('ready'),immutable);}
 // Exact raw decimal spelling repeats; changed spelling/terms still conflicts and owner lock remains.
 const decimal=run('prepare',{mode:'decimal',trigger:'190.0',dir:'decimal'}),decimalRows=rows('decimal');assert.equal(decimal.plan.draft.triggerPrice,'1900');
 const decimalRepeat=run('prepare',{mode:'decimal',trigger:'190.0',dir:'decimal'});assert.equal(decimalRepeat.operation,decimal.operation);assert.deepEqual(decimalRepeat.plan,decimal.plan);assert.deepEqual(rows('decimal'),decimalRows);
 assert.equal(run('prepare',{mode:'decimal',trigger:'191.0',dir:'decimal',code:3}).error,'IDEMPOTENCY_CONFLICT');assert.deepEqual(rows('decimal'),decimalRows);
 // Final pending-nonce response crosses the effective deadline while policy remains valid.
 assert.equal(run('prepare',{binding,dir:'delayed-ready',mode:'delayed-final',code:1}).error,'SOURCE_CHANGED');assert.equal(receipts.at(-1).audit.deadlineAdvances,1);assert.deepEqual(rows('delayed-ready'),{operations:[],events:[]});
 assert.equal(run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',mode:'delayed-final',code:1}).error,'SOURCE_CHANGED');assert.equal(receipts.at(-1).audit.deadlineAdvances,1);assert.deepEqual(rows('ready'),immutable);
 run('send',{operation:readyPrepared.operation,confirm:'0'.repeat(64),binding,dir:'ready',code:2});
 run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding:policy({maxValue:'14'}),dir:'ready',code:2});
 run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',mode:'simulation',code:1});
 run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',mode:'existing',code:3});
 for(const [mode,code] of [['chain',1],['read',1],['safe',3],['stale',1],['flat',1],['existing',1],['approval',3],['build',1],['cleanup',1]])run('plan',{mode,code});
 run('plan',{mode:'deposit',code:3});
 run('plan',{trigger:'1',code:3});run('plan',{trigger:'190.1',code:1});run('plan',{trigger:'201',code:3});
 for(const mode of ['simulation','gas-fail','fees-fail','balance','nonce','unsafe-nonce','gas-cap','final-gas','malformed-call','malformed-estimate','noncanonical'])run('plan',{mode,binding,code:1});
 for(const mode of ['fee-cap','priority-cap'])run('plan',{mode,binding,code:2});
 for(const overrides of [{maxGas:'20000'},{maxValue:'14'},{maxTotalCost:'210014'},{maxPriorityFeePerGasCap:'1'},{maxGas:'UNKNOWN'},{maxGas:'01'},{maxGas:'1e5'},{maxGas:null},{expiresAt:'1793836799'},{validFrom:'1793836801'},{owner:pool},{pool:owner},{registry:owner},{chainId:1},{genesisHash:'0x'+'a'.repeat(64)},{credentialVariable:'OTHER'},{authorizationId:'unbound'},{taskId:'other'},{action:'cancel-stop'},{operatorSelector:'0x00000000'},{accountKind:'safe'},{version:2},{approved:true}])run('plan',{binding:policy(overrides),code:overrides.maxGas==='20000'?1:2});
 for(const raw of ['{bad',JSON.stringify(basePolicy).replace('"maxGas":"100000"','"maxGas":"1","maxGas":"100000"'),' '.repeat(16385)])run('plan',{binding:policy({},raw),code:2});
 run('plan',{binding:{...binding,DREAMSHIELD_G1_POLICY_SHA256:'0'.repeat(64)},code:2});
 const link=join(temp,'policy-link');symlinkSync(binding.DREAMSHIELD_G1_POLICY_PATH,link);run('plan',{binding:{...binding,DREAMSHIELD_G1_POLICY_PATH:link},code:2});
 run('plan',{binding:{...binding,DREAMSHIELD_G1_POLICY_PATH:temp},code:2});
 run('plan',{extra:['--policy','untrusted'],code:3});
 run('plan',{extra:['--OFFLINE_SENTINEL_ARGUMENT','untrusted'],code:3});
 run('plan',{binding:{...binding,DREAMSHIELD_G1_POLICY_PATH:join(temp,'OFFLINE_SENTINEL_MISSING_POLICY')},code:2});
 assert.equal(run('plan',{binding:{DREAMSHIELD_G1_POLICY_PATH:binding.DREAMSHIELD_G1_POLICY_PATH}}).plan.executionReady,false);
 const tamper=run('prepare',{dir:'tamper',binding}),tamperDb=db('tamper'),tampered={...tamper.plan,envelope:{...tamper.plan.envelope,gas:'21001'}};tamperDb.prepare('UPDATE events SET body=? WHERE id=?').run(JSON.stringify(tampered),'local-plan:'+tamper.operation);tamperDb.close();run('send',{dir:'tamper',binding,operation:tamper.operation,confirm:tamper.plan.digest,code:3});
 updateOp(prepared.operation,op=>op.state='AwaitingSignature');run('send',{operation:prepared.operation,confirm:prepared.plan.digest,code:2});assert.equal(JSON.parse(rows().operations[0].body).state,'Unknown');
 run('prepare',{code:3});run('reconcile',{operation:prepared.operation,code:1});assert.equal(JSON.parse(rows().operations[0].body).state,'Unknown');
 updateOp(readyPrepared.operation,op=>op.draft.action='cancel-stop','ready');run('send',{operation:readyPrepared.operation,confirm:readyPrepared.plan.digest,binding,dir:'ready',code:3});
 assert.deepEqual(run('plan',{binding,sentinel:false,dir:'public-only'}).plan,ready);
 const proofPrepared=run('prepare',{dir:'proof'});writeFileSync(join(temp,'saved-plan.json'),JSON.stringify(proofPrepared.plan));
 updateOp(proofPrepared.operation,op=>{op.state='Submitted';op.txHash='0x'+'a'.repeat(64);},'proof');
 const proofResult=run('reconcile',{dir:'proof',mode:'receipt',operation:proofPrepared.operation});assert.equal(proofResult.state,'Applied');assert.equal(proofResult.proofPersisted,true);
 const proofRows=rows('proof'),proofEvent=proofRows.events.map(r=>JSON.parse(r.body)).find(e=>e.kind==='reconciliation-proof');assert.equal(proofEvent.proof.nativeReadback.status,'known');assert.equal(proofEvent.proof.nativeReadback.value.triggerPrice,'190');assert.equal(proofEvent.proof.transaction.input,proofPrepared.plan.data);
 const recovered=run('prepare',{dir:'recovered'});writeFileSync(join(temp,'saved-plan.json'),JSON.stringify(recovered.plan));updateOp(recovered.operation,op=>{op.state='Unknown';op.txHash='0x'+'a'.repeat(64);op.hashProvenance='recovered';},'recovered');assert.equal(run('reconcile',{dir:'recovered',mode:'recovered',operation:recovered.operation}).state,'NeedsReview');
 updateOp(recovered.operation,op=>{op.state='Reconcile';},'recovered');assert.equal(run('reconcile',{dir:'recovered',mode:'receipt-error',operation:recovered.operation,code:1}).state,'Unknown');
 const locked=join(temp,'locked');mkdirSync(locked);writeFileSync(join(locked,'invocation.lock'),'');run('prepare',{dir:'locked',code:3});
 for(const dir of ['default','ready']){const saved=JSON.stringify(rows(dir));assert(!saved.includes('OFFLINE_SENTINEL'));}
 // Walk persisted bytes too: includes database/WAL artifacts, policies and audits.
 function scan(path){for(const entry of readdirSync(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())scan(p);else if(!entry.isSymbolicLink()){const bytes=readFileSync(p);assert(!bytes.includes(Buffer.from('OFFLINE_SENTINEL')));}}}scan(temp);
 console.log(JSON.stringify({scope:'offline synthetic public transport/discovery; installed SDK/canonical draft/journal/policy/envelope real',realG1:'NOT_RUN',invocations:receipts.length,receipts}));
}finally{rmSync(temp,{recursive:true,force:true});}
`;

it('exercises real offline CLI preparation, policy readiness, pinned envelopes, restart locks and refusals without credential access',()=>{
 const temp=mkdtempSync(join(tmpdir(),'local-stop-test-'));
 try{
  writeFileSync(join(temp,'offline-preload.mjs'),preload);writeFileSync(join(temp,'offline-smoke.mjs'),smoke);
  if(process.env.LOCAL_STOP_EVIDENCE_DIR){mkdirSync(process.env.LOCAL_STOP_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.LOCAL_STOP_EVIDENCE_DIR,'offline-preload.mjs'),preload);writeFileSync(join(process.env.LOCAL_STOP_EVIDENCE_DIR,'offline-smoke.mjs'),smoke);}
  const result=spawnSync(process.execPath,[join(temp,'offline-smoke.mjs'),resolve('.')],{env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR},encoding:'utf8',timeout:240000});
  if(process.env.LOCAL_STOP_EVIDENCE_DIR){writeFileSync(join(process.env.LOCAL_STOP_EVIDENCE_DIR,'offline-smoke.stdout.json'),result.stdout);writeFileSync(join(process.env.LOCAL_STOP_EVIDENCE_DIR,'offline-smoke.stderr.txt'),result.stderr);}
  expect(result.status,result.stderr).toBe(0);
 }finally{rmSync(temp,{recursive:true,force:true});}
},250000);

it('denies every wallet transport request, including public discovery and signing methods',async()=>{
 const wallet=createBuildWallet('0x1111111111111111111111111111111111111111');
 for(const method of ['eth_accounts','eth_chainId','personal_sign','eth_signTypedData_v4','eth_sendTransaction','eth_sendRawTransaction'])await expect(wallet.request({method} as never)).rejects.toThrow('BUILD_ONLY_TRANSPORT_DENIED');
});

it('permits one durable Draft claim across connections and retains owner lock after restart without a hash',()=>{
 const temp=mkdtempSync(join(tmpdir(),'local-stop-claim-')),path=join(temp,'journal.sqlite');const a=new Journal(path),b=new Journal(path);
 const draft:RepairDraft={revision:1,fingerprint:'synthetic',owner:'0x1111111111111111111111111111111111111111',pool:'0x2222222222222222222222222222222222222222',registry:'0x3333333333333333333333333333333333333333',chainId:50383,action:'create-sl',stopId:null,isBid:false,triggerOperator:1,triggerPrice:'190',quantity:'0',intent:'reduceOnly',deposit:'15',createdAt:new Date().toISOString()};
 try{const op=a.reserve(draft,'one');a.transition(op.id,'AwaitingSignature');expect(()=>b.transition(op.id,'AwaitingSignature')).toThrow('INVALID_TRANSITION');b.recover();expect(a.get(op.id)).toMatchObject({state:'Unknown',txHash:null});expect(()=>a.reserve(draft,'two')).toThrow('OPERATION_IN_FLIGHT');expect(()=>b.transition(op.id,'AwaitingSignature')).toThrow('INVALID_TRANSITION');}
 finally{a.close();b.close();rmSync(temp,{recursive:true,force:true});}
});
