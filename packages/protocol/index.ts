import {transactionAbi} from './transaction-abi.js';
import { SomniaMarkets, decodePerpStopOrderIds, PLACE_ORDER_FOR_SELECTOR, type PerpStopOrder, type PlacePerpStopOrderParams } from '@somnia-chain/markets-sdk';
import { createPublicClient, createWalletClient, custom, defineChain, encodeFunctionData, getAddress, http, isAddress, parseEventLogs, type Address, type EIP1193Provider, type Hex } from 'viem';
import { poolReadAbi,bankReadAbi,stopReadAbi,stopEventsAbi,factoryReadAbi,tokenReadAbi,operatorReadAbi } from './sdk-abi.ts';
import type { NativeStopSnapshot, Operation, RepairDraft, Snapshot } from '../domain/types.ts';
import type { OperationEvidenceProof } from '../domain/live-evidence.js';
import { evidenceBlock, operationEvidence } from './evidence.js';
export { captureEvidenceObservation, type CaptureEvidenceInput } from './evidence.js';

export const NETWORK = Object.freeze({chainId:50383, http:'https://api.hideki2.infra.testnet.somnia.network', ws:'wss://api.hideki2.infra.testnet.somnia.network/ws', indexer:'https://hideki-dev.smk.somnia.host/v1/graphql', marginBank:'0x478769E1177C0773c43A593DCCc4Ad15F15F1394' as Address, collateral:'0xed7993A74dAe1e6656B704A424DcD8711aAf4F72' as Address, factory:'0xE631fAEE547baeE07353E290f0562ea67d856560' as Address, operatorRegistry:'0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a' as Address});
export const chain = defineChain({id:NETWORK.chainId,name:'Somnia Tokyo / Hideki',nativeCurrency:{name:'STT',symbol:'STT',decimals:18},rpcUrls:{default:{http:[NETWORK.http],webSocket:[NETWORK.ws]}}});
export const protocolConfig = () => ({chain,wsRpcUrl:NETWORK.ws,indexerUrl:NETWORK.indexer,addresses:{marginBank:NETWORK.marginBank,perpPoolFactory:NETWORK.factory,operatorPermissionsRegistry:NETWORK.operatorRegistry},indexerLimits:{maxAttempts:1}});
export const createProtocolReader = () => new SomniaMarkets(protocolConfig());
export const httpClient = () => createPublicClient({chain,transport:http(NETWORK.http,{retryCount:0,timeout:12000})});
const same = (a:string,b:string) => a.toLowerCase()===b.toLowerCase();
const errorText = (e:unknown) => e instanceof Error ? `${e.name}: ${e.message}`.slice(0,1500) : String(e).slice(0,1500);
const blank = ():Snapshot => ({mode:'live-readonly',market:null,position:null,stops:[],scope:'unavailable',readError:null,capturedAt:new Date().toISOString(),complete:false});
export function checkedAddress(value:string):Address {if(!isAddress(value))throw new Error('INVALID_ADDRESS');return getAddress(value);}

/** Bounded offset discovery; errors and a full final page must NEVER mean empty. */
export async function discoverStops(readPage:(offset:number,limit:number)=>Promise<PerpStopOrder[]>, maxPages=10, pageSize=100):Promise<PerpStopOrder[]> {
 const rows:PerpStopOrder[]=[];const seen=new Set<string>();
 for(let page=0;page<maxPages;page++) {const part=await readPage(page*pageSize,pageSize);for(const row of part){if(seen.has(row.id))throw new Error('UNSTABLE_STOP_PAGINATION');seen.add(row.id);rows.push(row);}if(part.length<pageSize)return rows;}
 throw new Error('STOP_DISCOVERY_PAGE_CAP');
}

/** Read-only actual SDK. No signer/key is constructed. SDK discovery is complemented by pinned viem risk reads using ABI declarations extracted from the same pinned SDK.
 * A mutation-free discovery bracket and canonical pinned block are required for completeness.
 */
