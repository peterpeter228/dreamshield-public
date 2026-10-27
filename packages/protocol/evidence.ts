import { marginBankEventsAbi, orderBookEventsAbi, perpPoolWriteAbi, type PerpStopOrder } from '@somnia-chain/markets-sdk';
import { decodeFunctionData, encodeFunctionData, parseAbi, parseEventLogs, type Address, type Hex, type PublicClient, type Transaction, type TransactionReceipt } from 'viem';
import type { NativeStopSnapshot, Operation, PositionSnapshot, Snapshot } from '../domain/types.js';
import type { EvidenceBlock, EvidenceIdentity, EvidenceObservation, EvidenceProvenance, EvidenceRead, EvidenceReceipt, EvidenceTransaction, NativeStopEventProof, OpeningEvidenceProof, OpeningOrderProof, OperationEvidenceProof, ResidualEvidence, ResidualOrder } from '../domain/live-evidence.js';
import { bankReadAbi, factoryReadAbi, poolReadAbi, stopReadAbi, tokenReadAbi } from './sdk-abi.js';
import { checkedAddress, createProtocolReader, discoverStops, httpClient, NETWORK, readLiveSnapshot } from './index.js';

// Verbatim views from pinned @somnia-chain/markets-sdk 0.32.1 src/readsAbi.ts
// (MIT). Its getOpenOrdersOnchain joins these same calls; use our canonical HTTP
// client instead of assigning its separate WebSocket transport our block hash.
const restingOrderReadAbi=parseAbi([
 'function getOwnOpenOrders() view returns (uint128[])',
 'function getOrder(uint128 orderId) view returns ((uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs))',
]);
const same = (a:string,b:string) => a.toLowerCase()===b.toLowerCase();
const hash = /^0x[0-9a-fA-F]{64}$/;
const errorText = (error:unknown) => error instanceof Error ? `${error.name}: ${error.message}`.slice(0,1500) : String(error).slice(0,1500);
const known = <T>(value:T,block:EvidenceBlock):EvidenceRead<T> => ({status:'known',value,block,consistency:'pinned',error:null});
const unavailable = <T>(error:string,block:EvidenceBlock|null=null,status:'unknown'|'error'='error'):EvidenceRead<T> => ({status,value:null,block,consistency:block?'pinned':'unavailable',error});
async function readAt<T>(block:EvidenceBlock,read:()=>Promise<T>):Promise<EvidenceRead<T>> {
 try{return known(await read(),block);}catch(error){return unavailable(errorText(error),block);}
}
export function evidenceBlock(block:{number:bigint;hash:string|null;timestamp:bigint}):EvidenceBlock {
 if(!block.hash||!hash.test(block.hash))throw new Error('EVIDENCE_BLOCK_HASH_UNAVAILABLE');
 return {number:block.number.toString(),hash:block.hash,timestamp:new Date(Number(block.timestamp)*1000).toISOString()};
}
export function evidenceIdentity(snapshot:Snapshot,owner:string):EvidenceIdentity {
 const market=snapshot.market;
 if(!market||!market.genesisHash||!hash.test(market.genesisHash))throw new Error('VALIDATED_GENESIS_AND_MARKET_REQUIRED');
 return {chainId:50383,genesisHash:market.genesisHash,owner,signer:owner,pool:market.pool,marginBank:market.marginBank,stopRegistry:market.stopRegistry};
}
export function sanitizeEvidenceTransaction(tx:Transaction):EvidenceTransaction {
 if(!tx.to||tx.blockNumber===null||!tx.blockHash)throw new Error('MINED_DIRECT_TRANSACTION_REQUIRED');
 return {hash:tx.hash,chainId:50383,from:tx.from,to:tx.to,input:tx.input,value:tx.value.toString(),blockNumber:tx.blockNumber.toString(),blockHash:tx.blockHash};
}
export function sanitizeEvidenceReceipt(receipt:TransactionReceipt,canonical:{number:bigint;hash:string|null;timestamp:bigint}):EvidenceReceipt {
 if(!receipt.to||!canonical.hash||canonical.number!==receipt.blockNumber||canonical.hash!==receipt.blockHash||!hash.test(receipt.transactionHash))throw new Error('CANONICAL_DIRECT_RECEIPT_REQUIRED');
 return {transactionHash:receipt.transactionHash,from:receipt.from,to:receipt.to,status:receipt.status,block:evidenceBlock({...canonical,number:receipt.blockNumber}),canonicalBlockHash:canonical.hash,logs:receipt.logs.map(log=>({address:log.address,data:log.data,topics:[...log.topics],logIndex:log.logIndex}))};
}
export function operationEvidence(op:Operation,tx:Transaction,receipt:TransactionReceipt,canonical:{number:bigint;hash:string|null;timestamp:bigint},event:NativeStopEventProof,nativeReadback:EvidenceRead<NativeStopSnapshot|null>,snapshot:Snapshot):OperationEvidenceProof {
 if(!op.txHash)throw new Error('TRANSACTION_HASH_MISSING');
 if(!same(op.txHash,tx.hash)||!same(op.txHash,receipt.transactionHash)||op.hashProvenance==='recovered')throw new Error('OPERATION_PROOF_TRANSACTION_BINDING_MISMATCH');
 return {identity:evidenceIdentity(snapshot,op.owner),intent:{operationId:op.id,idempotencyKey:op.idempotencyKey,draftFingerprint:op.draft.fingerprint,draftRevision:op.draft.revision,txHash:op.txHash,hashProvenance:'original'},transaction:sanitizeEvidenceTransaction(tx),receipt:sanitizeEvidenceReceipt(receipt,canonical),event,nativeReadback,snapshot,reconciledAt:new Date().toISOString()};
}

