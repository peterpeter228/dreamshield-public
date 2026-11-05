import {createEVM} from '@ethereumjs/evm';
import {Common, Mainnet, Hardfork} from '@ethereumjs/common';
import {Account, bytesToHex,createAddressFromString,hexToBytes} from '@ethereumjs/util';
import fs from 'node:fs';
const old=JSON.parse(fs.readFileSync(new URL('./legacy-proxy-runtime.json',import.meta.url))).deployedBytecode;
const target='0x60806040525f5463a619486e5f3560e01c146030575f8091368280378136915af43d5f803e15602c573d5ff35b3d5ffd5b60601b606c5260206060f3fea264697066735822122052ebe5837e93aeeebe7c7bd4a52dd4a1efcfd6f36c88f74ed36ebe47b30b033d64736f6c63430008220033';
const addr=x=>createAddressFromString('0x'+x.padStart(40,'0'));
const proxy=addr('c0'),callee=addr('c1'),caller=addr('ee');
const word=x=>hexToBytes('0x'+x.padStart(64,'0'));
const mocks={empty:'0x00',echo:'0x365f5f37365ff3',revertEcho:'0x365f5f37365ffd',return32:'0x602a5f5260205ff3',return4096:'0x6110005ff3',revertEmpty:'0x5f5ffd',context:'0x305f52336020523460405260605ff3',writeSlot:'0x602a6001556001545f5260205ff3',invalid:'0xfe',noCode:'0x'};
const data=['0x','0xa6','0xa61948','0xa619486e','0xa619486e'+'00'.repeat(28),'0xa619486e01','0xa619486e'+'ff'.repeat(60),'0x12345678','0x'+'ab'.repeat(8192)];
async function run(code,mock,input,slot='c1',gas=1000000n){
 const evm=await createEVM({common:new Common({chain:Mainnet,hardfork:Hardfork.Cancun})});
 await evm.stateManager.putAccount(caller,new Account(0n,1000000n));await evm.stateManager.putAccount(proxy,new Account());await evm.stateManager.putAccount(callee,new Account());
 await evm.stateManager.putCode(proxy,hexToBytes(code));await evm.stateManager.putCode(callee,hexToBytes(mock));await evm.stateManager.putStorage(proxy,word('0'),word(slot));
 const calls=[];evm.events.on('beforeMessage',m=>{calls.push({to:m.to?.toString(),caller:m.caller.toString(),delegatecall:m.delegatecall,codeAddress:m.codeAddress?.toString(),data:bytesToHex(m.data),value:String(m.value)});});
 const r=await evm.runCall({caller,to:proxy,data:hexToBytes(input),gasLimit:gas,value:7n});
 return {error:r.execResult.exceptionError?.error??null,out:bytesToHex(r.execResult.returnValue),slot1:bytesToHex(await evm.stateManager.getStorage(proxy,word('1'))),calls,gas:String(r.execResult.executionGasUsed)};
}
const results=[];for(const [name,mock] of Object.entries(mocks))for(const input of data){const a=await run(old,mock,input),b=await run(target,mock,input);const strip=({gas,...x})=>x;results.push({name,inputBytes:(input.length-2)/2,inputPrefix:input.slice(0,18),equal:JSON.stringify(strip(a))===JSON.stringify(strip(b)),a,b});}
for(const slot of ['0','ff'.repeat(12)+'c1'.padStart(40,'0')])for(const input of ['0xa619486e','0x12345678']){const a=await run(old,mocks.echo,input,slot),b=await run(target,mocks.echo,input,slot);const strip=({gas,...x})=>x;results.push({name:'slot:'+slot,input,equal:JSON.stringify(strip(a))===JSON.stringify(strip(b)),a,b});}
const mismatches=results.filter(x=>!x.equal);fs.writeFileSync('results.json',JSON.stringify({at:new Date().toISOString(),hardfork:'Cancun',synthetic:true,comparison:'return/error/slot1/delegate-frame; excludes gas',count:results.length,mismatches:mismatches.length,results},null,2));console.log(JSON.stringify({count:results.length,mismatches:mismatches.map(x=>({name:x.name,input:x.input??x.inputPrefix,a:x.a,b:x.b}))},null,2));process.exitCode=mismatches.length?1:0;
const limits=[];
for(const gas of [2200n,2500n,5000n,1000000n]){const a=await run(old,'0x5a5f5260205ff3','0x12345678','c1',gas),b=await run(target,'0x5a5f5260205ff3','0x12345678','c1',gas);limits.push({case:'gas-observing callee',gas:String(gas),sameOutput:a.out===b.out,a,b});}
const lower=results.map(x=>({name:x.name,input:x.input??x.inputPrefix,oldGas:x.a.gas,newGas:x.b.gas})).filter(x=>x.oldGas!==x.newGas);fs.writeFileSync('gas-limitations.json',JSON.stringify({limits,gasDifferences:lower},null,2));console.log('Gas-sensitive differences are expected, not proof of universal equivalence:',JSON.stringify(limits.map(x=>({gas:x.gas,sameOutput:x.sameOutput,oldError:x.a.error,newError:x.b.error,oldOutput:x.a.out,newOutput:x.b.out}))));
const mutations=[];
for(const [label,mut] of [['selector-shift tamper',target.replace('5f3560e01c14','5f3560e01b14')],['metadata-only tamper',target.slice(0,-10)+'01'+target.slice(-8)]]){const orig=await run(target,mocks.echo,'0xa619486e'),changed=await run(mut,mocks.echo,'0xa619486e');mutations.push({label,differentBytes:mut!==target,originalOutput:orig.out,modifiedOutput:changed.out,sameBehavior:orig.out===changed.out&&orig.error===changed.error});}
fs.writeFileSync('mutation-demonstrations.json',JSON.stringify(mutations,null,2));console.log('Mutation demonstrations:',JSON.stringify(mutations));