export async function readLiveSnapshot({owner,pool}:{owner:string|null;pool:string|null}):Promise<Snapshot> {
 const result=blank();if(!pool){result.readError='POOL_NOT_CONFIGURED';return result;}
 let exchange:SomniaMarkets|undefined;
 try {
  const target=checkedAddress(pool); const account=owner?checkedAddress(owner):null;
  const rpc=httpClient();if(await rpc.getChainId()!==NETWORK.chainId)throw new Error('WRONG_CHAIN');
  const start=await rpc.getBlock(); exchange=createProtocolReader();const client=exchange.client;
  const genesis=await rpc.getBlock({blockNumber:1n});
  if(genesis.hash==='0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae')throw new Error('RETIRED_HIDEKI_GENESIS');
  if(!genesis.hash)throw new Error('GENESIS_HASH_UNAVAILABLE');
  const setupBlock=start.number;
  const system=await rpc.readContract({address:NETWORK.marginBank,abi:bankReadAbi,functionName:'getSystemConfig',blockNumber:setupBlock});
  if(!system.fullyWired || !same(system.perpPoolFactory,NETWORK.factory) || !same(system.collateralToken,NETWORK.collateral))throw new Error('SYSTEM_CONFIG_DRIFT');
  const statuses=await rpc.readContract({address:system.perpPoolFactory,abi:factoryReadAbi,functionName:'getPerpPoolStatuses',blockNumber:setupBlock});
  const status=statuses.find(p=>same(p.perpPool,target));if(!status)throw new Error('POOL_UNVERIFIED');
  const [bank,registered,registry,book,baseDecimals,quoteDecimals,baseSymbol,quoteSymbol]=await Promise.all([
   rpc.readContract({address:target,abi:poolReadAbi,functionName:'marginBank',blockNumber:setupBlock}),
   rpc.readContract({address:NETWORK.marginBank,abi:bankReadAbi,functionName:'isPerpPoolRegistered',args:[target],blockNumber:setupBlock}),
   rpc.readContract({address:system.perpPoolFactory,abi:factoryReadAbi,functionName:'getStopOrderRegistry',args:[target],blockNumber:setupBlock}),
   rpc.readContract({address:target,abi:poolReadAbi,functionName:'getOrderBookParameters',blockNumber:setupBlock}),
   rpc.readContract({address:status.baseToken,abi:tokenReadAbi,functionName:'decimals',blockNumber:setupBlock}),
   rpc.readContract({address:system.collateralToken,abi:tokenReadAbi,functionName:'decimals',blockNumber:setupBlock}),
   rpc.readContract({address:status.baseToken,abi:tokenReadAbi,functionName:'symbol',blockNumber:setupBlock}),
   rpc.readContract({address:system.collateralToken,abi:tokenReadAbi,functionName:'symbol',blockNumber:setupBlock})]);
  if(!registered||!same(bank,NETWORK.marginBank)||registry==='0x0000000000000000000000000000000000000000')throw new Error('MARKET_BINDING_UNVERIFIED');
  const market={marginBank:bank,stopRegistry:registry,baseSymbol,quoteSymbol,baseDecimals:Number(baseDecimals),quoteDecimals:Number(quoteDecimals),tickSize:book.tickSize.toString(),lotSize:book.lotSize.toString(),minQuantity:book.minQuantity.toString()};
  for(const address of [target,market.stopRegistry,market.marginBank]){const code=await rpc.getCode({address,blockNumber:setupBlock});if(!code||code==='0x')throw new Error('CONTRACT_CODE_MISSING');}
  // Discover ids first, then pin critical risk reads to one actual chain block.
  // Indexer watermark must cover discovery start and no registry mutations may straddle pagination.
  let indexed:PerpStopOrder[]=[];let indexerWaitedThrough=start.number;
  if(account){
   await client.waitForIndexedBlock(NETWORK.chainId,start.number,{timeoutMs:10000});
   indexed=await discoverStops((offset,limit)=>client.listPerpStopOrders({account,pool:target,status:['PENDING'],offset,limit}));
   const freshness=await client.getIndexerFreshness(NETWORK.chainId);
   if(!freshness||freshness.chainId!==NETWORK.chainId||freshness.latestProcessedBlock===null||!Number.isSafeInteger(freshness.latestProcessedBlock))throw new Error('INDEXER_PROCESSED_BOUND_UNAVAILABLE');
   indexerWaitedThrough=BigInt(freshness.latestProcessedBlock);
   if(indexerWaitedThrough<start.number)throw new Error('INDEXER_WATERMARK_REGRESSED');
  }
  const pinned=await rpc.getBlock();
  if(account&&indexerWaitedThrough>pinned.number)throw new Error('INDEXER_AHEAD_OF_PINNED_BLOCK');
  const changes=account?await rpc.getLogs({address:market.stopRegistry,fromBlock:start.number,toBlock:pinned.number}):[];
  if(changes.length)throw new Error('REGISTRY_CHANGED_DURING_DISCOVERY_RETRY_READONLY');
  const blockNumber=pinned.number;
  const confirmedBook=await rpc.readContract({address:target,abi:poolReadAbi,functionName:'getOrderBookParameters',blockNumber});
  const confirmedRegistry=await rpc.readContract({address:system.perpPoolFactory,abi:factoryReadAbi,functionName:'getStopOrderRegistry',args:[target],blockNumber});
  if(!same(confirmedRegistry,registry)||confirmedBook.tickSize!==book.tickSize||confirmedBook.lotSize!==book.lotSize||confirmedBook.minQuantity!==book.minQuantity)throw new Error('MARKET_CONFIGURATION_CHANGED');
  const [feed,deposit]=await Promise.all([
   rpc.readContract({address:target,abi:poolReadAbi,functionName:'tryGetMarkPrice',blockNumber}),
   rpc.readContract({address:market.stopRegistry,abi:stopReadAbi,functionName:'somiPaymentPerOrder',blockNumber})]);
  result.market={chainId:NETWORK.chainId,genesisHash:genesis.hash,pool:target,marginBank:market.marginBank,stopRegistry:market.stopRegistry,symbol:`${market.baseSymbol??'?'} / ${market.quoteSymbol??'?'}`,baseDecimals:market.baseDecimals,quoteDecimals:market.quoteDecimals,tickSize:market.tickSize,lotSize:market.lotSize,minQuantity:market.minQuantity,mark:feed[1].toString(),feedValid:feed[0]&&feed[1]>0n,observedBlock:blockNumber.toString(),blockHash:pinned.hash,observedAt:new Date(Number(pinned.timestamp)*1000).toISOString(),stopDeposit:deposit.toString()};
  if(!account){result.readError='OWNER_NOT_CONFIGURED';return result;}
  const position=await rpc.readContract({address:market.marginBank,abi:bankReadAbi,functionName:'getPosition',args:[account,target],blockNumber});
  result.position={chainId:NETWORK.chainId,owner:account,pool:target,signedSize:position.size.toString(),entryPrice:position.avgEntryPrice.toString(),observedBlock:blockNumber.toString(),observedAt:result.market.observedAt,source:'chain'};
  for(const row of indexed){
   if(!same(row.owner,account)||!same(row.market.poolAddress,target)||!same(row.registry,market.stopRegistry))throw new Error('STOP_SCOPE_MISMATCH');
   const [live,stored]=await rpc.readContract({address:market.stopRegistry,abi:stopReadAbi,functionName:'getPendingOrder',args:[BigInt(row.orderIdRaw)],blockNumber});
   if(!live)throw new Error('INDEXER_CHAIN_STOP_DISAGREEMENT');
   const t=stored.orderWithTrigger;
   if(!same(t.order.owner,account)||![0,1].includes(stored.intent)||![0,1].includes(t.triggerOperator)||![0,1].includes(t.orderType))throw new Error('STOP_CHAIN_FIELDS_UNVERIFIED');
   result.stops.push({id:row.orderIdRaw,owner:t.order.owner,pool:target,registry:market.stopRegistry,intent:stored.intent===0?'reduceOnly':'opening',isBid:t.order.isBid,quantity:t.order.quantity.toString(),triggerPrice:t.triggerPrice.toString(),triggerOperator:t.triggerOperator as 0|1,stopOrderType:t.orderType as 0|1,limitPrice:t.limitPrice.toString(),status:'pending',siblingId:stored.siblingOrderId===0n?null:stored.siblingOrderId.toString(),observedBlock:blockNumber.toString()});
  }
  result.stopDiscovery={fromBlock:start.number.toString(),toBlock:blockNumber.toString(),indexerWaitedThrough:indexerWaitedThrough.toString(),mutationFree:true};
  const canonical=await rpc.getBlock({blockNumber});
  result.scope='indexedSnapshot';result.capturedAt=new Date().toISOString();
  result.complete=canonical.hash===pinned.hash;
  result.readError=result.complete?null:'NON_CANONICAL_SNAPSHOT';
  return result;
 }catch(e){result.readError=errorText(e);result.complete=false;return result;}
 finally{if(exchange)try{await exchange.close();}catch(e){result.complete=false;result.readError=[result.readError,`SDK_CLEANUP_FAILED:${errorText(e)}`].filter(Boolean).join('; ').slice(0,3000);}}
}