/** A caller supplies only local journal/provenance metadata, never verification assertions.
 * This module constructs no wallet and invokes no trader, preparation or sending method. */
export interface CaptureEvidenceInput {
 owner:string;pool:string;kind:EvidenceObservation['kind'];openingTxHash?:string;
 id:string;lifecycleId:string;provenance:EvidenceProvenance;
}
export async function captureEvidenceObservation(input:CaptureEvidenceInput):Promise<EvidenceObservation> {
 const owner=checkedAddress(input.owner);const pool=checkedAddress(input.pool);
 if(!['opening','missing-sl','gap','residual'].includes(input.kind))throw new Error('UNSUPPORTED_EVIDENCE_KIND');
 if(!input.id||!input.lifecycleId||input.provenance.mode!=='live-owner')throw new Error('LOCAL_EVIDENCE_IDENTITY_REQUIRED');
 if(input.kind==='opening'?!input.openingTxHash||!hash.test(input.openingTxHash):input.openingTxHash!==undefined)throw new Error('OPENING_HASH_REQUIRED_ONLY_FOR_OPENING');
 // Obtain a verified market independently of owner discovery. An indexer failure can
 // then be exported as unknown stops without erasing independently pinned balances.
 const base=await readLiveSnapshot({owner:null,pool});
 if(!base.market||base.readError!=='OWNER_NOT_CONFIGURED')throw new Error(base.readError??'VERIFIED_MARKET_REQUIRED');
 const identity=evidenceIdentity(base,owner);const rpc=httpClient();
 if(await rpc.getChainId()!==NETWORK.chainId)throw new Error('WRONG_CHAIN');
 const exchange=createProtocolReader();
 let primaryError:unknown=null;
 try {
  const fromBlock=BigInt(base.market.observedBlock);
  let indexed:PerpStopOrder[]=[];let discoveryError:string|null=null;let indexerWaitedThrough=fromBlock;
  try {
   await exchange.client.waitForIndexedBlock(NETWORK.chainId,fromBlock,{timeoutMs:10000});
   indexed=await discoverStops((offset,limit)=>exchange.client.listPerpStopOrders({account:owner,pool,status:['PENDING'],offset,limit}));
   const freshness=await exchange.client.getIndexerFreshness(NETWORK.chainId);
   if(!freshness||freshness.chainId!==NETWORK.chainId||freshness.latestProcessedBlock===null||!Number.isSafeInteger(freshness.latestProcessedBlock))throw new Error('INDEXER_PROCESSED_BOUND_UNAVAILABLE');
   indexerWaitedThrough=BigInt(freshness.latestProcessedBlock);
   if(indexerWaitedThrough<fromBlock)throw new Error('INDEXER_WATERMARK_REGRESSED');
  }catch(error){discoveryError=errorText(error);}
  const pinned=await rpc.getBlock();const block=evidenceBlock(pinned);const blockNumber=pinned.number;
  if(blockNumber<fromBlock)throw new Error('EVIDENCE_BLOCK_PRECEDES_VERIFIED_MARKET');
  if(indexerWaitedThrough>blockNumber)discoveryError='INDEXER_AHEAD_OF_PINNED_BLOCK';
  const ownerCode=await rpc.getCode({address:owner,blockNumber});
  if(ownerCode&&ownerCode!=='0x')throw new Error('SMART_ACCOUNT_NOT_SUPPORTED');
  const config=await readAt(block,async()=>{
   const [book,registry]=await Promise.all([
    rpc.readContract({address:pool,abi:poolReadAbi,functionName:'getOrderBookParameters',blockNumber}),
    rpc.readContract({address:NETWORK.factory,abi:factoryReadAbi,functionName:'getStopOrderRegistry',args:[pool],blockNumber})]);
   if(!same(registry,identity.stopRegistry)||book.tickSize.toString()!==base.market!.tickSize||book.lotSize.toString()!==base.market!.lotSize||book.minQuantity.toString()!==base.market!.minQuantity)throw new Error('MARKET_CONFIGURATION_CHANGED');
   return true;
  });
  const [feed,deposit,position,nativeStops]=await Promise.all([
   readAt(block,()=>rpc.readContract({address:pool,abi:poolReadAbi,functionName:'tryGetMarkPrice',blockNumber})),
   readAt(block,async()=>(await rpc.readContract({address:checkedAddress(identity.stopRegistry),abi:stopReadAbi,functionName:'somiPaymentPerOrder',blockNumber})).toString()),
   readAt<PositionSnapshot>(block,async()=>{
    const p=await rpc.readContract({address:checkedAddress(identity.marginBank),abi:bankReadAbi,functionName:'getPosition',args:[owner,pool],blockNumber});
    return {chainId:50383,owner,pool,signedSize:p.size.toString(),entryPrice:p.avgEntryPrice.toString(),observedBlock:block.number,observedAt:block.timestamp,source:'chain'};
   }),
   readAt<NativeStopSnapshot[]>(block,async()=>{
    if(discoveryError)throw new Error(discoveryError);
    if(config.status!=='known')throw new Error(config.error);
    const changes=await rpc.getLogs({address:checkedAddress(identity.stopRegistry),fromBlock,toBlock:blockNumber});
    if(changes.length)throw new Error('REGISTRY_CHANGED_DURING_DISCOVERY_RETRY_READONLY');
    const stops:NativeStopSnapshot[]=[];
    for(const row of indexed){
     if(!same(row.owner,owner)||!same(row.market.poolAddress,pool)||!same(row.registry,identity.stopRegistry))throw new Error('STOP_SCOPE_MISMATCH');
     const [live,stored]=await rpc.readContract({address:checkedAddress(identity.stopRegistry),abi:stopReadAbi,functionName:'getPendingOrder',args:[BigInt(row.orderIdRaw)],blockNumber});
     if(!live)throw new Error('INDEXER_CHAIN_STOP_DISAGREEMENT');
     const t=stored.orderWithTrigger;
     if(!same(t.order.owner,owner)||![0,1].includes(stored.intent)||![0,1].includes(t.triggerOperator)||![0,1].includes(t.orderType))throw new Error('STOP_CHAIN_FIELDS_UNVERIFIED');
     stops.push({id:row.orderIdRaw,owner:t.order.owner,pool,registry:identity.stopRegistry,intent:stored.intent===0?'reduceOnly':'opening',isBid:t.order.isBid,quantity:t.order.quantity.toString(),triggerPrice:t.triggerPrice.toString(),triggerOperator:t.triggerOperator as 0|1,stopOrderType:t.orderType as 0|1,limitPrice:t.limitPrice.toString(),status:'pending',siblingId:stored.siblingOrderId===0n?null:stored.siblingOrderId.toString(),observedBlock:block.number});
    }
    return stops;
   })]);
  if(nativeStops.status!=='known'&&discoveryError)nativeStops.consistency='unpinned';
  const errors=[config,feed,deposit,position,nativeStops].flatMap(read=>read.status==='known'?[]:[read.error]);
  const snapshot:Snapshot={...base,mode:'live-owner',market:{...base.market,observedBlock:block.number,blockHash:block.hash,observedAt:block.timestamp,mark:feed.status==='known'?feed.value[1].toString():'0',feedValid:feed.status==='known'&&feed.value[0]&&feed.value[1]>0n,stopDeposit:deposit.status==='known'?deposit.value:null},position:position.status==='known'?position.value:null,stops:nativeStops.status==='known'?nativeStops.value:[],scope:nativeStops.status==='known'?'indexedSnapshot':'unavailable',complete:errors.length===0,readError:errors.length?errors.join('; ').slice(0,1500):null,capturedAt:'',stopDiscovery:{fromBlock:fromBlock.toString(),toBlock:block.number,indexerWaitedThrough:indexerWaitedThrough.toString(),mutationFree:nativeStops.status==='known'}};
  let opening:OpeningEvidenceProof|undefined;let residuals:ResidualEvidence|undefined;
  if(input.kind==='opening')opening=await captureOpening(input.openingTxHash! as Hex,owner,pool,identity,rpc);
  if(input.kind==='residual'){
   const [restingOrders,walletStt,walletCollateral,bank]=await Promise.all([
    readAt<ResidualOrder[]>(block,async()=>{
     // getOwnOpenOrders reads msg.sender: a DIRECT eth_call from the public owner
     // is mandatory. Multicall would silently read the aggregator's empty set.
     const orderIds=await rpc.readContract({address:pool,abi:restingOrderReadAbi,functionName:'getOwnOpenOrders',account:owner,blockNumber});
     const orders=await Promise.all(orderIds.map(orderId=>rpc.readContract({address:pool,abi:restingOrderReadAbi,functionName:'getOrder',args:[orderId],blockNumber})));
     const ids=new Set<string>();
     return orders.map((order,index)=>{
      if(order.orderId!==orderIds[index]||!same(order.owner,owner)||ids.has(order.orderId.toString())||order.quantityRemaining<=0n||order.quantityRemaining>order.fullQuantity)throw new Error('RESTING_ORDER_SCOPE_OR_QUANTITY_MISMATCH');
      ids.add(order.orderId.toString());
      return {id:order.orderId.toString(),owner:order.owner,pool,isBid:order.isBid,quantity:order.quantityRemaining.toString()};
     });
    }),
    readAt(block,async()=>(await rpc.getBalance({address:owner,blockNumber})).toString()),
    readAt(block,async()=>(await rpc.readContract({address:NETWORK.collateral,abi:tokenReadAbi,functionName:'balanceOf',args:[owner],blockNumber})).toString()),
    readAt(block,()=>rpc.readContract({address:checkedAddress(identity.marginBank),abi:bankReadAbi,functionName:'getAccountState',args:[owner],blockNumber}))]);
   residuals={position,nativeStops,restingOrders,walletStt,walletCollateral,bankUnlockedCollateral:bank.status==='known'?known(bank.value.unlockedCollateralBalance.toString(),block):unavailable(bank.error,block,bank.status),bankLockedCollateral:bank.status==='known'?known(bank.value.lockedCollateral.toString(),block):unavailable(bank.error,block,bank.status)};
  }
  const [canonical,original,genesis]=await Promise.all([rpc.getBlock({blockNumber}),rpc.getBlock({blockNumber:fromBlock}),rpc.getBlock({blockNumber:1n})]);
  if(canonical.hash!==pinned.hash||original.hash!==base.market.blockHash)throw new Error('NON_CANONICAL_EVIDENCE_SNAPSHOT');
  if(genesis.hash!==identity.genesisHash||await rpc.getChainId()!==NETWORK.chainId)throw new Error('CHAIN_IDENTITY_CHANGED_DURING_CAPTURE');
  snapshot.capturedAt=new Date().toISOString();
  return {id:input.id,lifecycleId:input.lifecycleId,kind:input.kind,identity,provenance:{...input.provenance,capturedAt:snapshot.capturedAt},snapshot,...(opening?{opening}:{}),...(residuals?{residuals}:{})};
 }catch(error){primaryError=error;throw error;}
 finally{try{await exchange.close();}catch(error){throw new Error(`EVIDENCE_SDK_CLEANUP_FAILED:${errorText(error)}${primaryError?`; primary: ${errorText(primaryError)}`:''}`,{cause:primaryError??error});}}
}

