import {beforeEach,describe,expect,it,vi} from 'vitest';
import {encodeAbiParameters,encodeEventTopics,encodeFunctionData,parseAbiParameters,type Address,type EncodeEventTopicsReturnType,type Hex} from 'viem';
import {marginBankEventsAbi,orderBookEventsAbi,perpPoolWriteAbi} from '@somnia-chain/markets-sdk';
import type {EvidenceProvenance} from '../../packages/domain/live-evidence.js';
const mocks=vi.hoisted(()=>({rpc:{getChainId:vi.fn(),getBlock:vi.fn(),getCode:vi.fn(),getLogs:vi.fn(),readContract:vi.fn(),getBalance:vi.fn(),getTransaction:vi.fn(),getTransactionReceipt:vi.fn()},client:{waitForIndexedBlock:vi.fn(),listPerpStopOrders:vi.fn(),getIndexerFreshness:vi.fn()},wallet:vi.fn(()=>{throw new Error('OFFLINE_CAPTURE_MUST_NOT_CONSTRUCT_WALLET');}),close:vi.fn()}));
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createPublicClient:()=>mocks.rpc,createWalletClient:mocks.wallet}));
vi.mock('@somnia-chain/markets-sdk',async original=>({...await original<typeof import('@somnia-chain/markets-sdk')>(),SomniaMarkets:class {client=mocks.client;get trader():never{throw new Error('CAPTURE_MUST_NOT_PREPARE_OR_SEND');}async close(){await mocks.close();}}}));
import {captureEvidenceObservation,NETWORK,readLiveSnapshot} from '../../packages/protocol/index.js';
const owner='0x1111111111111111111111111111111111111111' as Address;
const pool='0x2222222222222222222222222222222222222222' as Address;
const registry='0x3333333333333333333333333333333333333333' as Address;
const other='0x4444444444444444444444444444444444444444' as Address;
const zero='0x0000000000000000000000000000000000000000' as Address;
const openingHash=('0x'+'a'.repeat(64)) as Hex;
const activeGenesis=('0x'+'e'.repeat(64)) as Hex;
const blockHash=(block:bigint)=>('0x'+block.toString(16).padStart(64,'0')) as Hex;
const provenance:EvidenceProvenance={source:{commit:'1'.repeat(40),verifier:'offline-test-fixture-not-live'},versions:{node:'24.22.1',sdk:'0.32.1',viem:'2.57.11'},lockSha256:'2'.repeat(64),mode:'live-owner',capturedAt:'2026-01-01T00:00:00.000Z'};
const input={owner,pool,id:'observation',lifecycleId:'lifecycle',provenance};
let isBid:boolean;
let genesisHash:string;
const calldata=()=>encodeFunctionData({abi:perpPoolWriteAbi,functionName:'placeOrder',args:[isBid,0n,200n,10n,9000000000000000000n,2,0,zero,0n]});
const log=(address:Address,topics:EncodeEventTopicsReturnType,data:Hex,logIndex:number)=>({address,topics,data,logIndex,blockNumber:100n,blockHash:blockHash(100n),transactionHash:openingHash,transactionIndex:0,removed:false});
function openingLogs(orderOwner:Address=owner,takerOrderId=7n,filled=10n){
 const placed={orderId:7n,isBid,owner:orderOwner,userData:0n,price:200n,fullQuantity:10n,quantityRemaining:10n,expireTimestampNs:9000000000000000000n};
 return [
  log(pool,encodeEventTopics({abi:orderBookEventsAbi,eventName:'OrderPlaced',args:{orderId:7n}}),encodeAbiParameters([orderBookEventsAbi[0].inputs[1]],[placed]),0),
  log(NETWORK.marginBank,encodeEventTopics({abi:marginBankEventsAbi,eventName:'PositionUpdated',args:{account:owner,perpPool:pool}}),encodeAbiParameters(parseAbiParameters('int128,uint128,int256,int256'),[isBid?10n:-10n,200n,0n,0n]),1),
  log(pool,encodeEventTopics({abi:orderBookEventsAbi,eventName:'OrderFilled',args:{takerOrderId,makerOrderId:8n}}),encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256,uint256'),[filled,10n-filled,0n,200n]),2),
 ];
}
beforeEach(()=>{
 vi.resetAllMocks();isBid=true;genesisHash=activeGenesis;
 mocks.rpc.getChainId.mockResolvedValue(50383);
 mocks.rpc.getBlock.mockImplementation(async(args)=>{const number=args?.blockNumber??200n;return {number,hash:number===1n?genesisHash:blockHash(number),timestamp:BigInt(Math.floor(Date.now()/1000))-(number===100n?60n:0n)};});
 mocks.rpc.getCode.mockImplementation(async({address})=>address.toLowerCase()===owner?'0x':'0x01');
 mocks.rpc.getLogs.mockResolvedValue([]);
 mocks.rpc.getBalance.mockResolvedValue(123n);
 mocks.client.waitForIndexedBlock.mockResolvedValue(undefined);
 mocks.client.listPerpStopOrders.mockResolvedValue([]);
 mocks.client.getIndexerFreshness.mockResolvedValue({chainId:50383,latestProcessedBlock:200});
 mocks.rpc.getTransaction.mockImplementation(async()=>({hash:openingHash,chainId:50383,from:owner,to:pool,input:calldata(),value:0n,blockNumber:100n,blockHash:blockHash(100n)}));
 mocks.rpc.getTransactionReceipt.mockImplementation(async()=>({transactionHash:openingHash,status:'success',from:owner,to:pool,blockNumber:100n,blockHash:blockHash(100n),logs:openingLogs()}));
 mocks.rpc.readContract.mockImplementation(async({functionName})=>{
  switch(functionName){
   case 'getSystemConfig':return {fullyWired:true,perpPoolFactory:NETWORK.factory,collateralToken:NETWORK.collateral};
   case 'getPerpPoolStatuses':return [{perpPool:pool,baseToken:other}];
   case 'marginBank':return NETWORK.marginBank;
   case 'isPerpPoolRegistered':return true;
   case 'getStopOrderRegistry':return registry;
   case 'getOrderBookParameters':return {tickSize:1n,lotSize:1n,minQuantity:1n};
   case 'decimals':return 18;case 'symbol':return 'TEST';
   case 'tryGetMarkPrice':return [true,200n];case 'somiPaymentPerOrder':return 15n;
   case 'getPosition':return {size:isBid?10n:-10n,avgEntryPrice:200n};
   case 'balanceOf':return 456n;
   case 'getAccountState':return {unlockedCollateralBalance:-3n,lockedCollateral:17n,activePerpPools:[pool]};
   case 'getOwnOpenOrders':return [9n];
   case 'getOrder':return {orderId:9n,owner,isBid:false,fullQuantity:5n,quantityRemaining:5n,userData:0n,price:200n,expireTimestampNs:9000000000000000000n};
   default:throw new Error(`Unexpected offline read ${functionName}`);
  }
 });
});
describe('protocol lifecycle capture (offline RPC/SDK fixtures only)',()=>{
 it('returns validated genesis and explicit stop-discovery bracket from ordinary snapshots',async()=>{
  const snapshot=await readLiveSnapshot({owner,pool});
  expect(snapshot).toMatchObject({complete:true,market:{genesisHash:activeGenesis},stopDiscovery:{fromBlock:'200',toBlock:'200',indexerWaitedThrough:'200',mutationFree:true}});
 });
 it.each(['missing-sl','gap'] as const)('captures %s using chain state, not a caller assessment',async kind=>{
  const result=await captureEvidenceObservation({...input,kind});
  expect(result).toMatchObject({kind,id:'observation',lifecycleId:'lifecycle',identity:{chainId:50383,genesisHash:activeGenesis,owner,signer:owner,pool,stopRegistry:registry},snapshot:{mode:'live-owner',complete:true,position:{signedSize:'10'},stops:[]}});
  expect(result.provenance.capturedAt).toBe(result.snapshot.capturedAt);
  expect(result.provenance.capturedAt).not.toBe(provenance.capturedAt);
  expect(mocks.wallet).not.toHaveBeenCalled();
  expect(mocks.rpc.getTransaction).not.toHaveBeenCalled();
 });
 it('captures all residual fields independently at one canonical block without clearing exposure',async()=>{
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.residuals).toMatchObject({position:{status:'known',value:{signedSize:'10'}},nativeStops:{status:'known',value:[]},restingOrders:{status:'known',value:[{id:'9',quantity:'5',owner,pool}]},walletStt:{status:'known',value:'123'},walletCollateral:{status:'known',value:'456'},bankUnlockedCollateral:{status:'known',value:'-3'},bankLockedCollateral:{status:'known',value:'17'}});
  for(const read of Object.values(result.residuals!))expect(read).toMatchObject({block:{number:'200',hash:blockHash(200n)},consistency:'pinned'});
  expect(mocks.rpc.readContract).toHaveBeenCalledWith(expect.objectContaining({address:pool,functionName:'getOwnOpenOrders',account:owner,blockNumber:200n}));
  expect(mocks.rpc.getBalance).toHaveBeenCalledWith({address:owner,blockNumber:200n});
  expect(()=>JSON.stringify(result)).not.toThrow();
 });
 it('records failed native wallet and bank reads as null errors, not zero balances',async()=>{
  mocks.rpc.getBalance.mockRejectedValue(new Error('native read unavailable'));
  const read=mocks.rpc.readContract.getMockImplementation()!;
  mocks.rpc.readContract.mockImplementation(async args=>{if(args.functionName==='getAccountState')throw new Error('bank read unavailable');return read(args);});
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.residuals).toMatchObject({walletStt:{status:'error',value:null,error:expect.stringContaining('native read unavailable')},bankUnlockedCollateral:{status:'error',value:null,error:expect.stringContaining('bank read unavailable')},bankLockedCollateral:{status:'error',value:null},walletCollateral:{status:'known',value:'456'},position:{status:'known'}});
 });
 it('retains independent pinned residual reads when SDK stop discovery is unavailable',async()=>{
  mocks.client.listPerpStopOrders.mockRejectedValue(new Error('indexer unavailable'));
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.snapshot).toMatchObject({complete:false,scope:'unavailable',readError:expect.stringContaining('indexer unavailable'),stopDiscovery:{mutationFree:false}});
  expect(result.residuals).toMatchObject({nativeStops:{status:'error',value:null},position:{status:'known'},walletStt:{status:'known',value:'123'},bankLockedCollateral:{status:'known',value:'17'}});
 });
 it('records a failed pinned resting-order detail read as unknown exposure, never an empty list',async()=>{
  const read=mocks.rpc.readContract.getMockImplementation()!;
  mocks.rpc.readContract.mockImplementation(async args=>{if(args.functionName==='getOrder')throw new Error('pinned order detail unavailable');return read(args);});
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.residuals?.restingOrders).toMatchObject({status:'error',value:null,error:expect.stringContaining('pinned order detail unavailable')});
 });
 it('does not claim complete stops across an observed registry mutation',async()=>{
  mocks.rpc.getLogs.mockResolvedValue([{address:registry}]);
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.snapshot.complete).toBe(false);
  expect(result.residuals?.nativeStops).toMatchObject({status:'error',value:null,error:expect.stringContaining('REGISTRY_CHANGED_DURING_DISCOVERY')});
 });
 it.each([true,false])('validates official direct EOA opening calldata, owner-bound fills and signed position (bid %s)',async bid=>{
  isBid=bid;
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening).toMatchObject({transaction:{hash:openingHash,from:owner,to:pool,input:calldata(),value:'0'},receipt:{status:'success',canonicalBlockHash:blockHash(100n)},order:{status:'known',value:{owner,pool,isBid:bid,requestedQuantity:'10',filledQuantity:'10',remainingQuantity:'0',orderId:'7',fills:[{owner,pool,orderId:'7',quantity:'10',transactionHash:openingHash,logIndex:2}]}},position:{status:'known',value:{signedSize:bid?'10':'-10'},block:{number:'100'}}});
  expect(mocks.wallet).not.toHaveBeenCalled();
 });
 it('rejects receipt-only opening evidence without promoting a fill',async()=>{
  const receipt=await mocks.rpc.getTransactionReceipt();mocks.rpc.getTransactionReceipt.mockResolvedValue({...receipt,logs:[]});
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening?.order).toMatchObject({status:'error',value:null,error:expect.stringContaining('OPENING_ORDER_EVENT_MISSING')});
 });
 it('rejects a placement tuple belonging to another owner',async()=>{
  const receipt=await mocks.rpc.getTransactionReceipt();mocks.rpc.getTransactionReceipt.mockResolvedValue({...receipt,logs:openingLogs(other)});
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening?.order).toMatchObject({status:'error',value:null,error:expect.stringContaining('OPENING_ORDER_CALLDATA_MISMATCH')});
 });
 it('does not attach an unrelated order fill to the opening owner',async()=>{
  const receipt=await mocks.rpc.getTransactionReceipt();mocks.rpc.getTransactionReceipt.mockResolvedValue({...receipt,logs:openingLogs(owner,77n)});
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening?.order).toMatchObject({status:'error',value:null,error:expect.stringContaining('OPENING_OWNER_BOUND_FILL_REQUIRED')});
 });
 it('requires pinned receipt-block state instead of inferring position from a receipt log',async()=>{
  const read=mocks.rpc.readContract.getMockImplementation()!;
  mocks.rpc.readContract.mockImplementation(async args=>{if(args.functionName==='getPosition'&&args.blockNumber===100n)throw new Error('archive state unavailable');return read(args);});
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening?.position).toMatchObject({status:'error',value:null,error:expect.stringContaining('archive state unavailable')});
  expect(result.opening?.order.status).toBe('error');
 });
 it('records the exact direct-opening prerequisite for a supplied cancellation call',async()=>{
  const tx=await mocks.rpc.getTransaction();mocks.rpc.getTransaction.mockResolvedValue({...tx,input:encodeFunctionData({abi:perpPoolWriteAbi,functionName:'cancelOrder',args:[7n]})});
  const result=await captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash});
  expect(result.opening?.order).toMatchObject({status:'error',value:null,error:expect.stringContaining('OPENING_REQUIRES_PINNED_SDK_DIRECT_PERP_PLACE_ORDER')});
 });
 it('rejects opening transactions sent to a different pool',async()=>{
  const tx=await mocks.rpc.getTransaction();mocks.rpc.getTransaction.mockResolvedValue({...tx,to:other});
  await expect(captureEvidenceObservation({...input,kind:'opening',openingTxHash:openingHash})).rejects.toThrow('OPENING_TRANSACTION_SCOPE_MISMATCH');
 });
 it('keeps retired genesis rejection intact',async()=>{
  genesisHash='0x0ddf6446070d043158fd7aa80d3c835a9e446efdc05601f9ad67eebc9864a4ae';
  await expect(captureEvidenceObservation({...input,kind:'residual'})).rejects.toThrow('RETIRED_HIDEKI_GENESIS');
  expect(mocks.rpc.getBalance).not.toHaveBeenCalled();
 });
 it('rejects a wrong-chain reader before capturing balances',async()=>{
  mocks.rpc.getChainId.mockResolvedValue(1);
  await expect(captureEvidenceObservation({...input,kind:'residual'})).rejects.toThrow('WRONG_CHAIN');
  expect(mocks.rpc.getBalance).not.toHaveBeenCalled();
 });
 it('rejects hashes attached to a non-opening capture before any RPC',async()=>{
  await expect(captureEvidenceObservation({...input,kind:'residual',openingTxHash:openingHash})).rejects.toThrow('OPENING_HASH_REQUIRED_ONLY_FOR_OPENING');
  expect(mocks.rpc.getChainId).not.toHaveBeenCalled();
 });
 it.each([199,201])('does not call an indexer discovery bound %s consistent with pinned block 200',async latestProcessedBlock=>{
  mocks.client.getIndexerFreshness.mockResolvedValue({chainId:50383,latestProcessedBlock});
  const result=await captureEvidenceObservation({...input,kind:'residual'});
  expect(result.snapshot.complete).toBe(false);
  expect(result.residuals?.nativeStops).toMatchObject({status:'error',value:null,consistency:'unpinned'});
  expect(result.residuals?.walletStt).toMatchObject({status:'known',value:'123'});
 });
 it('preserves primary read and cleanup errors together in an incomplete snapshot',async()=>{
  mocks.rpc.readContract.mockRejectedValue(new Error('primary risk read failed'));
  mocks.close.mockRejectedValue(new Error('close failed'));
  const snapshot=await readLiveSnapshot({owner,pool});
  expect(snapshot.complete).toBe(false);
  expect(snapshot.readError).toContain('primary risk read failed');
  expect(snapshot.readError).toContain('SDK_CLEANUP_FAILED:Error: close failed');
 });
 it('rejects a reorged current evidence block rather than serializing canonical assertions',async()=>{
  const get=mocks.rpc.getBlock.getMockImplementation()!;let currentReads=0;
  mocks.rpc.getBlock.mockImplementation(async args=>{const b=await get(args);if(args?.blockNumber===200n&&++currentReads===1)return {...b,hash:blockHash(201n)};return b;});
  await expect(captureEvidenceObservation({...input,kind:'residual'})).rejects.toThrow('NON_CANONICAL_EVIDENCE_SNAPSHOT');
 });
});