/** Pure typed parameters. No approval check is skipped and no transaction is sent here. */
export function stopParams(draft:RepairDraft):PlacePerpStopOrderParams {
 if(draft.chainId!==NETWORK.chainId||draft.action!=='create-sl'||draft.intent!=='reduceOnly')throw new Error('UNSUPPORTED_DRAFT');
 if(!/^\d+$/.test(draft.quantity)||!/^\d+$/.test(draft.triggerPrice)||BigInt(draft.triggerPrice)<=0n||!/^\d+$/.test(draft.deposit))throw new Error('INVALID_RAW_AMOUNT');
 return {registry:checkedAddress(draft.registry),pool:checkedAddress(draft.pool),operatorRegistry:NETWORK.operatorRegistry,intent:'reduceOnly',isBid:draft.isBid,quantity:BigInt(draft.quantity),triggerPrice:BigInt(draft.triggerPrice),triggerOperator:draft.triggerOperator,stopOrderType:1,limitPrice:0n,somiPayment:BigInt(draft.deposit)};
}

/** Local owner UI only. Preparation never invokes wallet signing. Call returned execute only after journaling
 * and explicit native wallet confirmation. Operator grant is a separate explicit action, never auto-sent. */
export async function prepareOwnerCall(draft:RepairDraft,provider:EIP1193Provider) {
 const wallet=createWalletClient({chain,transport:custom(provider)});
 const [account]=await wallet.getAddresses();
 if(!account||!same(account,draft.owner))throw new Error('OWNER_WALLET_REQUIRED');
 if(await wallet.getChainId()!==NETWORK.chainId)throw new Error('WRONG_WALLET_CHAIN');
 const reader=createProtocolReader();
 try {
  const ownerCode=await httpClient().getCode({address:account});if(ownerCode&&ownerCode!=='0x')throw new Error('SMART_ACCOUNT_NOT_SUPPORTED');
  const market=await reader.client.getPerpMarket(draft.pool);
  if(!market?.stopRegistry||!same(market.stopRegistry,draft.registry))throw new Error('REGISTRY_POOL_MISMATCH');
  const rpc=httpClient();
  const currentPayment=await rpc.readContract({address:market.stopRegistry,abi:stopReadAbi,functionName:'somiPaymentPerOrder'});
  if(draft.action==='create-sl'&&currentPayment!==BigInt(draft.deposit))throw new Error('STOP_DEPOSIT_CHANGED');
  const approved=draft.action==='cancel-stop'||await rpc.readContract({address:market.poolAddress,abi:operatorReadAbi,functionName:'isOperatorAuthorized',args:[account,market.stopRegistry,PLACE_ORDER_FOR_SELECTOR]});
  const exchange=new SomniaMarkets({...protocolConfig(),walletClient:wallet,account});
  try {
   const fresh=await readLiveSnapshot({owner:draft.owner,pool:draft.pool});
   if(!fresh.complete||fresh.readError||!fresh.market||!fresh.position||Date.now()-Date.parse(fresh.market.observedAt)>15000)throw new Error('FRESH_COMPLETE_SNAPSHOT_REQUIRED');
   if(draft.action==='cancel-stop'){
    if(!draft.stopId||!fresh.stops.some(s=>s.id===draft.stopId&&s.status==='pending'&&same(s.owner,draft.owner)&&same(s.pool,draft.pool)&&same(s.registry,draft.registry)))throw new Error('CANCEL_STOP_NOT_VERIFIED');
    return {account,chainId:NETWORK.chainId,call:exchange.trader.buildCancelPerpStopOrder({registry:checkedAddress(draft.registry),orderId:BigInt(draft.stopId)}),approvalRequired:false,approval:null};
   }
   const size=BigInt(fresh.position.signedSize);const trigger=BigInt(draft.triggerPrice);const mark=BigInt(fresh.market.mark);
   if(size===0n||draft.isBid!==(size<0n)||draft.triggerOperator!==(size>0n?1:0)||!fresh.market.feedValid||(size>0n?trigger>=mark:trigger<=mark))throw new Error('DRAFT_NO_LONGER_VALID');
   if(trigger%BigInt(fresh.market.tickSize)!==0n)throw new Error('OFF_GRID_TRIGGER');
   if(fresh.stops.some(s=>s.status==='pending'&&s.intent==='reduceOnly'&&s.isBid===draft.isBid&&s.triggerOperator===draft.triggerOperator))throw new Error('EXISTING_SL_REQUIRES_REVIEW');
   const unsigned=await exchange.trader.buildPlacePerpStopOrder({...stopParams(draft),skipOperatorApproval:approved});
   return {account,chainId:NETWORK.chainId,call:unsigned.stopOrder,approvalRequired:!approved,approval:unsigned.operatorApproval??null};
  }finally{await exchange.close();}
 }finally{await reader.close();}
}
export async function executeNativeSl(draft:RepairDraft,provider:EIP1193Provider):Promise<Hex> {
 const prepared=await prepareOwnerCall(draft,provider);
 if(prepared.approvalRequired)throw new Error('OPERATOR_APPROVAL_REQUIRES_SEPARATE_OWNER_CONFIRMATION');
 const wallet=createWalletClient({chain,transport:custom(provider)});
 const [latestAccount]=await wallet.getAddresses();if(!latestAccount||!same(latestAccount,prepared.account)||await wallet.getChainId()!==NETWORK.chainId)throw new Error('WALLET_CHANGED_BEFORE_SEND');
 return wallet.sendTransaction({account:prepared.account,to:prepared.call.to,data:prepared.call.data,value:prepared.call.value,chain});
}

