import {beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:{getChainId:vi.fn(),getBlock:vi.fn(),readContract:vi.fn(),getCode:vi.fn(),getLogs:vi.fn()},account:vi.fn(),close:vi.fn(),client:{waitForIndexedBlock:vi.fn(),listPerpStopOrders:vi.fn(),getIndexerFreshness:vi.fn()}}));
vi.mock('viem',async importOriginal=>({...await importOriginal<typeof import('viem')>(),createPublicClient:()=>mock.rpc}));
vi.mock('../../packages/protocol/account-proof.js',()=>({observeAccount:mock.account,captureAccountExecution:vi.fn(),verifyAccountExecution:vi.fn(),readAccountCode:vi.fn()}));
vi.mock('@somnia-chain/markets-sdk',async importOriginal=>({...await importOriginal<typeof import('@somnia-chain/markets-sdk')>(),SomniaMarkets:class {client=mock.client;close=mock.close;}}));
import {NETWORK,readLiveSnapshot} from '../../packages/protocol/index.js';
import {assessProtection} from '../../packages/domain/index.js';
const owner='0x1111111111111111111111111111111111111111';
const pool='0x2222222222222222222222222222222222222222';
const registry='0x3333333333333333333333333333333333333333';
const base='0x4444444444444444444444444444444444444444';
const hash='0x'+'a'.repeat(64),genesis='0x'+'b'.repeat(64);
const book={tickSize:1n,lotSize:1n,minQuantity:1n};
let blockReads=0;
beforeEach(()=>{
 vi.clearAllMocks();blockReads=0;
 mock.rpc.getChainId.mockResolvedValue(50383);
 mock.rpc.getBlock.mockImplementation(async(arg?:{blockNumber:bigint})=>arg?.blockNumber===1n?{number:1n,hash:genesis}:({number:arg?.blockNumber??(++blockReads===1?100n:110n),hash,timestamp:BigInt(Math.floor(Date.now()/1000)-1)}));
 mock.rpc.getCode.mockResolvedValue('0x60');mock.rpc.getLogs.mockResolvedValue([]);
 mock.rpc.readContract.mockImplementation(async({functionName}:any)=>{
  switch(functionName){
   case 'getSystemConfig':return {fullyWired:true,perpPoolFactory:NETWORK.factory,collateralToken:NETWORK.collateral};
   case 'getPerpPoolStatuses':return [{perpPool:pool,baseToken:base}];
   case 'marginBank':return NETWORK.marginBank;
   case 'isPerpPoolRegistered':return true;
   case 'getStopOrderRegistry':return registry;
   case 'getOrderBookParameters':return book;
   case 'decimals':return 18;
   case 'symbol':return 'BTC';
   case 'tryGetMarkPrice':return [true,100n];
   case 'somiPaymentPerOrder':return 1n;
   case 'getPosition':return {size:0n,avgEntryPrice:0n};
   default:throw Error('Unexpected read '+functionName);
  }
 });
 mock.client.waitForIndexedBlock.mockResolvedValue(undefined);mock.client.listPerpStopOrders.mockResolvedValue([]);mock.client.getIndexerFreshness.mockResolvedValue({chainId:50383,latestProcessedBlock:100});mock.close.mockResolvedValue(undefined);
 mock.account.mockResolvedValue({address:owner,block:{number:'110',hash},code:'empty',codeHash:null,architecture:'unclassified',derivation:null,owners:null,threshold:null,controlRead:'unknown',reason:'DIRECT_EOA_PROOF_ONLY'});
});
describe('same-block parallel pinned reads (synthetic, no RPC or wallet)',()=>{
 it('starts market and position reads while account is pending, retaining one block and final recheck',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);mock.account.mockImplementation(async()=>{await gate;return {address:owner};});
  const run=readLiveSnapshot({owner,pool});
  await vi.waitFor(()=>expect(mock.rpc.readContract.mock.calls.some(([x])=>x.functionName==='getPosition')).toBe(true));
  expect(mock.rpc.readContract.mock.calls.some(([x])=>x.functionName==='tryGetMarkPrice')).toBe(true);
  release();const result=await run;expect(result.complete).toBe(true);expect(result.readError).toBeNull();
  for(const [x] of mock.rpc.readContract.mock.calls.filter(([x])=>['tryGetMarkPrice','somiPaymentPerOrder','getPosition'].includes(x.functionName)))expect(x.blockNumber).toBe(110n);
  expect(mock.account.mock.calls[0]![2]).toMatchObject({number:110n,hash});
  expect(mock.rpc.getBlock).toHaveBeenLastCalledWith({blockNumber:110n});
  expect(result.market?.observedBlock).toBe('110');expect(result.position?.observedBlock).toBe('110');
 });
 it('does not publish completeness after an independent read rejects',async()=>{
  const normal=mock.rpc.readContract.getMockImplementation()!;mock.rpc.readContract.mockImplementation(async(x:any)=>x.functionName==='getPosition'?Promise.reject(Error('POSITION_READ_FAILED')):normal(x));
  const result=await readLiveSnapshot({owner,pool});expect(result.complete).toBe(false);expect(result.readError).toContain('POSITION_READ_FAILED');expect(assessProtection(result).verdict).toBe('UNKNOWN');
 });
 it('drains a late account read on peer failure before cleanup or returning',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);mock.account.mockImplementation(async()=>{await gate;return {address:owner};});
  const normal=mock.rpc.readContract.getMockImplementation()!;mock.rpc.readContract.mockImplementation(async(x:any)=>x.functionName==='getPosition'?Promise.reject(Error('POSITION_READ_FAILED')):normal(x));
  let returned=false;const run=readLiveSnapshot({owner,pool}).then(value=>{returned=true;return value;});
  await vi.waitFor(()=>expect(mock.account).toHaveBeenCalledOnce());
  await new Promise(resolve=>setTimeout(resolve,0));expect(returned).toBe(false);expect(mock.close).not.toHaveBeenCalled();
  expect(mock.rpc.getBlock.mock.calls.some(([x])=>x?.blockNumber===110n)).toBe(false);
  release();const result=await run;expect(result.complete).toBe(false);expect(result.readError).toContain('POSITION_READ_FAILED');expect(mock.close).toHaveBeenCalledOnce();
 });
 it('retains registry mutation rejection',async()=>{mock.rpc.getLogs.mockResolvedValue([{}]);const result=await readLiveSnapshot({owner,pool});expect(result.complete).toBe(false);expect(result.readError).toContain('REGISTRY_CHANGED');});
 it('retains pinned configuration drift rejection',async()=>{
  const normal=mock.rpc.readContract.getMockImplementation()!;mock.rpc.readContract.mockImplementation(async(x:any)=>x.functionName==='getOrderBookParameters'&&x.blockNumber===110n?{...book,lotSize:2n}:normal(x));
  const result=await readLiveSnapshot({owner,pool});expect(result.complete).toBe(false);expect(result.readError).toContain('MARKET_CONFIGURATION_CHANGED');
 });
 it('retains final canonical reorg rejection',async()=>{
  const normal=mock.rpc.getBlock.getMockImplementation()!;mock.rpc.getBlock.mockImplementation(async(x:any)=>x?.blockNumber===110n?{number:110n,hash:'0x'+'c'.repeat(64)}:normal(x));
  const result=await readLiveSnapshot({owner,pool});expect(result.complete).toBe(false);expect(result.readError).toBe('NON_CANONICAL_SNAPSHOT');
 });
 it('does not renew old block timestamps to defeat freshness',async()=>{
  const normal=mock.rpc.getBlock.getMockImplementation()!;mock.rpc.getBlock.mockImplementation(async(x:any)=>({...await normal(x),timestamp:BigInt(Math.floor(Date.now()/1000)-20)}));
  const result=await readLiveSnapshot({owner,pool});expect(result.complete).toBe(true);expect(Date.now()-Date.parse(result.market!.observedAt)).toBeGreaterThanOrEqual(20000);expect(assessProtection(result).reasonCodes).toContain('STALE_DATA');
 });
});
