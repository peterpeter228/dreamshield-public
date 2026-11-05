import {describe,it,expect} from 'vitest';
import {keccak256,type Hex} from 'viem';
import {verifyAccountExecution} from '../../packages/protocol/account-proof.js';
import {createSyntheticSafeEvidence} from '../fixtures/live-evidence.js';
// Exact full runtime independently reviewed against official Safe1.5 source; not compiler reproduction.
const observed:Hex='0x60806040525f5463a619486e5f3560e01c146030575f8091368280378136915af43d5f803e15602c573d5ff35b3d5ffd5b60601b606c5260206060f3fea264697066735822122052ebe5837e93aeeebe7c7bd4a52dd4a1efcfd6f36c88f74ed36ebe47b30b033d64736f6c63430008220033';
function fixture(){const f=createSyntheticSafeEvidence('sender');return {account:f.lifecycle.identity.owner,p:f.lifecycle.observations[0]!.opening!};}
describe('reviewed exact-runtime boundary: synthetic proof, not live G0/G1',()=>{
 it('retains legacy independently pinned reference',()=>{const {account,p}=fixture();expect(()=>verifyAccountExecution(account,p.transaction,p.receipt,p.accountExecution!)).not.toThrow();});
 it.each(['sender','signed'] as const)('accepts independently reviewed full variant with %s evidence',approval=>{const f=createSyntheticSafeEvidence(approval);const p=f.lifecycle.observations[0]!.opening!;const proof=p.accountExecution!;proof.before.codeHash=proof.after.codeHash=keccak256(observed);expect(()=>verifyAccountExecution(f.lifecycle.identity.owner,p.transaction,p.receipt,proof)).not.toThrow();});
 it.each([
  ['execution byte modified',('0x61'+observed.slice(4)) as Hex],
  ['metadata byte modified',(observed.slice(0,-6)+'ff0033') as Hex],
  ['truncated',(observed.slice(0,-2)) as Hex],
  ['appended',(observed+'00') as Hex],
  ['unknown','0x00' as Hex],
 ])('rejects %s',(_name,code)=>{const {account,p}=fixture();const proof=p.accountExecution!;proof.before.codeHash=proof.after.codeHash=keccak256(code);expect(()=>verifyAccountExecution(account,p.transaction,p.receipt,proof)).toThrow('ACCOUNT_IMPLEMENTATION_UNATTESTED');});
 it('rejects mutation of every byte, including full metadata',()=>{for(let i=2;i<observed.length;i+=2){const code=(observed.slice(0,i)+(parseInt(observed.slice(i,i+2),16)^1).toString(16).padStart(2,'0')+observed.slice(i+2)) as Hex;const {account,p}=fixture();p.accountExecution!.before.codeHash=p.accountExecution!.after.codeHash=keccak256(code);expect(()=>verifyAccountExecution(account,p.transaction,p.receipt,p.accountExecution!)).toThrow('ACCOUNT_IMPLEMENTATION_UNATTESTED');}});
 it.each(['factory','singleton-hash','singleton-slot','fallback-slot','controller','threshold','module','guard','trace-from'] as const)('rejects reviewed variant with wrong %s',kind=>{
  const {account,p}=fixture();const proof=p.accountExecution!;proof.before.codeHash=proof.after.codeHash=keccak256(observed);
  const wrong='0x9999999999999999999999999999999999999999' as const;
  if(kind==='factory')proof.before.factoryAccount=wrong;
  if(kind==='singleton-hash')proof.before.singletonCodeHash=`0x${'f'.repeat(64)}`;
  if(kind==='singleton-slot')proof.before.slots.singleton=wrong;
  if(kind==='fallback-slot')proof.before.slots.fallbackHandler=wrong;
  if(kind==='controller')proof.before.owners=[wrong];
  if(kind==='threshold')proof.before.threshold='2';
  if(kind==='module')proof.before.modules=[wrong];
  if(kind==='guard')proof.before.slots.guard=wrong;
  if(kind==='trace-from')proof.trace.root.from=wrong;
  expect(()=>verifyAccountExecution(account,p.transaction,p.receipt,proof)).toThrow();
 });

});
