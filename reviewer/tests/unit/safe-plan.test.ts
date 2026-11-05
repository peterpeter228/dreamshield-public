import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({forbidden:vi.fn(()=>{throw Error('SIGNING_OR_WALLET_CALL_FORBIDDEN');}),snapshot:vi.fn(),state:vi.fn(),rpc:{getChainId:vi.fn(),readContract:vi.fn(),getBlock:vi.fn()}}));
vi.mock('../../packages/protocol/index.js',async original=>({...await original<typeof import('../../packages/protocol/index.js')>(),readLiveSnapshot:mocks.snapshot,httpClient:()=>mocks.rpc}));
vi.mock('../../packages/protocol/account-proof.js',async original=>({...await original<typeof import('../../packages/protocol/account-proof.js')>(),readSupportedAccountState:mocks.state}));
vi.mock('@somnia-chain/accounts-sdk',async original=>{const actual=await original<typeof import('@somnia-chain/accounts-sdk')>();return {...actual,safeTxTypedData:vi.fn(actual.safeTxTypedData),signExecution:mocks.forbidden,prevalidatedExecution:mocks.forbidden,signWith:mocks.forbidden,submitCall:mocks.forbidden,signAndSubmit:mocks.forbidden};});
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createWalletClient:mocks.forbidden}));
afterEach(()=>{vi.useRealTimers();expect(mocks.forbidden).not.toHaveBeenCalled();});
import {prepareUnsignedSafePlan,prepareFreshUnsignedSafePlan} from '../../packages/protocol/safe-plan.js';
import {NETWORK,expectedDraftCall} from '../../packages/protocol/index.js';
import {createSlDraft,createCancelDraft} from '../../packages/domain/index.js';
import {fixture} from '../../fixtures/scenarios.js';
import {planExecution,safeTxTypedData} from '@somnia-chain/accounts-sdk';
import {decodeFunctionData,hashTypedData,zeroAddress} from 'viem';
import {transactionAbi} from '../../packages/protocol/transaction-abi.js';
import type {Snapshot,RepairDraft} from '../../packages/domain/types.js';
let snapshot:Snapshot,draft:RepairDraft,state:any;
const controller='0x5555555555555555555555555555555555555555',hash='0x'+'a'.repeat(64),genesis='0x'+'b'.repeat(64);
beforeEach(()=>{
 vi.clearAllMocks();const now=Math.floor(Date.now()/1000)*1000;
 snapshot=fixture('unprotected',now);snapshot.mode='live-readonly';snapshot.market!.genesisHash=genesis;snapshot.market!.marginBank=NETWORK.marginBank;snapshot.market!.blockHash=hash;snapshot.position!.source='chain';snapshot.stopDiscovery={fromBlock:'99',toBlock:'100',indexerWaitedThrough:'99',mutationFree:true};
 draft=createSlDraft(snapshot,'2900');
 state={block:{number:'100',hash,timestamp:snapshot.market!.observedAt},owners:[controller],ownerCode:{[controller]:'0x'},nonce:'7'};
 mocks.snapshot.mockImplementation(async()=>snapshot);mocks.state.mockImplementation(async()=>state);mocks.rpc.getChainId.mockResolvedValue(50383);mocks.rpc.readContract.mockResolvedValue(true);
 mocks.rpc.getBlock.mockImplementation(async({blockNumber}:any)=>blockNumber===1n?{number:1n,hash:genesis}:{number:100n,hash,timestamp:BigInt(now/1000)});
});
describe('unsigned Safe plan only: synthetic input, actual pinned SDK pure builder',()=>{
 it('returns a JSON-serializable exact single-CALL plan, never signature or outer calldata',async()=>{
  const result=await prepareUnsignedSafePlan(draft,controller);const call=expectedDraftCall(draft);
  const expected=planExecution({chainId:50383,account:draft.owner as `0x${string}`,calls:[{to:draft.registry as `0x${string}`,data:call.data,value:call.value}],nonce:7n,through:[]});
  expect(result.status).toBe('NOT_SIGNED_NOT_BROADCASTABLE');expect(result.controllerControlVerified).toBe(false);expect(result.plan.hash).toBe(expected.hash);expect(result.plan.through).toEqual([]);expect(result.plan.tx.operation).toBe(0);expect(result.nonce).toBe('7');expect(result.plan.tx.to.toLowerCase()).toBe(draft.registry.toLowerCase());expect(()=>JSON.stringify(result)).not.toThrow();
  expect(result.plan.tx).toEqual(Object.fromEntries(Object.entries(safeTxTypedData(50383,draft.owner as `0x${string}`,expected.tx).message).map(([key,value])=>[key,typeof value==='bigint'?value.toString():value])));
  expect(result.plan.tx).toMatchObject({safeTxGas:'0',baseGas:'0',gasPrice:'0',gasToken:zeroAddress,refundReceiver:zeroAddress});
  expect(hashTypedData(safeTxTypedData(50383,draft.owner as `0x${string}`,expected.tx))).toBe(result.plan.hash);
  expect(result).not.toHaveProperty('signature');expect(result).not.toHaveProperty('outerTransaction');expect(result).not.toHaveProperty('data');
  const decoded=decodeFunctionData({abi:transactionAbi,data:result.innerCall.data});expect(decoded.functionName).toBe('createPendingOrder');
  expect(mocks.state).toHaveBeenCalledWith(mocks.rpc,draft.owner,100n);expect(mocks.rpc.readContract.mock.calls[0]![0]).toMatchObject({address:draft.pool,blockNumber:100n,args:[draft.owner,draft.registry,expect.any(String)]});expect(mocks.rpc.getBlock).toHaveBeenLastCalledWith({blockNumber:100n});
 });
 it.each(['safeTxGas','baseGas','gasPrice','gasToken','refundReceiver'] as const)('rejects nonzero hidden fee/refund field %s',async field=>{
  const call=expectedDraftCall(draft),expected=planExecution({chainId:50383,account:draft.owner as `0x${string}`,calls:[{to:draft.registry as `0x${string}`,data:call.data,value:call.value}],nonce:7n,through:[]});
  const typed=safeTxTypedData(50383,draft.owner as `0x${string}`,expected.tx);
  vi.mocked(safeTxTypedData).mockReturnValueOnce({...typed,message:{...typed.message,[field]:field==='gasToken'||field==='refundReceiver'?controller:1n}});
  await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('SAFE_PLAN_REIMBURSEMENT_FORBIDDEN');
 });
 it('prepares selected cancellation without requesting an operator grant',async()=>{
  const s=fixture('protected',Date.parse(snapshot.market!.observedAt));s.mode='live-readonly';s.market={...s.market!,genesisHash:genesis,marginBank:NETWORK.marginBank,blockHash:hash};s.position!.source='chain';s.stopDiscovery=snapshot.stopDiscovery;snapshot=s;draft=createCancelDraft(snapshot,'1');
  const result=await prepareUnsignedSafePlan(draft,controller);expect(result.innerCall.value).toBe('0');expect(decodeFunctionData({abi:transactionAbi,data:result.innerCall.data}).functionName).toBe('cancelPendingOrder');expect(mocks.rpc.readContract).not.toHaveBeenCalled();
 });
 it.each(['owner','pool','registry','side','quantity','deposit','trigger','chain'] as const)('rejects draft %s substitution',async kind=>{
  if(kind==='owner')draft.owner=controller;if(kind==='pool')draft.pool=controller;if(kind==='registry')draft.registry=controller;if(kind==='side')draft.isBid=true;if(kind==='quantity')draft.quantity='1';if(kind==='deposit')draft.deposit='1';if(kind==='trigger')draft.triggerPrice='9999999999999999999999999';if(kind==='chain')draft.chainId=1;
  await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow();
 });
 it('rejects actual-style zero position, not inventing stop preparation',async()=>{snapshot.position!.signedSize='0';await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('REPAIR_NOT_ALLOWED:NO_POSITION');});
 it('rejects stale draft before network calls',async()=>{draft.createdAt=new Date(Date.now()-15000).toISOString();await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('DRAFT_EXPIRED');expect(mocks.snapshot).not.toHaveBeenCalled();});
 it('rejects expired complete snapshots',async()=>{snapshot.market!.observedAt=new Date(Date.now()-15000).toISOString();await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('FRESH_COMPLETE');});
 it('rejects expiry during account reads without changing timestamps',async()=>{mocks.rpc.getBlock.mockImplementation(async({blockNumber}:any)=>{if(blockNumber===1n)return {number:1n,hash:genesis};draft.createdAt=new Date(Date.now()-15000).toISOString();return {number:100n,hash,timestamp:BigInt(Date.parse(snapshot.market!.observedAt)/1000)};});await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('DRAFT_EXPIRED');});
 it('rejects missing operator permission instead of building a grant',async()=>{mocks.rpc.readContract.mockResolvedValue(false);await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('OPERATOR_APPROVAL_REQUIRED');});
 it.each(['wrong-controller','contract-controller','unknown-controller-code','block-mismatch','hash-mismatch','timestamp-mismatch'] as const)('rejects %s',async kind=>{
  if(kind==='wrong-controller')state.owners=[];if(kind==='contract-controller')state.ownerCode[controller]='0x60';if(kind==='unknown-controller-code')state.ownerCode={};if(kind==='block-mismatch')state.block.number='99';if(kind==='hash-mismatch')state.block.hash=genesis;if(kind==='timestamp-mismatch')state.block.timestamp=new Date(Date.now()-10000).toISOString();
  await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow();
 });
 it.each(['ACCOUNT_IMPLEMENTATION_UNATTESTED','ACCOUNT_CONFIGURATION_MISMATCH','ACCOUNT_PROVENANCE_UNCLASSIFIED','ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED'])('propagates central attestation rejection %s',async error=>{mocks.state.mockRejectedValue(Error(error));await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow(error);});
 it('rejects changed canonical block',async()=>{mocks.rpc.getBlock.mockResolvedValue({number:100n,hash:genesis,timestamp:BigInt(Date.parse(snapshot.market!.observedAt)/1000)});await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('NON_CANONICAL_SAFE_PLAN');});
 it('rejects RPC chain mismatch',async()=>{mocks.rpc.getChainId.mockResolvedValue(1);await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('CHAIN_OR_GENESIS');});
 it('rejects missing discovery proof',async()=>{delete snapshot.stopDiscovery;await expect(prepareUnsignedSafePlan(draft,controller)).rejects.toThrow('STOP_DISCOVERY_UNVERIFIED');});
 it.each(['bad-controller','bad-trigger','bad-observed-block','bad-nonce','null-draft'])('rejects malformed %s',async kind=>{
  if(kind==='bad-trigger')draft.triggerPrice='1e10';if(kind==='bad-observed-block')draft.observedBlock='-1';if(kind==='bad-nonce')state.nonce='garbage';
  await expect(prepareUnsignedSafePlan(kind==='null-draft'?null as unknown as RepairDraft:draft,kind==='bad-controller'?'not-an-address':controller)).rejects.toThrow();
 });

 it('fresh entry creates a new draft after discovery and reads snapshot only once',async()=>{
  const result=await prepareFreshUnsignedSafePlan({owner:draft.owner,pool:draft.pool,controller,triggerPrice:'2900'});
  expect(mocks.snapshot).toHaveBeenCalledOnce();expect(result.plan.status).toBe('NOT_SIGNED_NOT_BROADCASTABLE');expect(result.draft.action).toBe('create-sl');expect(result.draft.triggerPrice).toBe('2900000000000000000000');expect(result.plan.account.toLowerCase()).toBe(result.draft.owner.toLowerCase());
 });
 it('fresh entry cannot substitute an account returned by discovery',async()=>{snapshot.position!.owner=controller;await expect(prepareFreshUnsignedSafePlan({owner:draft.owner,pool:draft.pool,controller,triggerPrice:'2900'})).rejects.toThrow('SAFE_PLAN_SCOPE_MISMATCH');});
 it('fresh entry still rejects NO_POSITION before constructing a plan',async()=>{snapshot.position!.signedSize='0';await expect(prepareFreshUnsignedSafePlan({owner:draft.owner,pool:draft.pool,controller,triggerPrice:'2900'})).rejects.toThrow('REPAIR_NOT_ALLOWED:NO_POSITION');expect(mocks.state).not.toHaveBeenCalled();});

 it('permits 50 seconds of pre-pin setup without extending the new 15-second draft',async()=>{
  const start=Math.floor(Date.now()/1000)*1000;vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(start);
  mocks.snapshot.mockImplementation(async()=>{vi.setSystemTime(start+50000);const at=new Date().toISOString();snapshot.capturedAt=at;snapshot.market!.observedAt=at;snapshot.position!.observedAt=at;state.block.timestamp=at;return snapshot;});
  mocks.rpc.getBlock.mockImplementation(async({blockNumber}:any)=>blockNumber===1n?{number:1n,hash:genesis}:{number:100n,hash,timestamp:BigInt((start+50000)/1000)});
  const result=await prepareFreshUnsignedSafePlan({owner:draft.owner,pool:draft.pool,controller,triggerPrice:'2900'});
  expect(Date.parse(result.draft.createdAt)).toBe(start+50000);expect(Date.parse(result.plan.expiresAt)).toBe(start+65000);expect(mocks.snapshot).toHaveBeenCalledOnce();
 });
 it('still rejects 16 seconds of post-pin delay in the fresh path',async()=>{
  const start=Date.parse(snapshot.market!.observedAt);vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(start);
  mocks.state.mockImplementation(async()=>{vi.setSystemTime(start+16000);return state;});
  await expect(prepareFreshUnsignedSafePlan({owner:draft.owner,pool:draft.pool,controller,triggerPrice:'2900'})).rejects.toThrow('DRAFT_EXPIRED');
 });

});
