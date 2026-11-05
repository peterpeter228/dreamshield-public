import {planExecution,safeTxTypedData,prevalidatedExecution,safeAbi} from '@somnia-chain/accounts-sdk';
import {PLACE_ORDER_FOR_SELECTOR} from '@somnia-chain/markets-sdk';
import {zeroAddress,createWalletClient,custom,decodeFunctionData,type EIP1193Provider,type Hex} from 'viem';
import {createCancelDraft,createSlDraft,formatAtomic,FRESHNESS_MS,assessProtection} from '../domain/index.js';
import type {RepairDraft,Snapshot} from '../domain/types.js';
import {readSupportedAccountState} from './account-proof.js';
import {checkedAddress,expectedDraftCall,httpClient,NETWORK,chain,readLiveSnapshot} from './index.js';
import {operatorReadAbi} from './sdk-abi.js';

export interface UnsignedSafePlan {
 schemaVersion:1;status:'NOT_SIGNED_NOT_BROADCASTABLE';chainId:50383;
 account:string;controller:string;controllerControlVerified:false;
 block:{number:string;hash:string;timestamp:string};nonce:string;createdAt:string;expiresAt:string;
 innerCall:{to:string;data:Hex;value:string};
 plan:{chainId:number;account:string;tx:{to:string;data:Hex;value:string;operation:0;nonce:string;safeTxGas:string;baseGas:string;gasPrice:string;gasToken:string;refundReceiver:string};through:[];hashes:readonly Hex[];hash:Hex};
 warning:string;
}
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const requireFact=(test:unknown,reason:string)=>{if(!test)throw new Error(reason);};
function draftFresh(draft:RepairDraft,now:number):number{
 const created=Date.parse(draft.createdAt);
 requireFact(Number.isFinite(created)&&created<=now+1000&&now-created<FRESHNESS_MS,'DRAFT_EXPIRED');
 requireFact(draft.chainId===50383&&/^[1-9]\d*$/.test(draft.observedBlock??''),'DRAFT_SCOPE_INVALID');
 return created+FRESHNESS_MS;
}
/** Read + pure encoding only. Caller must enforce persisted operation/scope locks.
 * No wallet/provider, signature, authorization grant, executable outer call or send.
 */
export async function prepareUnsignedSafePlan(draft:RepairDraft,controllerInput:string):Promise<UnsignedSafePlan>{
 draftFresh(draft,Date.now());
 const account=checkedAddress(draft.owner),pool=checkedAddress(draft.pool);
 const snapshot=await readLiveSnapshot({owner:account,pool,transport:'platform'});
 return prepareFromSnapshot(draft,controllerInput,snapshot);
}
/** Primary creation flow: long discovery happens BEFORE creating a new draft.
 * Does not reserve/persist. Server must recheck scope locks then reserve on success.
 */
