import { createProtocolReader, httpClient, NETWORK, readLiveSnapshot } from '../packages/protocol/index.ts';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createPublicClient, webSocket } from 'viem';
import {bankReadAbi} from '../packages/protocol/sdk-abi.ts';
import { chain } from '../packages/protocol/index.ts';
const startedAt=new Date().toISOString();
const results:Record<string,unknown>={startedAt,readOnly:true,transactionsSent:0,ownerConfigured:!!process.env.DREAMSHIELD_OWNER,poolConfigured:!!process.env.DREAMSHIELD_POOL,signerConfigured:false,liveOwnerGate:'BLOCKED_NO_USER_SIGNER',fixedBlockAcrossSdkCalls:false,pinnedRiskReadsViaExtractedSdkAbi:true};
function errorChain(error:unknown){const chain:Record<string,unknown>[]=[];let current:any=error;for(let i=0;current&&i<5;i++){chain.push({name:current.name??'Error',message:String(current.message??current.details??current).slice(0,2000),code:current.code??null});current=current.cause??current.error;}return chain;}
async function probe(name:string,run:()=>Promise<unknown>){const t=Date.now();try{const value=await run();results[name]={status:'passed',ms:Date.now()-t,value};}catch(e){results[name]={status:'failed',ms:Date.now()-t,error:e instanceof Error?e.message.slice(0,2000):String(e),causes:errorChain(e)};}}
results.versions={node:process.version,npm:execFileSync('npm',['--version'],{encoding:'utf8'}).trim(),sdk:JSON.parse(await readFile('node_modules/@somnia-chain/markets-sdk/package.json','utf8')).version,viem:JSON.parse(await readFile('node_modules/viem/package.json','utf8')).version,lockSha256:createHash('sha256').update(await readFile('package-lock.json')).digest('hex')};
const rpc=httpClient();
await probe('http',async()=>{const chainId=await rpc.getChainId();const block=await rpc.getBlock();if(chainId!==NETWORK.chainId)throw Error(`Wrong chain ${chainId}`);return {endpoint:NETWORK.http,chainId,block:block.number,blockHash:block.hash,blockTimestamp:block.timestamp,lagSeconds:Math.floor(Date.now()/1000)-Number(block.timestamp)};});
const ws=createPublicClient({chain,transport:webSocket(NETWORK.ws,{retryCount:0,timeout:12000,reconnect:false})});
await probe('websocket',async()=>{const chainId=await ws.getChainId();const block=await ws.getBlock();if(chainId!==NETWORK.chainId)throw Error(`Wrong chain ${chainId}`);return {endpoint:NETWORK.ws,chainId,block:block.number,blockHash:block.hash,blockTimestamp:block.timestamp,lagSeconds:Math.floor(Date.now()/1000)-Number(block.timestamp)};});
try{const connection=await ws.transport.getRpcClient();connection.close();}catch{/* failure already recorded */}
await probe('systemBytecode',async()=>{const values:Record<string,unknown>={};for(const [name,address] of Object.entries({marginBank:NETWORK.marginBank,collateral:NETWORK.collateral,factory:NETWORK.factory,operatorRegistry:NETWORK.operatorRegistry})){const code=await rpc.getCode({address});if(!code||code==='0x')throw Error(`No code ${name}`);values[name]={address,bytes:(code.length-2)/2,sha256:createHash('sha256').update(code).digest('hex')};}return values;});
const exchange=createProtocolReader();let selectedPool=process.env.DREAMSHIELD_POOL??null;
try{
 await probe('sdkSystemConfig',()=>exchange.client.getPerpSystemConfig(NETWORK.marginBank));
 await probe('httpSystemConfigAtBlock',async()=>{const block=await rpc.getBlock();return {block:block.number,value:await rpc.readContract({address:NETWORK.marginBank,abi:bankReadAbi,functionName:'getSystemConfig',blockNumber:block.number})};});
 await probe('genesisBlock1',()=>rpc.getBlock({blockNumber:1n}));
 await probe('marketDiscovery',async()=>{const markets=await exchange.client.listPerpMarkets({limit:30});selectedPool??=markets[0]?.poolAddress??null;return {endpoint:NETWORK.indexer,count:markets.length,coverage:'first 30 indexed perp markets, not exhaustive',selectedPool,markets:markets.map(m=>({pool:m.poolAddress,symbol:m.baseSymbol,bank:m.marginBank,stopRegistry:m.stopRegistry}))};});
}finally{await exchange.close();}
await probe('snapshot',async()=>{const snapshot=await readLiveSnapshot({owner:process.env.DREAMSHIELD_OWNER??null,pool:selectedPool});return {snapshot,liveAcceptance:snapshot.complete?'same-block read complete':'NOT_ACCEPTED',ownerRead:process.env.DREAMSHIELD_OWNER?'attempted':'NOT_CONFIGURED'};});
results.completedAt=new Date().toISOString();results.g0Complete=false;results.g0Note='Read-only evidence only. Missing owner/transaction lifecycle and any failed probes remain blockers. No trading, signing, funding, or submission.';
await mkdir('evidence/g0',{recursive:true});const file=`evidence/g0/doctor-${startedAt.replaceAll(':','-')}.json`;const json=JSON.stringify(results,(_,v)=>typeof v==='bigint'?v.toString():v,2);await writeFile(file,json+'\n');console.log(json);console.log(`Evidence: ${file}`);
