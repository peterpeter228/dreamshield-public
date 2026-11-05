/// <reference lib="es2024.promise" />
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createStaticSession,sha256,T} from '../../apps/web/src/static/export';
import type {ReadyContext,RecordedObservation,StaticSession} from '../../apps/web/src/static/export';
import {readRecorded} from '../../apps/web/src/static/recorded';
import raw from '../../fixtures/recorded/opening-2026-11-04.json';
import {SCENARIOS} from '../../fixtures/scenarios';
const observation=raw as RecordedObservation,synthetic={source:'synthetic' as const,scenario:'unprotected'},recorded={source:'recorded' as const,scenario:'recorded'};
async function downloaded(c:ReadyContext,session:StaticSession){let blob!:Blob,name='';expect(session.download(c,(b,n)=>{blob=b;name=n})).toBe(true);const text=await blob.text(),p=JSON.parse(text),s=Object.fromEntries(Object.keys(c.data.snapshot).map(k=>[k,p[k]]));expect(s).toEqual(c.data.snapshot);expect(p.assessment).toEqual(c.assessment);expect(p.recordedCapture).toEqual(c.data.recordedCapture);expect(p.staticContext.source).toBe(c.source);expect(p.staticContext.snapshotSha256).toBe(createHash('sha256').update(JSON.stringify(s)).digest('hex'));expect(p.staticContext.snapshotSha256).toBe(c.snapshotSha256);expect(p.artifactType).toBe('dreamshield-static-readonly-observation');expect(p.liveWorkflowVerified).toBe(false);expect(p.realSendProof).toBe('NONE');expect(name).toBe(`dreamshield-replay-${c.scenario}-evidence.json`);return text}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
it.each(SCENARIOS)('binds immutable displayed %s snapshot to actual Blob and deterministic export',async scenario=>{
 const session=createStaticSession(async()=>observation,()=>{});await session.load({...synthetic,scenario});const c=session.state.ready!;expect(Object.isFrozen(c.data.snapshot.market)).toBe(true);
 if(scenario==='stale'){expect(c.assessment.verdict).toBe('UNKNOWN');expect(c.assessment.reasonCodes).toContain('STALE_DATA');for(const at of [c.data.snapshot.capturedAt,c.data.snapshot.market!.observedAt,c.data.snapshot.position!.observedAt])expect(T-Date.parse(at)).toBe(60000)}
 const body=await downloaded(c,session);await session.load({...synthetic,scenario});expect(await downloaded(session.state.ready!,session)).toBe(body);expect(session.download(c,()=>{throw Error('obsolete download')})).toBe(false);
});
it('gates real packaged recorded bytes and exports historical UNKNOWN without changing provenance',async()=>{
 vi.stubGlobal('document',{baseURI:'http://localhost/'});vi.stubGlobal('location',{origin:'http://localhost'});vi.stubGlobal('fetch',async(url:URL)=>new Response(url.pathname.includes('sanitized')?readFileSync('evidence/recorded/opening-2026-11-04.sanitized.json'):JSON.stringify(raw)));
 const session=createStaticSession(readRecorded,()=>{});await session.load(recorded);const c=session.state.ready!;expect(c.assessment.verdict).toBe('UNKNOWN');expect(c.assessment.reasonCodes).toContain('READ_FAILED');expect(c.assessment.stopRisk).toMatchObject({quality:'EXTREME_DISTANCE',distanceBps:'9999',triggerPrice:'100000000000000000'});expect(c.data.snapshot.scope).toBe('knownIdsOnly');await downloaded(c,session);
 vi.stubGlobal('fetch',async()=>new Response('{}'));await session.load(recorded);expect(session.state).toMatchObject({ready:null,loading:false,error:'READ_FAILED — recorded capture unavailable'});
});
it.each(['load-success','load-error','digest-success','digest-error'])('suppresses obsolete %s after switch or same-selection Recheck',async stage=>{
 for(const from of [recorded,synthetic])for(const to of [synthetic,recorded,from]){
  const wait=Promise.withResolvers<RecordedObservation>(),hash=Promise.withResolvers<string>(),entered=Promise.withResolvers<void>();let first=true;
  const session=createStaticSession(()=>{if(first&&stage.startsWith('load')){first=false;entered.resolve();return wait.promise}return Promise.resolve(observation)},()=>{},async bytes=>{if(first&&stage.startsWith('digest')){first=false;entered.resolve();return hash.promise}return sha256(bytes)});
  const a=session.load(stage.startsWith('load')?recorded:from);await entered.promise;expect(session.state.ready).toBeNull();await session.load(to);const b=session.state.ready!,before=session.state;
  if(stage==='load-success')wait.resolve(observation);if(stage==='load-error')wait.reject(Error('old load'));if(stage==='digest-success')hash.resolve('obsolete');if(stage==='digest-error')hash.reject(Error('old digest'));await a;
  expect(session.state).toBe(before);expect(session.state.ready).toBe(b);await downloaded(b,session);
 }
});
it('clears old ready context synchronously and rejects downloads on current digest failure or unmount',async()=>{
 let fail=false;const wait=Promise.withResolvers<string>(),session=createStaticSession(async()=>observation,()=>{},bytes=>fail?wait.promise:sha256(bytes));await session.load(synthetic);const c=session.state.ready!;fail=true;const loading=session.load(synthetic);expect(session.state).toMatchObject({ready:null,loading:true,notice:'',error:''});expect(session.download(c,()=>{throw Error('old export')})).toBe(false);wait.reject(Error('digest failed'));await loading;expect(session.state).toMatchObject({ready:null,loading:false,error:'READ_FAILED — static snapshot unavailable'});session.invalidate();expect(session.download(c,()=>{throw Error('unmounted export')})).toBe(false);
});
it.each(['fetch-success','fetch-error','provenance-success','provenance-error'])('suppresses obsolete real recorded gate %s',async stage=>{
 const entered=Promise.withResolvers<void>(),release=Promise.withResolvers<void>(),nativeDigest=crypto.subtle.digest.bind(crypto.subtle);let first=true;
 vi.stubGlobal('document',{baseURI:'http://localhost/'});vi.stubGlobal('location',{origin:'http://localhost'});
 vi.stubGlobal('fetch',async(url:URL)=>{if(first&&stage.startsWith('fetch')){first=false;entered.resolve();await release.promise}return new Response(url.pathname.includes('sanitized')?readFileSync('evidence/recorded/opening-2026-11-04.sanitized.json'):JSON.stringify(raw))});
 vi.spyOn(crypto.subtle,'digest').mockImplementation(async(algorithm,bytes)=>{if(first&&stage.startsWith('provenance')){first=false;entered.resolve();await release.promise}return nativeDigest(algorithm,bytes)});
 const session=createStaticSession(readRecorded,()=>{}),old=session.load(recorded);await entered.promise;await session.load(synthetic);const before=session.state;if(stage.endsWith('error'))release.reject(Error('obsolete gate'));else release.resolve();await old;expect(session.state).toBe(before);await downloaded(session.state.ready!,session);
});