export async function prepareFreshUnsignedSafePlan(input:{owner:string;pool:string;controller:string;triggerPrice:string}):Promise<{draft:RepairDraft;plan:UnsignedSafePlan}>{
 const owner=checkedAddress(input.owner),pool=checkedAddress(input.pool),controller=checkedAddress(input.controller);
 const snapshot=await readLiveSnapshot({owner,pool,transport:'platform'});
 const draft=createSlDraft(snapshot,input.triggerPrice,Date.now());
 requireFact(same(draft.owner,owner)&&same(draft.pool,pool),'SAFE_PLAN_SCOPE_MISMATCH');
 const plan=await prepareFromSnapshot(draft,controller,snapshot);
 return {draft,plan};
}
async function prepareFromSnapshot(draft:RepairDraft,controllerInput:string,snapshot:Snapshot):Promise<UnsignedSafePlan>{
 draftFresh(draft,Date.now());
 const account=checkedAddress(draft.owner),pool=checkedAddress(draft.pool),controller=checkedAddress(controllerInput);
 const now=Date.now(),assessment=assessProtection(snapshot,now);
 requireFact(snapshot.mode==='live-readonly'&&snapshot.complete&&!snapshot.readError&&snapshot.scope==='indexedSnapshot'&&assessment.verdict!=='UNKNOWN','FRESH_COMPLETE_SNAPSHOT_REQUIRED');
 const market=snapshot.market!,position=snapshot.position!;
 requireFact(market.chainId===50383&&same(market.pool,pool)&&same(position.owner,account)&&same(position.pool,pool)&&same(market.stopRegistry,draft.registry)&&same(market.marginBank,NETWORK.marginBank),'SAFE_PLAN_SCOPE_MISMATCH');
 requireFact(/^0x[0-9a-fA-F]{64}$/.test(market.blockHash??'')&&/^[1-9]\d*$/.test(market.observedBlock)&&BigInt(market.observedBlock)>=BigInt(draft.observedBlock!),'SAFE_PLAN_BLOCK_INVALID');
 requireFact(snapshot.stopDiscovery?.mutationFree===true&&snapshot.stopDiscovery.toBlock===market.observedBlock,'STOP_DISCOVERY_UNVERIFIED');
 const refreshed=draft.action==='create-sl'?createSlDraft(snapshot,{triggerPrice:formatAtomic(draft.triggerPrice,market.quoteDecimals),revision:draft.revision},now):draft.action==='cancel-stop'&&draft.stopId!==null?createCancelDraft(snapshot,draft.stopId,draft.revision,now):null;
 requireFact(refreshed,'INVALID_ACTION');
 for(const key of ['owner','pool','registry','chainId','action','stopId','isBid','triggerOperator','triggerPrice','quantity','intent','deposit'] as const){
  const left=refreshed![key],right=draft[key];
  requireFact(['owner','pool','registry'].includes(key)?same(String(left),String(right)):left===right,`DRAFT_MISMATCH:${key}`);
 }
 const blockNumber=BigInt(market.observedBlock),rpc=httpClient();
 const reads=[rpc.getChainId(),readSupportedAccountState(rpc,account,blockNumber),
  draft.action==='create-sl'?rpc.readContract({address:pool,abi:operatorReadAbi,functionName:'isOperatorAuthorized',args:[account,checkedAddress(market.stopRegistry),PLACE_ORDER_FOR_SELECTOR],blockNumber}):Promise.resolve(true),
  rpc.getBlock({blockNumber:1n})] as const;
 const settled=await Promise.allSettled(reads);const failed=settled.find(value=>value.status==='rejected');if(failed?.status==='rejected')throw failed.reason;
 const [chainId,state,approved,genesis]=await Promise.all(reads);
 requireFact(chainId===50383&&genesis.hash===market.genesisHash,'CHAIN_OR_GENESIS_MISMATCH');
 requireFact(state.block.number===market.observedBlock&&state.block.hash===market.blockHash&&state.block.timestamp===market.observedAt,'ACCOUNT_SNAPSHOT_BINDING_MISMATCH');
 requireFact(state.owners.some(owner=>same(owner,controller))&&state.ownerCode[controller.toLowerCase()]==='0x','CONTROLLER_NOT_VERIFIED_EOA_OWNER');
 requireFact(approved===true,'OPERATOR_APPROVAL_REQUIRED_NO_AUTOMATIC_GRANT');
 const call=expectedDraftCall(draft);
 const plan=planExecution({chainId:50383,account,calls:[{to:checkedAddress(draft.registry),data:call.data,value:BigInt(call.value)}],nonce:BigInt(state.nonce),through:[]});
 requireFact(plan.through.length===0&&plan.tx.operation===0&&same(plan.account,account)&&same(plan.tx.to,draft.registry)&&plan.tx.data===call.data&&plan.tx.value===BigInt(call.value),'UNSUPPORTED_SAFE_PLAN');
 const hashedTx=safeTxTypedData(plan.chainId,plan.account,plan.tx).message;
 requireFact(hashedTx.safeTxGas===0n&&hashedTx.baseGas===0n&&hashedTx.gasPrice===0n&&same(hashedTx.gasToken,zeroAddress)&&same(hashedTx.refundReceiver,zeroAddress),'SAFE_PLAN_REIMBURSEMENT_FORBIDDEN');
 const canonical=await rpc.getBlock({blockNumber});
 requireFact(canonical.number===blockNumber&&canonical.hash===market.blockHash&&new Date(Number(canonical.timestamp)*1000).toISOString()===market.observedAt,'NON_CANONICAL_SAFE_PLAN');
 const completed=Date.now();const expires=Math.min(draftFresh(draft,completed),Date.parse(assessment.expiresAt),Date.parse(state.block.timestamp)+FRESHNESS_MS);
 requireFact(Number.isFinite(expires)&&completed<expires&&assessProtection(snapshot,completed).verdict!=='UNKNOWN','SAFE_PLAN_EXPIRED_DURING_READ');
 return {schemaVersion:1,status:'NOT_SIGNED_NOT_BROADCASTABLE',chainId:50383,account,controller,controllerControlVerified:false,block:{number:state.block.number,hash:state.block.hash,timestamp:state.block.timestamp},nonce:state.nonce,createdAt:new Date(completed).toISOString(),expiresAt:new Date(expires).toISOString(),innerCall:{to:plan.tx.to,data:call.data,value:call.value.toString()},plan:{chainId:plan.chainId,account:plan.account,tx:{to:plan.tx.to,data:plan.tx.data,value:plan.tx.value.toString(),operation:0,nonce:plan.tx.nonce.toString(),safeTxGas:hashedTx.safeTxGas.toString(),baseGas:hashedTx.baseGas.toString(),gasPrice:hashedTx.gasPrice.toString(),gasToken:hashedTx.gasToken,refundReceiver:hashedTx.refundReceiver},through:[],hashes:plan.hashes,hash:plan.hash},warning:'Unsigned plan only; controller key possession is unverified. No Safe signature or executable outer transaction is supplied. Expiry is an application check, not an on-chain deadline. Refresh and revalidate before any separately authorized execution.'};
}