async function captureOpening(txHash:Hex,owner:Address,pool:Address,identity:EvidenceIdentity,rpc:PublicClient):Promise<OpeningEvidenceProof> {
 const [tx,receipt]=await Promise.all([rpc.getTransaction({hash:txHash}),rpc.getTransactionReceipt({hash:txHash})]);
 const canonical=await rpc.getBlock({blockNumber:receipt.blockNumber});const block=evidenceBlock(canonical);
 if(receipt.blockHash!==canonical.hash||!same(receipt.transactionHash,txHash))throw new Error('NON_CANONICAL_OPENING_RECEIPT');
 if(!same(tx.hash,txHash)||!same(tx.from,owner)||!tx.to||!same(tx.to,pool)||!same(receipt.from,owner)||!receipt.to||!same(receipt.to,pool)||tx.blockNumber!==receipt.blockNumber||tx.blockHash!==receipt.blockHash||(tx.chainId!==undefined&&tx.chainId!==NETWORK.chainId))throw new Error('OPENING_TRANSACTION_SCOPE_MISMATCH');
 const transaction=sanitizeEvidenceTransaction(tx);const sanitizedReceipt=sanitizeEvidenceReceipt(receipt,canonical);
 const position=await readAt<PositionSnapshot>(block,async()=>{
  const p=await rpc.readContract({address:checkedAddress(identity.marginBank),abi:bankReadAbi,functionName:'getPosition',args:[owner,pool],blockNumber:receipt.blockNumber});
  return {chainId:50383,owner,pool,signedSize:p.size.toString(),entryPrice:p.avgEntryPrice.toString(),observedBlock:block.number,observedAt:block.timestamp,source:'chain'};
 });
 const order=await readAt<OpeningOrderProof>(block,async()=>{
  if(receipt.status!=='success')throw new Error('OPENING_RECEIPT_REVERTED');
  if(tx.value!==0n)throw new Error('PERP_OPENING_MUST_BE_NONPAYABLE');
  const code=await rpc.getCode({address:owner,blockNumber:receipt.blockNumber});
  if(code&&code!=='0x')throw new Error('OPENING_REQUIRES_DIRECT_EOA_OWNER');
  const decoded=decodeFunctionData({abi:perpPoolWriteAbi,data:tx.input});
  if(decoded.functionName!=='placeOrder')throw new Error('OPENING_REQUIRES_PINNED_SDK_DIRECT_PERP_PLACE_ORDER');
  const [isBid,userData,price,quantity,expireTimestampNs,orderType,selfMatchingOption,builder,builderFeeBpsTimes1k]=decoded.args;
  if(quantity<=0n||price<=0n||![0,1,2,3].includes(orderType)||![0,1].includes(selfMatchingOption)||encodeFunctionData({abi:perpPoolWriteAbi,functionName:'placeOrder',args:[isBid,userData,price,quantity,expireTimestampNs,orderType,selfMatchingOption,builder,builderFeeBpsTimes1k]}).toLowerCase()!==tx.input.toLowerCase())throw new Error('OPENING_CALLDATA_INVALID');
  const placed=parseEventLogs({abi:orderBookEventsAbi,logs:receipt.logs,eventName:'OrderPlaced',strict:true}).filter(log=>same(log.address,pool));
  if(placed.length!==1)throw new Error('OPENING_ORDER_EVENT_MISSING_OR_AMBIGUOUS');
  const event=placed[0]!;const o=event.args.placedOrder;const orderId=event.args.orderId;
  if(orderId!==o.orderId||!same(o.owner,owner)||o.isBid!==isBid||o.userData!==userData||o.price!==price||o.fullQuantity!==quantity||o.expireTimestampNs!==expireTimestampNs||o.quantityRemaining>quantity)throw new Error('OPENING_ORDER_CALLDATA_MISMATCH');
  const fills=parseEventLogs({abi:orderBookEventsAbi,logs:receipt.logs,eventName:'OrderFilled',strict:true}).filter(log=>same(log.address,pool)&&log.args.takerOrderId===orderId);
  if(!fills.length)throw new Error('OPENING_OWNER_BOUND_FILL_REQUIRED');
  let remaining=quantity;let filled=0n;let previousLogIndex=-1;
  for(const fill of fills){
   if(fill.logIndex===null||fill.logIndex<=previousLogIndex||fill.args.quantityFilled<=0n||fill.args.fillPrice<=0n||fill.args.quantityFilled>remaining||fill.args.takerRemainingQuantity!==remaining-fill.args.quantityFilled)throw new Error('OPENING_FILL_SEQUENCE_OR_QUANTITY_MISMATCH');
   filled+=fill.args.quantityFilled;remaining=fill.args.takerRemainingQuantity;previousLogIndex=fill.logIndex;
  }
  const updates=parseEventLogs({abi:marginBankEventsAbi,logs:receipt.logs,eventName:'PositionUpdated',strict:true}).filter(log=>same(log.address,identity.marginBank)&&same(log.args.account,owner)&&same(log.args.perpPool,pool));
  const last=updates.at(-1);
  if(position.status!=='known'||!last||filled<=0n||BigInt(position.value.signedSize)!==(isBid?filled:-filled)||last.args.newSize!==BigInt(position.value.signedSize)||last.args.avgEntryPrice!==BigInt(position.value.entryPrice))throw new Error('OPENING_NONZERO_COMPLETE_POSITION_AND_FILL_BINDING_REQUIRED');
  return {decoder:'@somnia-chain/markets-sdk@0.32.1:perpPoolWriteAbi.placeOrder+orderBookEventsAbi.OrderPlaced/OrderFilled+marginBankEventsAbi.PositionUpdated',owner,pool,isBid,requestedQuantity:quantity.toString(),filledQuantity:filled.toString(),remainingQuantity:remaining.toString(),orderId:orderId.toString(),fills:fills.map(fill=>({owner,pool,orderId:orderId.toString(),quantity:fill.args.quantityFilled.toString(),transactionHash:txHash,logIndex:fill.logIndex!}))};
 });
 const rechecked=await rpc.getBlock({blockNumber:receipt.blockNumber});
 if(rechecked.hash!==receipt.blockHash)throw new Error('NON_CANONICAL_OPENING_RECEIPT');
 return {transaction,receipt:sanitizedReceipt,order,position};
}
