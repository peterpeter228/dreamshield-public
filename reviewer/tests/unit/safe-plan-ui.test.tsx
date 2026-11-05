import {describe,it,expect,vi} from 'vitest';
import {isValidElement,useState,type ReactNode,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {OwnerPanel} from '../../apps/web/src/OwnerPanel';
import {Timeline} from '../../apps/web/src/Timeline';
import {Repair} from '../../apps/web/src/Repair';
import {useOwner,type OwnerFlow} from '../../apps/web/src/owner';
import {Journal} from '../../packages/storage';
import {fixture} from '../../fixtures/scenarios';
import {createSlDraft} from '../../packages/domain';
import {assessDesk} from '../../packages/domain/desk';
import type {DeskResponse,Operation} from '../../packages/domain/types';
const snap=fixture('unprotected');
const controller='0x'+'3'.repeat(40);
const draft=createSlDraft(snap,'2800');
const operation:Operation={id:'synthetic',idempotencyKey:'fixture',owner:draft.owner,pool:draft.pool,state:'Draft',draft,txHash:null,error:null,createdAt:draft.createdAt,updatedAt:draft.createdAt};
const flow:OwnerFlow={account:{address:draft.owner,block:{number:'100',hash:'0x'+'a'.repeat(64)},code:'present',codeHash:'0x'+'a'.repeat(64),architecture:'official-safe',derivation:null,owners:[controller],threshold:'1',controlRead:'known',reason:'Synthetic account only'},monitoredOwner:draft.owner,connectedSigner:null,eligible:false,safeSendEligible:false,controllerCall:null,reviewController:async()=>{},safePrepareEligible:true,captureEligible:true,busy:false,operation,message:'',evidenceMessage:'',safePlan:null,controller,setController:()=>{},clearSafePlan:()=>{},prepareSafePlan:async()=>{},prepareFreshSafePlan:async()=>{},capture:async()=>{},prepare:async()=>{},send:async()=>{},reconcile:async()=>{},resume:()=>{},cancelDraft:async()=>{}};
function button(html:string,text:string){return html.match(new RegExp(`<button[^>]*>${text}</button>`))?.[0]??''}
describe('Safe unsigned UI boundaries (synthetic static rendering, not wallet/G1 proof)',()=>{
 it('keeps Safe wallet send disabled without connected-controller review but permits unsigned preparation and discard',()=>{const html=renderToStaticMarkup(<OwnerPanel flow={flow}/>);expect(button(html,'Review in owner wallet')).toContain('disabled');expect(button(html,'Prepare unsigned Safe plan')).not.toContain('disabled');expect(button(html,'Discard unsigned draft')).not.toContain('disabled');expect(button(html,'Review direct-controller call · no send')).toContain('disabled')});
 it('invalid controller disables preparation, and a plan error leaves Draft and discard visible',()=>{const html=renderToStaticMarkup(<OwnerPanel flow={{...flow,controller:'bad',message:'CONTROLLER_NOT_VERIFIED_EOA_OWNER'}}/>);expect(button(html,'Prepare unsigned Safe plan')).toContain('disabled');expect(html).toContain('CONTROLLER_NOT_VERIFIED_EOA_OWNER');expect(html).toContain('Reserved owner operation');expect(button(html,'Discard unsigned draft')).not.toContain('disabled')});
 it('unknown operation has no discard or plan preparation and no enabled Safe reconciliation',()=>{const html=renderToStaticMarkup(<OwnerPanel flow={{...flow,operation:{...operation,state:'Unknown'}}}/>);expect(html).not.toContain('Discard unsigned draft');expect(html).not.toContain('Prepare unsigned Safe plan');expect(button(html,'Reconcile this operation')).toContain('disabled')});
 it('restored Draft can be reviewed/discarded without an EOA wallet, while Unknown remains locked',()=>{const html=renderToStaticMarkup(<Timeline operations={[operation,{...operation,id:'unknown',state:'Unknown'}]} ownerFlow={flow} recheck={()=>{}}/>);expect(button(html,'Review reserved draft')).not.toContain('disabled');expect(button(html,'Discard unsigned draft')).not.toContain('disabled');expect(button(html,'Recover original transaction hash')).toContain('disabled')});
 it('NO_POSITION still disables stop preview for a known Safe',()=>{const snapshot=fixture('no-position');const data:DeskResponse={snapshot,assessment:assessDesk(snapshot,[]),operations:[],capabilities:{account:flow.account,monitoredOwner:draft.owner,mode:'live-owner',ownerEnabled:true,signerAvailable:false,reason:'Synthetic no-position fixture'}};const html=renderToStaticMarkup(<Repair data={data} assessment={data.assessment} ownerFlow={{...flow,operation:null}}/>);expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Preview stop/);expect(html).toContain('A non-zero position is required');expect(html).not.toContain('Reserve unsigned Safe draft')});
 it('recovers persisted Safe operations after reload, reconnect and explicit controller selection without sending; mismatches stay refused',async()=>{
  type Control={id?:string;children?:ReactNode;disabled?:boolean;onClick?:()=>void;onChange?:(event:{target:{value:string}})=>void};
  function find(node:ReactNode,predicate:(element:ReactElement<Control>)=>boolean):ReactElement<Control>|undefined{
   if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found}return}
   if(!isValidElement<Control>(node))return;
   return predicate(node)?node:find(node.props.children,predicate);
  }
  const input=(node:ReactNode,id:string)=>find(node,element=>element.type==='input'&&element.props.id===id);
  const action=(node:ReactNode,name:string)=>find(node,element=>element.type==='button'&&element.props.children===name)!.props;
  const hash='0x'+'a'.repeat(64),other='0x'+'4'.repeat(40),wallet={account:controller,chain:'0xc4cf'};
  const fresh=fixture('unprotected'),snapshot={...fresh,mode:'live-owner' as const,position:{...fresh.position!,source:'chain' as const}};
  const journals={Submitted:new Journal(':memory:'),Unknown:new Journal(':memory:')};let journal=journals.Submitted;
  let finish:()=>void;
  const requests:{path:string;body:Record<string,string>}[]=[];
  const fetchStub=vi.fn(async(path:string,init?:RequestInit)=>{
   if(path==='/api/config')return Response.json({mode:'live-owner',ownerEnabled:true,csrfToken:'synthetic-local-token'});
   const body=JSON.parse(String(init?.body??'{}'));requests.push({path,body});
   const match=path.match(/^\/api\/operations\/([^/]+)\/(recover-hash|state|reconcile)$/);if(!match)throw Error('UNEXPECTED_OWNER_REQUEST:'+path);
   const [,id,kind]=match;
   const op=kind==='recover-hash'?journal.bindRecoveredHash(id,body.txHash,body.owner,body.pool):kind==='state'?journal.transition(id,'Unknown',body.txHash):
    (journal.transition(id,'Reconcile'),journal.transition(id,'NeedsReview',undefined,'Offline read-back incomplete; retain lock'));
   return Response.json({operation:op});
  });
  const providerAccess=vi.fn(()=>{throw Error('NO_PROVIDER_ACCESS_IN_READONLY_RECOVERY')});
  vi.stubGlobal('fetch',fetchStub);vi.stubGlobal('window',Object.defineProperty({},'ethereum',{get:providerAccess}));
  // React's own render-phase updates drive the actual hooks and rendered control handlers.
  // Each fresh server render resets all browser-local owner state, like a reload; no DOM/GUI runtime is required.
  function restoredUI(data:DeskResponse,selectedWallet:typeof wallet|null,selection:string,enabled:boolean){
   let click:(()=>void)|undefined;
   function Restored(){
    const [step,setStep]=useState(0),[connected,setConnected]=useState<typeof wallet|null>(null);
    const owner=useOwner(data,connected,async()=>finish()),panel=OwnerPanel({flow:owner}),timeline=Timeline({operations:data.operations,recheck:()=>{},ownerFlow:owner});
    const op=data.operations[0],name=op.txHash?'Reconcile operation':'Recover original transaction hash',control=input(panel,'safe-controller');
    if(step===0){expect(owner.operation).toBeNull();expect(owner.controller).toBe('');expect(action(timeline,name).disabled).toBe(true);setConnected(selectedWallet);setStep(1)}
    else if(step===1){
     expect(owner.controller).toBe('');expect(action(timeline,name).disabled).toBe(true);
     if(control){control.props.onChange!({target:{value:selection}});setStep(2)}else expect(enabled).toBe(false);
    }else if(step===2){
     expect(action(timeline,name).disabled).toBe(!enabled);expect(owner.safePlan).toBeNull();expect(owner.controllerCall).toBeNull();
     if(enabled){if(op.txHash)click=action(timeline,name).onClick;else{action(timeline,name).onClick!();setStep(3)}}
    }else if(step===3){
     expect(owner.operation?.id).toBe(op.id);expect(action(panel,'Reconcile this operation').disabled).toBe(true);
     input(panel,'recovered-hash')!.props.onChange!({target:{value:'invalid'}});setStep(4);
    }else if(step===4){
     expect(action(panel,'Reconcile this operation').disabled).toBe(true);input(panel,'recovered-hash')!.props.onChange!({target:{value:hash}});setStep(5);
    }else{expect(action(panel,'Reconcile this operation').disabled).toBe(false);click=action(panel,'Reconcile this operation').onClick}
    return <>{panel}{timeline}</>;
   }
   renderToStaticMarkup(<Restored/>);return click;
  }
  try{
   for(const state of ['Submitted','Unknown'] as const){
    journal=journals[state];
    const op=journal.reserve(draft,'reload-'+state);journal.transition(op.id,'AwaitingSignature');journal.transition(op.id,state,state==='Submitted'?hash:undefined);
    const persisted=journal.get(op.id)!;
    const data:DeskResponse={snapshot,assessment:assessDesk(snapshot,[persisted]),operations:[persisted],capabilities:{account:flow.account,monitoredOwner:draft.owner,mode:'live-owner',ownerEnabled:true,signerAvailable:false,reason:'Synthetic persisted Safe'}};
    expect(data.assessment.verdict).toBe(state==='Unknown'?'UNKNOWN':'PENDING');
    const before=fetchStub.mock.calls.length;
    for(const mismatch of [
     {data,wallet:null,selection:controller},{data,wallet:{...wallet,account:other},selection:controller},
     {data,wallet:{...wallet,chain:'0x1'},selection:controller},{data,wallet,selection:other},
     {data:{...data,capabilities:{...data.capabilities,monitoredOwner:other}},wallet,selection:controller},
     {data:{...data,capabilities:{...data.capabilities,account:{...flow.account!,controlRead:'unknown' as const}}},wallet,selection:controller},
     {data:{...data,snapshot:{...snapshot,mode:'live-readonly' as const}},wallet,selection:controller},
     {data:{...data,capabilities:{...data.capabilities,mode:'replay' as const}},wallet,selection:controller},
     {data:{...data,capabilities:{...data.capabilities,ownerEnabled:false}},wallet,selection:controller}
    ])expect(restoredUI(mismatch.data,mismatch.wallet,mismatch.selection,false)).toBeUndefined();
    expect(fetchStub.mock.calls.length).toBe(before);
    const done=new Promise<void>(resolve=>{finish=resolve}),click=restoredUI(data,wallet,controller,true);
    expect(click).toBeTypeOf('function');click!();await done;
    expect(journal.get(op.id)).toMatchObject({owner:draft.owner,state:'NeedsReview',txHash:hash,...(state==='Unknown'?{hashProvenance:'recovered'}:{})});
    expect(()=>journal.reserve(draft,'replacement-'+state)).toThrow('OPERATION_IN_FLIGHT');
    if(state==='Unknown')expect(requests.find(row=>row.path.endsWith('/recover-hash'))?.body).toEqual({txHash:hash,owner:draft.owner,pool:draft.pool});
   }
  }finally{for(const stored of Object.values(journals))stored.close();vi.unstubAllGlobals();expect(providerAccess).not.toHaveBeenCalled()}
 });
});