/** Exact P0 call encoding mirrors the pinned SDK defaults; no RPC or signer. */
export function expectedDraftCall(draft:RepairDraft):{data:Hex;value:bigint} {
 if(draft.chainId!==NETWORK.chainId)throw new Error('UNSUPPORTED_DRAFT');
 if(draft.action==='cancel-stop'){
  if(!draft.stopId||!/^\d+$/.test(draft.stopId))throw new Error('CANCEL_ID_MISSING');
  return {data:encodeFunctionData({abi:transactionAbi,functionName:'cancelPendingOrder',args:[BigInt(draft.stopId)]}),value:0n};
 }
 const p=stopParams(draft);
 return {data:encodeFunctionData({abi:transactionAbi,functionName:'createPendingOrder',args:[{order:{isBid:p.isBid,owner:checkedAddress(draft.owner),userData:0n,quantity:p.quantity},orderType:1,triggerPrice:p.triggerPrice,triggerOperator:p.triggerOperator,limitPrice:0n,builder:'0x0000000000000000000000000000000000000000',builderFeeBpsTimes1k:0n}]}),value:BigInt(draft.deposit)};
}

export interface ReconciliationResult { state:'Applied'|'NeedsReview'|'Failed'|'Unknown';reason:string;snapshot:Snapshot|null;proof:OperationEvidenceProof|null }
export async function reconcileOperation(op:Operation):Promise<ReconciliationResult> {
 const out=(state:ReconciliationResult['state'],reason:string,snapshot:Snapshot|null=null,proof:OperationEvidenceProof|null=null):ReconciliationResult=>({state,reason,snapshot,proof});
 if(!op.txHash||!/^0x[0-9a-fA-F]{64}$/.test(op.txHash))return out('Unknown','TRANSACTION_HASH_MISSING');
 try{
  const rpc=httpClient();if(await rpc.getChainId()!==NETWORK.chainId||op.draft.chainId!==NETWORK.chainId)return out('NeedsReview','CHAIN_MISMATCH');
  const receipt=await rpc.getTransactionReceipt({hash:op.txHash as Hex});
  const canonical=await rpc.getBlock({blockNumber:receipt.blockNumber});
  if(canonical.hash!==receipt.blockHash)return out('Unknown','NON_CANONICAL_RECEIPT');
  if(!same(receipt.from,op.owner)||!receipt.to||!same(receipt.to,op.draft.registry))return out('NeedsReview','RECEIPT_SCOPE_MISMATCH');
  // A manually recovered hash can name an older identical call. Canonical receipt
  // scope (even calldata equality) does not establish original request identity.
  // Keep the owner lock until a future provenance workflow can prove that identity.
  if(op.hashProvenance==='recovered')return out('NeedsReview','RECOVERED_HASH_ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED');
  // Local browser wallet reports are trusted input, not cryptographic provenance.
  // Still reject historical/unrelated hashes before any terminal outcome unlocks the owner.
  const anchor=op.draft.observedBlock;
  const created=Date.parse(op.draft.createdAt);
  if(!anchor||!/^\d+$/.test(anchor)||!Number.isFinite(created))return out('NeedsReview','DRAFT_TRANSACTION_ANCHOR_REQUIRED');
  if(receipt.blockNumber<=BigInt(anchor)||typeof canonical.timestamp!=='bigint'||canonical.timestamp*1000n<BigInt(created))return out('NeedsReview','TRANSACTION_PREDATES_DRAFT');
  const tx=await rpc.getTransaction({hash:op.txHash as Hex});
  const expected=expectedDraftCall(op.draft);
  if(!same(tx.hash,op.txHash)||!same(tx.from,op.owner)||!tx.to||!same(tx.to,op.draft.registry)||tx.blockNumber!==receipt.blockNumber||tx.blockHash!==receipt.blockHash||tx.input.toLowerCase()!==expected.data.toLowerCase()||tx.value!==expected.value)return out('NeedsReview','TRANSACTION_DRAFT_MISMATCH');
  if(receipt.status==='reverted')return out('Failed','RECEIPT_REVERTED');
  if(op.draft.action==='cancel-stop'){
   if(!op.draft.stopId)return out('NeedsReview','CANCEL_ID_MISSING');
   const cancelled=parseEventLogs({abi:stopEventsAbi,logs:receipt.logs,eventName:'PendingOrderCancelled'}).filter(log=>same(log.address,op.draft.registry)&&log.args.orderId===BigInt(op.draft.stopId!));
   if(cancelled.length!==1)return out('NeedsReview','CANCEL_EVENT_MISSING');
   const [live]=await rpc.readContract({address:checkedAddress(op.draft.registry),abi:stopReadAbi,functionName:'getPendingOrder',args:[BigInt(op.draft.stopId)],blockNumber:receipt.blockNumber});
   if(live)return out('NeedsReview','CANCELLED_STOP_STILL_LIVE');
   const snapshot:Snapshot={...await readLiveSnapshot({owner:op.owner,pool:op.pool}),mode:'live-owner'};
   if(!snapshot.complete||snapshot.readError||!snapshot.market||BigInt(snapshot.market.observedBlock)<receipt.blockNumber)return out('Unknown','CANCEL_READBACK_INCOMPLETE',snapshot);
   if(snapshot.market.chainId!==NETWORK.chainId||!same(snapshot.market.pool,op.pool)||!same(snapshot.market.stopRegistry,op.draft.registry)||!same(op.draft.pool,op.pool))return out('NeedsReview','CANCEL_SNAPSHOT_SCOPE_MISMATCH',snapshot);
   if(snapshot.stops.some(s=>s.id===op.draft.stopId||s.siblingId===op.draft.stopId))return out('NeedsReview','CANCEL_OR_SIBLING_LINK_STILL_PRESENT',snapshot);
   if((await rpc.getBlock({blockNumber:receipt.blockNumber})).hash!==receipt.blockHash)return out('Unknown','NON_CANONICAL_RECEIPT',snapshot);
   const event=cancelled[0]!;
   const proof=operationEvidence(op,tx,receipt,canonical,{name:'PendingOrderCancelled',address:event.address,orderId:op.draft.stopId,logIndex:event.logIndex!},{status:'known',value:null,block:evidenceBlock({...canonical,number:receipt.blockNumber}),consistency:'pinned',error:null},snapshot);
   return out('Applied','CANONICAL_CANCEL_EVENT_AND_ABSENCE_READBACK; no fill claim',snapshot,proof);
  }
  const ids=decodePerpStopOrderIds(receipt.logs,checkedAddress(op.draft.registry));
  if(ids.length!==1)return out('NeedsReview','CREATION_EVENT_MISSING_OR_AMBIGUOUS');
  const createdEvents=parseEventLogs({abi:stopEventsAbi,logs:receipt.logs,eventName:'PendingOrderCreated',strict:true}).filter(log=>same(log.address,op.draft.registry)&&log.args.orderId===ids[0]);
  if(createdEvents.length!==1)return out('NeedsReview','CREATION_EVENT_MISSING_OR_AMBIGUOUS');
  const createdEvent=createdEvents[0]!;const terms=createdEvent.args;
  if(!same(terms.owner,op.owner)||terms.isBid!==op.draft.isBid||terms.quantity!==BigInt(op.draft.quantity)||terms.triggerPrice!==BigInt(op.draft.triggerPrice)||terms.triggerOperator!==op.draft.triggerOperator||terms.orderType!==1||!same(terms.builder,'0x0000000000000000000000000000000000000000')||terms.builderFeeBpsTimes1k!==0n)return out('NeedsReview','CREATION_EVENT_DRAFT_MISMATCH');
  const readBlock=await rpc.getBlock();
  if(readBlock.number<receipt.blockNumber)return out('Unknown','READ_BEFORE_RECEIPT');
  const [live,stored]=await rpc.readContract({address:checkedAddress(op.draft.registry),abi:stopReadAbi,functionName:'getPendingOrder',args:[ids[0]!],blockNumber:readBlock.number});
  if(!live)return out('NeedsReview','STOP_NOT_PENDING; receipt is not fill evidence');
  const stop=stored.orderWithTrigger;
  if(stored.siblingOrderId!==0n||!same(stop.order.owner,op.owner)||stored.intent!==0||stop.order.isBid!==op.draft.isBid||stop.order.quantity!==BigInt(op.draft.quantity)||stop.triggerPrice!==BigInt(op.draft.triggerPrice)||stop.triggerOperator!==op.draft.triggerOperator||stop.orderType!==1||stop.limitPrice!==0n)return out('NeedsReview','STOP_READBACK_MISMATCH');
  const snapshot:Snapshot={...await readLiveSnapshot({owner:op.owner,pool:op.pool}),mode:'live-owner'};
  if(!snapshot.complete||snapshot.readError||!snapshot.market||BigInt(snapshot.market.observedBlock)<readBlock.number)return out('Unknown','READBACK_SNAPSHOT_NOT_COMPLETE',snapshot);
  // The pinned SDK order struct has no pool field. Bind through the factory-verified
  // snapshot registry/pool, and recheck all parameters at its later canonical block.
  const matched=snapshot.stops.find(s=>s.id===ids[0]!.toString()&&same(s.registry,op.draft.registry));
  if(snapshot.market.chainId!==NETWORK.chainId||!same(snapshot.market.pool,op.pool)||!same(snapshot.market.stopRegistry,op.draft.registry)||!same(op.draft.pool,op.pool)||!matched||matched.status!=='pending'||!same(matched.owner,op.owner)||!same(matched.pool,op.pool)||matched.intent!=='reduceOnly'||matched.isBid!==op.draft.isBid||BigInt(matched.quantity)!==BigInt(op.draft.quantity)||BigInt(matched.triggerPrice)!==BigInt(op.draft.triggerPrice)||matched.triggerOperator!==op.draft.triggerOperator||matched.stopOrderType!==1||matched.limitPrice!=='0'||matched.siblingId!==null)return out('NeedsReview','STOP_SNAPSHOT_READBACK_MISMATCH',snapshot);
  const [receiptAgain,readAgain]=await Promise.all([rpc.getBlock({blockNumber:receipt.blockNumber}),rpc.getBlock({blockNumber:readBlock.number})]);
  if(receiptAgain.hash!==receipt.blockHash)return out('Unknown','NON_CANONICAL_RECEIPT',snapshot);
  if(readAgain.hash!==readBlock.hash)return out('Unknown','NON_CANONICAL_NATIVE_READBACK',snapshot);
  const nativeReadback:NativeStopSnapshot={id:ids[0]!.toString(),owner:stop.order.owner,pool:op.pool,registry:op.draft.registry,intent:'reduceOnly',isBid:stop.order.isBid,quantity:stop.order.quantity.toString(),triggerPrice:stop.triggerPrice.toString(),triggerOperator:stop.triggerOperator as 0|1,stopOrderType:1,limitPrice:stop.limitPrice.toString(),status:'pending',siblingId:null,observedBlock:readBlock.number.toString()};
  const proof=operationEvidence(op,tx,receipt,canonical,{name:'PendingOrderCreated',address:createdEvent.address,orderId:ids[0]!.toString(),logIndex:createdEvent.logIndex!},{status:'known',value:nativeReadback,block:evidenceBlock(readBlock),consistency:'pinned',error:null},snapshot);
  return out('Applied','CANONICAL_RECEIPT_AND_NATIVE_STOP_READBACK',snapshot,proof);
 }catch(e){return out('Unknown',errorText(e));}
}

/** Same gated sender; cancel is a distinct draft and wallet confirmation, not a batch. */
export const executeNativeCancel = executeNativeSl;
