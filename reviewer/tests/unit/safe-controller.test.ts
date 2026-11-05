import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({snapshot:vi.fn(),state:vi.fn(),send:vi.fn(async()=>{throw new Error('NO_SEND_BOUNDARY_OUTCOME_UNKNOWN')}),rpc:{getChainId:vi.fn(),readContract:vi.fn(),getBlock:vi.fn()}}));
vi.mock('../../packages/protocol/index.js',async original=>({...await original<typeof import('../../packages/protocol/index.js')>(),readLiveSnapshot:mocks.snapshot,httpClient:()=>mocks.rpc}));
vi.mock('../../packages/protocol/account-proof.js',async original=>({...await original<typeof import('../../packages/protocol/account-proof.js')>(),readSupportedAccountState:mocks.state}));
vi.mock('viem',async original=>{const actual=await original<typeof import('viem')>();return {...actual,createWalletClient:(options:Parameters<typeof actual.createWalletClient>[0])=>({...actual.createWalletClient(options),sendTransaction:mocks.send})}});
import {prepareControllerSafeCall,executeControllerSafeSl} from '../../packages/protocol/safe-plan.js';
import {NETWORK,expectedDraftCall} from '../../packages/protocol/index.js';
import {createSlDraft} from '../../packages/domain/index.js';
import {fixture} from '../../fixtures/scenarios.js';
import {Journal} from '../../packages/storage/index.js';
import {safeAbi} from '@somnia-chain/accounts-sdk';
import {decodeFunctionData,type EIP1193Provider} from 'viem';
import type {Snapshot,RepairDraft} from '../../packages/domain/types.js';
const controller='0x5555555555555555555555555555555555555555',hash='0x'+'a'.repeat(64),genesis='0x'+'b'.repeat(64);
let snapshot:Snapshot,draft:RepairDraft,state:any,selected:string,chainId:string,requests:string[];
const provider={request:async({method}:{method:string})=>{requests.push(method);if(method==='eth_accounts')return [selected];if(method==='eth_chainId')return chainId;throw Error('FORBIDDEN_PROVIDER_METHOD:'+method)}} as EIP1193Provider;
beforeEach(()=>{
 vi.clearAllMocks();selected=controller;chainId='0xc4cf';requests=[];const now=Math.floor(Date.now()/1000)*1000;
 snapshot=fixture('unprotected',now);snapshot.mode='live-readonly';snapshot.market={...snapshot.market!,genesisHash:genesis,marginBank:NETWORK.marginBank,blockHash:hash};snapshot.position!.source='chain';snapshot.stopDiscovery={fromBlock:'99',toBlock:'100',indexerWaitedThrough:'99',mutationFree:true};
 draft=createSlDraft(snapshot,'2900');state={block:{number:'100',hash,timestamp:snapshot.market!.observedAt},owners:[controller],ownerCode:{[controller]:'0x'},nonce:'7'};
 mocks.snapshot.mockImplementation(async()=>snapshot);mocks.state.mockImplementation(async()=>state);mocks.rpc.getChainId.mockResolvedValue(50383);mocks.rpc.readContract.mockResolvedValue(true);mocks.rpc.getBlock.mockImplementation(async({blockNumber}:any)=>blockNumber===1n?{number:1n,hash:genesis}:{number:100n,hash,timestamp:BigInt(now/1000)});
});
afterEach(()=>{expect(requests.every(method=>method==='eth_accounts'||method==='eth_chainId')).toBe(true)});
describe('direct-controller operation-0 create-SL: offline/no-send boundary',()=>{
 it('actual SDK envelope binds sender, exact registry/deposit and whole-position quantity',async()=>{
  const result=await prepareControllerSafeCall(draft,controller,provider),call=expectedDraftCall(draft);
  const decoded=decodeFunctionData({abi:safeAbi,data:result.outer.data});
  expect(result.outer).toMatchObject({sender:controller,to:draft.owner,value:'0'});
  expect(decoded.functionName).toBe('execTransaction');expect(decoded.args?.slice(0,9)).toEqual([draft.registry,call.value,call.data,0,0n,0n,0n,'0x'+'0'.repeat(40),'0x'+'0'.repeat(40)]);
  expect(result.unsigned.nonce).toBe('7');expect(draft.quantity).toBe('0');expect(mocks.send).not.toHaveBeenCalled();
 });
 it.each(['controller','chain','contract-owner','existing-sl','incomplete','cancel'] as const)('refuses %s before any wallet send',async kind=>{
  if(kind==='controller')selected=draft.owner;if(kind==='chain')chainId='0x1';if(kind==='contract-owner')state.ownerCode[controller]='0x60';
  if(kind==='existing-sl')snapshot.stops=fixture('protected').stops;if(kind==='incomplete')snapshot.complete=false;if(kind==='cancel')draft.action='cancel-stop';
  await expect(prepareControllerSafeCall(draft,controller,provider)).rejects.toThrow();expect(mocks.send).not.toHaveBeenCalled();
 });
 it.each(['nonce','expiry','outer','controller','chain'] as const)('rejects reviewed %s substitution on explicit execution',async kind=>{
  const reviewed=await prepareControllerSafeCall(draft,controller,provider);
  if(kind==='nonce')state.nonce='8';if(kind==='expiry')reviewed.unsigned.expiresAt=new Date(Date.now()-1).toISOString();if(kind==='outer')reviewed.outer.value='1';if(kind==='controller')selected=draft.owner;if(kind==='chain')chainId='0x1';
  await expect(executeControllerSafeSl(draft,reviewed,provider)).rejects.toThrow();expect(mocks.send).not.toHaveBeenCalled();
 });
 it('retains the monitored Safe lock after uncertain outer outcome; no provider send or retry',async()=>{
  const reviewed=await prepareControllerSafeCall(draft,controller,provider),journal=new Journal(':memory:');
  try{
   const op=journal.reserve(draft,'first');journal.transition(op.id,'AwaitingSignature');
   await expect(executeControllerSafeSl(draft,reviewed,provider)).rejects.toThrow('NO_SEND_BOUNDARY_OUTCOME_UNKNOWN');
   journal.transition(op.id,'Unknown',undefined,'Offline boundary outcome uncertain');
   expect(journal.get(op.id)).toMatchObject({owner:draft.owner,state:'Unknown',txHash:null});
   expect(()=>journal.reserve(draft,'retry')).toThrow('OPERATION_IN_FLIGHT');expect(mocks.send).toHaveBeenCalledTimes(1);
  }finally{journal.close()}
 });
});
