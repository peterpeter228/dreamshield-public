import {beforeEach,describe,expect,it,vi} from 'vitest';
import {encodeAbiParameters,encodeEventTopics,parseAbiParameters} from 'viem';
import {stopEventsAbi} from '../../packages/protocol/sdk-abi.ts';
import type {Operation,RepairDraft} from '../../packages/domain/types.ts';
const mocks=vi.hoisted(()=>({rpc:{getChainId:vi.fn(),getTransactionReceipt:vi.fn(),getTransaction:vi.fn(),getBlock:vi.fn(),getCode:vi.fn(),getLogs:vi.fn(),readContract:vi.fn()},client:{getPerpMarket:vi.fn(),waitForIndexedBlock:vi.fn(),listPerpStopOrders:vi.fn(),getIndexerFreshness:vi.fn()},trader:{buildCancelPerpStopOrder:vi.fn()},wallet:{getAddresses:vi.fn(),getChainId:vi.fn()}}));
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createPublicClient:()=>mocks.rpc,createWalletClient:()=>mocks.wallet}));
vi.mock('@somnia-chain/markets-sdk',async original=>({...await original<typeof import('@somnia-chain/markets-sdk')>(),decodePerpStopOrderIds:()=>[1n],SomniaMarkets:class {client=mocks.client;trader=mocks.trader;async close(){}}}));
import {NETWORK,prepareOwnerCall,reconcileOperation,expectedDraftCall} from '../../packages/protocol/index.ts';
const owner='0x1111111111111111111111111111111111111111';const pool='0x2222222222222222222222222222222222222222';const registry='0x3333333333333333333333333333333333333333';const other='0x4444444444444444444444444444444444444444';
const draft:RepairDraft={revision:1,observedBlock:'99',fingerprint:'test',owner,pool,registry,chainId:50383,action:'create-sl',stopId:null,isBid:false,triggerOperator:1,triggerPrice:'100',quantity:'0',intent:'reduceOnly',deposit:'15',createdAt:new Date(Math.floor(Date.now()/1000)*1000).toISOString()};
const op:Operation={id:'test',idempotencyKey:'test',owner,pool,state:'Reconcile',draft,txHash:'0x'+'a'.repeat(64),error:null,createdAt:draft.createdAt,updatedAt:draft.createdAt};
const stored=()=>({orderWithTrigger:{order:{owner,isBid:false,quantity:0n,userData:0n},orderType:1,triggerPrice:100n,triggerOperator:1,limitPrice:0n},orderId:1n,somiPaid:15n,siblingOrderId:0n,intent:0});
const canonicalHash='0x'+'c'.repeat(64);
const creationLog=()=>({address:registry,data:encodeAbiParameters(parseAbiParameters('bool,uint256,uint256,uint8,uint8,address,uint96'),[false,0n,100n,1,1,'0x0000000000000000000000000000000000000000',0n]),topics:encodeEventTopics({abi:stopEventsAbi,eventName:'PendingOrderCreated',args:{orderId:1n,owner}}),logIndex:0,blockNumber:100n,blockHash:canonicalHash,transactionHash:op.txHash,transactionIndex:0,removed:false});
let freshRegistry:string;let initial:ReturnType<typeof stored>;let subsequent:ReturnType<typeof stored>;let pendingReads:number;
beforeEach(()=>{
 vi.clearAllMocks();freshRegistry=registry;initial=stored();subsequent=stored();pendingReads=0;
 mocks.wallet.getAddresses.mockResolvedValue([owner]);mocks.wallet.getChainId.mockResolvedValue(50383);
 mocks.client.getPerpMarket.mockResolvedValue({poolAddress:pool,stopRegistry:registry});
 mocks.client.waitForIndexedBlock.mockResolvedValue(undefined);
 mocks.client.listPerpStopOrders.mockImplementation(async()=>[{id:'indexed-1',orderIdRaw:'1',owner,registry:freshRegistry,market:{poolAddress:pool}}]);
 mocks.trader.buildCancelPerpStopOrder.mockReturnValue({to:registry,data:'0x',value:0n});
 mocks.rpc.getChainId.mockResolvedValue(50383);
 let latestBlock=100n;
 mocks.client.getIndexerFreshness.mockImplementation(async()=>({chainId:50383,latestProcessedBlock:Number(latestBlock)}));
 mocks.rpc.getBlock.mockImplementation(async(args)=>({number:args?.blockNumber??++latestBlock,hash:canonicalHash,timestamp:BigInt(Math.floor(Date.now()/1000))}));
 const expected=expectedDraftCall(draft);
 mocks.rpc.getTransaction.mockResolvedValue({hash:op.txHash,from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,input:expected.data,value:expected.value});
 mocks.rpc.getTransactionReceipt.mockResolvedValue({transactionHash:op.txHash,status:'success',from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,logs:[creationLog()]});
 mocks.rpc.getCode.mockImplementation(async({address})=>address===owner?'0x':'0x01');mocks.rpc.getLogs.mockResolvedValue([]);
 mocks.rpc.readContract.mockImplementation(async({functionName})=>{
  switch(functionName){
   case 'getSystemConfig':return {fullyWired:true,perpPoolFactory:NETWORK.factory,collateralToken:NETWORK.collateral};
   case 'getPerpPoolStatuses':return [{perpPool:pool,baseToken:other}];
   case 'marginBank':return NETWORK.marginBank;
   case 'isPerpPoolRegistered':return true;
   case 'getStopOrderRegistry':return freshRegistry;
   case 'getOrderBookParameters':return {tickSize:1n,lotSize:1n,minQuantity:1n};
   case 'decimals':return 18;case 'symbol':return 'TEST';
   case 'tryGetMarkPrice':return [true,200n];case 'somiPaymentPerOrder':return 15n;
   case 'getPosition':return {size:10n,avgEntryPrice:150n};
   case 'getPendingOrder':return [true,pendingReads++===0?initial:subsequent];
   default:throw new Error(`Unexpected offline RPC ${functionName}`);
  }
 });
});
describe('Argon P2 independent verification (offline only)',()=>{
 it('returns sanitized exact intent, canonical receipt, decoded event and independent native readback',async()=>{
  const result=await reconcileOperation(op);
  expect(result.state).toBe('Applied');
  expect(result.proof).toMatchObject({identity:{chainId:50383,genesisHash:canonicalHash,owner,pool,stopRegistry:registry},intent:{operationId:op.id,idempotencyKey:op.idempotencyKey,draftFingerprint:draft.fingerprint,draftRevision:1,txHash:op.txHash,hashProvenance:'original'},transaction:{input:expectedDraftCall(draft).data,value:'15',blockNumber:'100',blockHash:canonicalHash},receipt:{transactionHash:op.txHash,status:'success',canonicalBlockHash:canonicalHash},event:{name:'PendingOrderCreated',address:registry,orderId:'1',logIndex:0},nativeReadback:{status:'known',value:{id:'1',intent:'reduceOnly',siblingId:null}},snapshot:{mode:'live-owner',complete:true}});
  expect(()=>JSON.stringify(result.proof)).not.toThrow();
 });
 it('rejects cancellation if registry changes between SDK preflight and fresh chain snapshot',async()=>{
  freshRegistry=other;
  await expect(prepareOwnerCall({...draft,action:'cancel-stop',stopId:'1'},{} as never)).rejects.toThrow('CANCEL_STOP_NOT_VERIFIED');
  expect(mocks.trader.buildCancelPerpStopOrder).not.toHaveBeenCalled();
 });
 it('accepts cancellation within the verified registry',async()=>{await prepareOwnerCall({...draft,action:'cancel-stop',stopId:'1'},{} as never);expect(mocks.trader.buildCancelPerpStopOrder).toHaveBeenCalledOnce();});
 it('rejects unexpected OCO linkage in direct contract readback',async()=>{initial.siblingOrderId=2n;expect(await reconcileOperation(op)).toMatchObject({state:'NeedsReview',reason:'STOP_READBACK_MISMATCH'});expect(pendingReads).toBe(1);});
 it.each(['trigger','quantity','sibling','intent','side','operator','type','limit'] as const)('rejects %s drift in the later complete snapshot',async field=>{
  if(field==='trigger')subsequent.orderWithTrigger.triggerPrice=99n;
  if(field==='quantity')subsequent.orderWithTrigger.order.quantity=1n;
  if(field==='sibling')subsequent.siblingOrderId=2n;
  if(field==='intent')subsequent.intent=1;
  if(field==='side')subsequent.orderWithTrigger.order.isBid=true;
  if(field==='operator')subsequent.orderWithTrigger.triggerOperator=0;
  if(field==='type')subsequent.orderWithTrigger.orderType=0;
  if(field==='limit')subsequent.orderWithTrigger.limitPrice=99n;
  expect(await reconcileOperation(op)).toMatchObject({state:'NeedsReview',reason:'STOP_SNAPSHOT_READBACK_MISMATCH'});expect(pendingReads).toBe(2);
 });
 it('rejects same stop id from a newly mapped registry',async()=>{freshRegistry=other;expect(await reconcileOperation(op)).toMatchObject({state:'NeedsReview',reason:'STOP_SNAPSHOT_READBACK_MISMATCH'});expect(pendingReads).toBe(2);});
 it('rejects cancel absence proof from a different factory-mapped registry',async()=>{
  const cancelDraft:RepairDraft={...draft,action:'cancel-stop',stopId:'1'};
  const expected=expectedDraftCall(cancelDraft);
  mocks.rpc.getTransaction.mockResolvedValue({hash:op.txHash,from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,input:expected.data,value:expected.value});
  mocks.rpc.getTransactionReceipt.mockResolvedValue({transactionHash:op.txHash,status:'success',from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,logs:[{address:registry,data:'0x',logIndex:0,topics:encodeEventTopics({abi:stopEventsAbi,eventName:'PendingOrderCancelled',args:{orderId:1n}})}]});
  freshRegistry=other;mocks.client.listPerpStopOrders.mockResolvedValue([]);
  const read=mocks.rpc.readContract.getMockImplementation()!;
  mocks.rpc.readContract.mockImplementation(async args=>args.functionName==='getPendingOrder'?[false,stored()]:read(args));
  expect(await reconcileOperation({...op,draft:cancelDraft})).toMatchObject({state:'NeedsReview',reason:'CANCEL_SNAPSHOT_SCOPE_MISMATCH'});
 });
 it('keeps recovered transaction provenance locked and returns no applied proof',async()=>{
  expect(await reconcileOperation({...op,hashProvenance:'recovered'})).toMatchObject({state:'NeedsReview',reason:'RECOVERED_HASH_ORIGINAL_TRANSACTION_PROVENANCE_REQUIRED',proof:null});
 });
 it('rejects a decoded creation event whose owner does not match the intent',async()=>{
  const log=creationLog();log.topics=encodeEventTopics({abi:stopEventsAbi,eventName:'PendingOrderCreated',args:{orderId:1n,owner:other}});
  mocks.rpc.getTransactionReceipt.mockResolvedValue({transactionHash:op.txHash,status:'success',from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,logs:[log]});
  expect(await reconcileOperation(op)).toMatchObject({state:'NeedsReview',reason:'CREATION_EVENT_DRAFT_MISMATCH',proof:null});
 });
 it('returns a selected cancel event and pinned native absence without a fill claim',async()=>{
  const cancelDraft:RepairDraft={...draft,action:'cancel-stop',stopId:'1'};const expected=expectedDraftCall(cancelDraft);
  mocks.rpc.getTransaction.mockResolvedValue({hash:op.txHash,from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,input:expected.data,value:expected.value});
  mocks.rpc.getTransactionReceipt.mockResolvedValue({transactionHash:op.txHash,status:'success',from:owner,to:registry,blockNumber:100n,blockHash:canonicalHash,logs:[{address:registry,data:'0x',logIndex:0,topics:encodeEventTopics({abi:stopEventsAbi,eventName:'PendingOrderCancelled',args:{orderId:1n}})}]});
  mocks.client.listPerpStopOrders.mockResolvedValue([]);
  const read=mocks.rpc.readContract.getMockImplementation()!;
  mocks.rpc.readContract.mockImplementation(async args=>args.functionName==='getPendingOrder'?[false,stored()]:read(args));
  expect(await reconcileOperation({...op,draft:cancelDraft})).toMatchObject({state:'Applied',reason:expect.stringContaining('no fill claim'),proof:{transaction:{input:expected.data,value:'0'},event:{name:'PendingOrderCancelled',orderId:'1',logIndex:0},nativeReadback:{status:'known',value:null,block:{number:'100',hash:canonicalHash}},snapshot:{mode:'live-owner',complete:true,stops:[]}}});
 });

});
