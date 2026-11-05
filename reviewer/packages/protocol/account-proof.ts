import { attributeAddress, contractAddress, factoryAddress, planExecution, prevalidatedExecution, signExecution, safeAbi, somniaAccountFactoryAbi, SAFE_SLOTS, SENTINEL_MODULES } from '@somnia-chain/accounts-sdk';
import { secp256k1 } from '@noble/curves/secp256k1';
import { decodeFunctionData, decodeEventLog, keccak256, hexToBytes, bytesToHex, getAddress, type Address, type Hex, type PublicClient } from 'viem';
import type { AccountModel } from '../domain/types.js';
import type { EvidenceBlock, EvidenceTransaction, EvidenceReceipt } from '../domain/live-evidence.js';

// Official @safe-global/safe-smart-account@1.5.0 published build/artifacts/contracts/{Safe.sol/Safe,proxies/SafeProxy.sol/SafeProxy}.json.
// Exact deployedBytecode, including metadata. SDK manifests identify addresses, never code authority.
const SAFE_RUNTIME='0xdda019cbd7c867a533a2a86e5c53434fdc50b13122b5a5ddb4a8df61b31c20f2';
// Legacy: official Safe1.5.0 published build (solc0.7.6).
// Compatible variant: COMPLETE114-byte runtime independently reviewed against Safe1.5.0
// behavior and exercised in an independent EVM. This is NOT compiler/source reproduction.
// User approved this explicit assurance change; see docs/SAFE_PROXY_COMPATIBILITY_REVIEW.md.
// Metadata remains part of both exact hashes; no prefix/address/compiler-version exception.
const PROXY_RUNTIMES=new Set([
 '0x4e381985ca68b3e5d27b4425fa581c19cf33146d3f887a3cfca96f55528ea46f',
 '0xcba2bdf3a8be3fdb4e591c4c0d50dbea84d7aff51a228f3f95db23d4520360a4',
]);
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const zero='0x0000000000000000000000000000000000000000';
const singleton=contractAddress(50383,'Safe');
const handler=contractAddress(50383,'fallbackHandler');
const requireFact=(condition:unknown,cause:string):void=>{if(!condition)throw new Error(cause);};
const atomic=(v:string)=>/^(0|[1-9]\d*)$/.test(v);
const blockFact=(b:{number:bigint;hash:string|null;timestamp:bigint}):EvidenceBlock=>{
 requireFact(b.hash&&/^0x[0-9a-fA-F]{64}$/.test(b.hash),'ACCOUNT_BLOCK_UNAVAILABLE');
 return {number:b.number.toString(),hash:b.hash!,timestamp:new Date(Number(b.timestamp)*1000).toISOString()};
};
export interface AccountState {
 block:EvidenceBlock;parentHash:string;codeHash:Hex;singletonCodeHash:Hex;owners:Address[];threshold:string;nonce:string;
 slots:Record<keyof typeof SAFE_SLOTS,Address>;modules:readonly Address[];nextModule:Address;
 derivation:{accountId:Address;index:string};factoryAccount:Address;ownerCode:Record<string,Hex>;
}
export interface CallFrame {type:string;from:string;to:string;input:string;value?:string;output?:string;error?:string;revertReason?:string;calls?:CallFrame[]}
export interface AccountExecutionProof {execution:'official-safe';before:AccountState;after:AccountState;trace:{transactionHash:string;blockHash:string;root:CallFrame}}
function attest(account:string,state:AccountState):void {
 requireFact(PROXY_RUNTIMES.has(state.codeHash)&&state.singletonCodeHash===SAFE_RUNTIME,'ACCOUNT_IMPLEMENTATION_UNATTESTED');
 requireFact(same(state.slots.singleton,singleton)&&same(state.slots.fallbackHandler,handler),'ACCOUNT_CONFIGURATION_MISMATCH');
 const match=attributeAddress(50383,account as Address,state.owners,{maxIndex:19n});
 requireFact(match&&same(match.accountId,state.derivation.accountId)&&match.index.toString()===state.derivation.index&&same(state.factoryAccount,account),'ACCOUNT_PROVENANCE_UNCLASSIFIED: owners x indices 0-19');
}
function requireSupported(state:AccountState):void {
 requireFact(same(state.slots.guard,zero)&&same(state.slots.moduleGuard,zero)&&state.modules.length===0&&same(state.nextModule,SENTINEL_MODULES),'ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 requireFact(state.threshold==='1'&&state.owners.length>0&&new Set(state.owners.map(v=>v.toLowerCase())).size===state.owners.length&&atomic(state.nonce),'ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
}
export async function readAccountCode(rpc:PublicClient,address:Address,blockNumber:bigint):Promise<Hex>{
 // viem getCode normalizes a successful '0x' to undefined; retain the raw RPC distinction.
 try{
  const code=await rpc.request({method:'eth_getCode',params:[address,`0x${blockNumber.toString(16)}`]});
  requireFact(typeof code==='string'&&/^0x(?:[0-9a-fA-F]{2})*$/.test(code),'invalid or missing raw bytecode');return code;
 }catch(error){throw new Error(`ACCOUNT_CODE_READ_UNAVAILABLE:${error instanceof Error?error.message:String(error)}`);}
}
export async function readAccountState(rpc:PublicClient,account:Address,blockNumber:bigint):Promise<AccountState>{
 const b=await rpc.getBlock({blockNumber});const block=blockFact(b);
 const [code,singletonCode,owners,threshold,nonce,modulePage,slots]=await Promise.all([
  readAccountCode(rpc,account,blockNumber),readAccountCode(rpc,singleton,blockNumber),
  rpc.readContract({address:account,abi:safeAbi,functionName:'getOwners',blockNumber}),
  rpc.readContract({address:account,abi:safeAbi,functionName:'getThreshold',blockNumber}),
  rpc.readContract({address:account,abi:safeAbi,functionName:'nonce',blockNumber}),
  rpc.readContract({address:account,abi:safeAbi,functionName:'getModulesPaginated',args:[SENTINEL_MODULES,1n],blockNumber}),
  Promise.all(Object.entries(SAFE_SLOTS).map(async([key,slot])=>{
   const word=await rpc.getStorageAt({address:account,slot,blockNumber});requireFact(word!==undefined,'ACCOUNT_AUTHORIZATION_READ_UNAVAILABLE');
   requireFact(/^0x[0-9a-fA-F]{0,64}$/.test(word!)&&BigInt(word==='0x'?'0x0':word!)<2n**160n,'ACCOUNT_STORAGE_INVALID');
   return [key,getAddress(`0x${word!.slice(2).padStart(64,'0').slice(-40)}`)];
  }))]);
 requireFact(owners.length<=20,'ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 const match=attributeAddress(50383,account,owners,{maxIndex:19n});requireFact(match,'ACCOUNT_PROVENANCE_UNCLASSIFIED: owners x indices 0-19');
 const [factoryAccount,ownerCodes]=await Promise.all([
  rpc.readContract({address:factoryAddress(50383),abi:somniaAccountFactoryAbi,functionName:'accountAddress',args:[match!.accountId,match!.index],blockNumber}),
  Promise.all(owners.map(async owner=>[owner.toLowerCase(),await readAccountCode(rpc,owner,blockNumber)]))]);
 const state:AccountState={block,parentHash:b.parentHash,codeHash:keccak256(code),singletonCodeHash:keccak256(singletonCode),owners:[...owners],threshold:threshold.toString(),nonce:nonce.toString(),slots:Object.fromEntries(slots) as AccountState['slots'],modules:modulePage[0],nextModule:modulePage[1],derivation:{accountId:match!.accountId,index:match!.index.toString()},factoryAccount,ownerCode:Object.fromEntries(ownerCodes)};
 attest(account,state);return state;
}
/** Read-only supported-state wrapper. Reuses all runtime/provenance and shape guards. */
export async function readSupportedAccountState(rpc:PublicClient,account:Address,blockNumber:bigint):Promise<AccountState>{
 const state=await readAccountState(rpc,account,blockNumber);requireSupported(state);return state;
}
export async function observeAccount(rpc:PublicClient,account:Address,block:{number:bigint;hash:string|null}):Promise<AccountModel>{
 const result:AccountModel={address:account,block:block.hash?{number:block.number.toString(),hash:block.hash}:null,code:'unknown',codeHash:null,architecture:'unknown',derivation:null,owners:null,threshold:null,controlRead:'unknown',reason:'ACCOUNT_CODE_READ_UNAVAILABLE'};
 try{
  const code=await readAccountCode(rpc,account,block.number);result.code=code==='0x'?'empty':'present';result.codeHash=keccak256(code);result.architecture='unclassified';
  if(code==='0x'){result.reason='DIRECT_EOA_PROOF_ONLY; current signer control unknown';return result;}
  const state=await readAccountState(rpc,account,block.number);
  requireFact(state.block.hash===block.hash,'ACCOUNT_NON_CANONICAL_OBSERVATION');
  result.architecture='official-safe';result.derivation={...state.derivation,from:0,to:19};result.owners=state.owners;result.threshold=state.threshold;result.controlRead='known';result.reason='THRESHOLD1_SAFE_PROOF; historical authorization and current browser control require separate proof';
  try{requireSupported(state);}catch{result.reason='ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED';}
 }catch(error){result.controlRead='error';result.reason=error instanceof Error?error.message:String(error);}
 return result;
}
/** Synchronous file validation uses the already installed noble primitive, not async viem recovery. */
export function verifyAccountExecution(account:string,tx:EvidenceTransaction,receipt:EvidenceReceipt,proof:AccountExecutionProof):{signer:string;to:string;input:string;value:string}{
 requireFact(proof.execution==='official-safe','ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 getAddress(tx.from);
 const {before,after}=proof;attest(account,before);attest(account,after);
 requireSupported(before);requireSupported(after);
 requireFact(atomic(before.block.number)&&atomic(after.block.number)&&BigInt(before.block.number)+1n===BigInt(after.block.number)&&same(after.parentHash,before.block.hash)&&after.block.number===receipt.block.number&&same(after.block.hash,receipt.block.hash)&&after.block.timestamp===receipt.block.timestamp,'ACCOUNT_HISTORICAL_BRACKET_MISMATCH');
 requireFact(BigInt(after.nonce)===BigInt(before.nonce)+1n,'ACCOUNT_NONCE_AMBIGUOUS');
 requireFact(JSON.stringify({...before,block:null,parentHash:null,nonce:null})===JSON.stringify({...after,block:null,parentHash:null,nonce:null}),'ACCOUNT_CONFIGURATION_DRIFT');
 requireFact(tx.chainId===50383&&same(tx.to,account)&&tx.value==='0'&&receipt.status==='success'&&same(receipt.from,tx.from)&&same(receipt.to,account)&&same(receipt.transactionHash,tx.hash)&&tx.blockNumber===receipt.block.number&&same(tx.blockHash,receipt.block.hash)&&same(receipt.canonicalBlockHash,receipt.block.hash),'ACCOUNT_ROOT_SCOPE_MISMATCH');
 const decoded=decodeFunctionData({abi:safeAbi,data:tx.input as Hex});
 requireFact(decoded.functionName==='execTransaction','ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 if(decoded.functionName!=='execTransaction')throw new Error('ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 const [to,value,input,operation,,,,,,signature]=decoded.args;
 requireFact(operation===0,'ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED');
 const plan=planExecution({chainId:50383,account:account as Address,calls:[{to,value,data:input}],nonce:BigInt(before.nonce)});
 requireFact(same(signExecution(plan,signature).data,tx.input),'ACCOUNT_ENVELOPE_NONCANONICAL');
 let signer:string;let recoveryInput:string|undefined;
 if(signature.length===132&&signature.slice(-2)==='01'){
  requireFact(same(prevalidatedExecution(plan,tx.from as Address).data,tx.input),'ACCOUNT_AUTHORIZATION_UNPROVEN');signer=tx.from;
 }else{
  requireFact(/^0x[0-9a-fA-F]{130}$/.test(signature)&&['1b','1c'].includes(signature.slice(-2).toLowerCase()),'ACCOUNT_SIGNATURE_UNSUPPORTED');
  const sig=secp256k1.Signature.fromCompact(signature.slice(2,130)).addRecoveryBit(Number.parseInt(signature.slice(-2),16)-27);
  requireFact(!sig.hasHighS(),'ACCOUNT_SIGNATURE_NONCANONICAL');
  const publicKey=sig.recoverPublicKey(hexToBytes(plan.hash)).toRawBytes(false);
  signer=getAddress(`0x${keccak256(bytesToHex(publicKey.slice(1))).slice(-40)}`);
  // ecrecover ABI words: digest, v, r, s (Safe's canonical EIP-712 branch).
  recoveryInput=plan.hash+signature.slice(-2).padStart(64,'0')+signature.slice(2,130);
 }
 requireFact(before.owners.some(owner=>same(owner,signer))&&before.ownerCode[signer.toLowerCase()]==='0x'&&after.ownerCode[signer.toLowerCase()]==='0x','ACCOUNT_AUTHORIZATION_UNPROVEN');
 const events=receipt.logs.flatMap(log=>{
  if(!same(log.address,account))return [];
  try{return [decodeEventLog({abi:safeAbi,data:log.data as Hex,topics:log.topics as [Hex,...Hex[]]})];}catch{return [];}
 });
 requireFact(events.length===1&&events[0]!.eventName==='ExecutionSuccess'&&events[0]!.args.txHash===plan.hash&&events[0]!.args.payment===0n,'ACCOUNT_EXECUTION_EVENT_MISMATCH');
 requireFact(same(proof.trace.transactionHash,tx.hash)&&same(proof.trace.blockHash,tx.blockHash),'ACCOUNT_EXECUTION_TRACE_BINDING_MISMATCH');
 const root=proof.trace.root;const delegate=root.calls?.[0];const recovery=recoveryInput?delegate?.calls?.[0]:undefined;const inner=delegate?.calls?.[recoveryInput?1:0];
 const matches=(f:CallFrame|undefined,type:string,from:string,target:string,data:string,amount:bigint)=>!!f&&f.type===type&&same(f.from,from)&&same(f.to,target)&&same(f.input,data)&&BigInt(f.value??'0x0')===amount&&!f.error&&!f.revertReason;
 requireFact(matches(root,'CALL',tx.from,account,tx.input,0n)&&root.calls?.length===1&&matches(delegate,'DELEGATECALL',account,singleton,tx.input,0n)&&delegate?.calls?.length===(recoveryInput?2:1)&&matches(inner,'CALL',account,to,input,value),'ACCOUNT_INNER_CALL_MISMATCH');
 if(recoveryInput)requireFact(matches(recovery,'STATICCALL',account,'0x0000000000000000000000000000000000000001',recoveryInput,0n)&&same(recovery!.output??'',`0x${signer.slice(2).padStart(64,'0')}`)&&!(recovery!.calls?.length),'ACCOUNT_RECOVERY_CALL_MISMATCH');
 requireFact(root.output===`0x${'0'.repeat(63)}1`&&delegate?.output===root.output,'ACCOUNT_EXECUTION_RESULT_MISMATCH');
 const walk=(frame:CallFrame):void=>{
  requireFact(!frame.error&&!frame.revertReason&&!['CREATE','CREATE2','SELFDESTRUCT'].includes(frame.type),'ACCOUNT_TRACE_FAILED_OR_UNSUPPORTED');
  if(frame!==root&&frame!==delegate&&frame!==recovery&&frame!==inner)requireFact(!same(frame.from,account)&&!same(frame.to,account),'ACCOUNT_EXTRA_EXECUTION');
  for(const child of frame.calls??[])walk(child);
 };walk(root);
 return {signer,to,input,value:value.toString()};
}
export async function captureAccountExecution(rpc:PublicClient,account:Address,tx:EvidenceTransaction,receipt:EvidenceReceipt):Promise<AccountExecutionProof|null>{
 const number=BigInt(receipt.block.number);const code=await readAccountCode(rpc,account,number);if(code==='0x')return null;
 requireFact(number>0n,'ACCOUNT_HISTORICAL_BRACKET_UNAVAILABLE');
 const [before,after]=await Promise.all([readAccountState(rpc,account,number-1n),readAccountState(rpc,account,number)]);
 let root:CallFrame;
 try{root=await rpc.request({method:'debug_traceTransaction' as never,params:[tx.hash,{tracer:'callTracer'}] as never}) as CallFrame;}catch(error){throw new Error(`ACCOUNT_EXECUTION_TRACE_UNAVAILABLE:${error instanceof Error?error.message:String(error)}`);}
 requireFact(root&&typeof root==='object','ACCOUNT_EXECUTION_TRACE_UNAVAILABLE');
 const proof:AccountExecutionProof={execution:'official-safe',before,after,trace:{transactionHash:tx.hash,blockHash:tx.blockHash,root}};
 verifyAccountExecution(account,tx,receipt,proof);
 const [parent,canonical]=await Promise.all([rpc.getBlock({blockNumber:number-1n}),rpc.getBlock({blockNumber:number})]);
 requireFact(parent.hash===before.block.hash&&canonical.hash===after.block.hash,'ACCOUNT_NON_CANONICAL_HISTORY');return proof;
}