export interface ControllerSafePlan {
 unsigned:UnsignedSafePlan;
 outer:{sender:string;to:string;data:Hex;value:string};
}
/** Pure reconstruction of centrally validated terms; never accepts arbitrary outer calldata. */
function controllerEnvelope(draft:RepairDraft,unsigned:UnsignedSafePlan):ControllerSafePlan {
 requireFact(draft.action==='create-sl'&&draft.quantity==='0','SAFE_CREATE_SL_ONLY');
 const controller=checkedAddress(unsigned.controller),account=checkedAddress(draft.owner),call=expectedDraftCall(draft);
 requireFact(!same(controller,account)&&same(unsigned.account,account)&&unsigned.chainId===50383,'CONTROLLER_SCOPE_MISMATCH');
 const plan=planExecution({chainId:50383,account,calls:[{to:checkedAddress(draft.registry),data:call.data,value:call.value}],nonce:BigInt(unsigned.nonce),through:[]});
 const tx=safeTxTypedData(50383,account,plan.tx).message;
 const serialized=Object.fromEntries(Object.entries(tx).map(([key,value])=>[key,typeof value==='bigint'?value.toString():value]));
 requireFact(plan.hash===unsigned.plan.hash&&Object.entries(serialized).every(([key,value])=>unsigned.plan.tx[key as keyof typeof unsigned.plan.tx]===value)&&unsigned.plan.through.length===0&&unsigned.plan.chainId===50383&&same(unsigned.plan.account,account)&&unsigned.innerCall.data===call.data&&unsigned.innerCall.value===call.value.toString()&&same(unsigned.innerCall.to,draft.registry),'SAFE_REVIEW_TERMS_CHANGED');
 const outer=prevalidatedExecution(plan,controller),decoded=decodeFunctionData({abi:safeAbi,data:outer.data});
 requireFact(same(outer.sender,controller)&&same(outer.to,account)&&outer.value===0n,'UNSUPPORTED_SAFE_ENVELOPE');
 if(decoded.functionName!=='execTransaction')throw new Error('UNSUPPORTED_SAFE_ENVELOPE');
 const [to,value,data,operation,safeTxGas,baseGas,gasPrice,gasToken,refundReceiver]=decoded.args;
 requireFact(same(to,draft.registry)&&value===call.value&&data===call.data&&operation===0&&safeTxGas===0n&&baseGas===0n&&gasPrice===0n&&same(gasToken,zeroAddress)&&same(refundReceiver,zeroAddress),'UNSUPPORTED_SAFE_ENVELOPE');
 return {unsigned,outer:{sender:outer.sender,to:outer.to,data:outer.data,value:outer.value.toString()}};
}
/** No account permission request, chain switch, message signature, grant or send. */
export async function prepareControllerSafeCall(draft:RepairDraft,controllerInput:string,provider:EIP1193Provider):Promise<ControllerSafePlan> {
 requireFact(draft.action==='create-sl'&&draft.quantity==='0','SAFE_CREATE_SL_ONLY');
 const controller=checkedAddress(controllerInput),wallet=createWalletClient({chain,transport:custom(provider)});
 const [selected]=await wallet.getAddresses();
 requireFact(selected&&same(selected,controller)&&!same(controller,draft.owner),'SELECTED_CONTROLLER_REQUIRED');
 requireFact(await wallet.getChainId()===50383,'WRONG_WALLET_CHAIN');
 const unsigned=await prepareUnsignedSafePlan(draft,controller);
 const [after]=await wallet.getAddresses();
 requireFact(after&&same(after,controller)&&await wallet.getChainId()===50383,'WALLET_CHANGED_BEFORE_SEND');
 return controllerEnvelope(draft,unsigned);
}
/** Explicit browser action only. Fresh policy/account/nonce checks precede the wallet transaction. */
export async function executeControllerSafeSl(draft:RepairDraft,reviewed:ControllerSafePlan,provider:EIP1193Provider):Promise<Hex> {
 requireFact(Number.isFinite(Date.parse(reviewed.unsigned.expiresAt))&&Date.now()<Date.parse(reviewed.unsigned.expiresAt),'SAFE_PLAN_EXPIRED');
 const current=await prepareControllerSafeCall(draft,reviewed.unsigned.controller,provider);
 requireFact(current.unsigned.plan.hash===reviewed.unsigned.plan.hash&&current.unsigned.nonce===reviewed.unsigned.nonce&&JSON.stringify(current.outer)===JSON.stringify(reviewed.outer),'SAFE_REVIEW_TERMS_CHANGED');
 requireFact(Date.now()<Date.parse(reviewed.unsigned.expiresAt)&&Date.now()<Date.parse(current.unsigned.expiresAt),'SAFE_PLAN_EXPIRED');
 const wallet=createWalletClient({chain,transport:custom(provider)}),[selected]=await wallet.getAddresses();
 requireFact(selected&&same(selected,current.outer.sender)&&await wallet.getChainId()===50383,'WALLET_CHANGED_BEFORE_SEND');
 return wallet.sendTransaction({account:checkedAddress(current.outer.sender),to:checkedAddress(current.outer.to),data:current.outer.data,value:BigInt(current.outer.value),chain});
}
