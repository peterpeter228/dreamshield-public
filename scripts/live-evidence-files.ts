import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateLiveEvidence,type LiveEvidenceValidation} from '../packages/domain/live-evidence.js';

export function readJsonFile(path:string):unknown {
 try{return JSON.parse(readFileSync(path,'utf8'));}catch(error){throw new Error(`${path}: ${error instanceof Error?error.message:String(error)}`);}
}
export function object(value:unknown):Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected JSON object');
 return value as Record<string,unknown>;
}
/** Raw-file hashes bind downloaded bytes; payload checksum is a separate consistency check, not attestation. */
function readReference(reference:unknown,metadataPath:string,label:string):unknown {
 const ref=object(reference);
 if(typeof ref.path!=='string'||!ref.path.trim()||typeof ref.sha256!=='string'||! /^[0-9a-f]{64}$/i.test(ref.sha256))throw new Error(`${label}: require path and raw-file SHA-256`);
 const path=resolve(dirname(resolve(metadataPath)),ref.path);
 let bytes:Buffer;try{bytes=readFileSync(path);}catch(error){throw new Error(`${label}: ${path}: ${error instanceof Error?error.message:String(error)}`,{cause:error});}
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==ref.sha256.toLowerCase())throw new Error(`${label}: SHA-256 mismatch at ${path}`);
 let value:unknown;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw new Error(`${label}: invalid JSON at ${path}`);}
 const body=object(value);
 if('sha256' in body){const {sha256,...payload}=body;const payloadDigest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');if(sha256!==payloadDigest)throw new Error(`${label}: payload checksum mismatch (distinct from raw-file SHA-256)`);}
 return value;
}
function failedReference(status:LiveEvidenceValidation['status'],error:string) {
 return {valid:false,errors:[error],status,eligibility:{realPerpsOrder:false,nativeProtectionReadback:false},fileOnly:true,originAuthenticated:false,currentChainRevalidated:false,historical:true,currentChainRevalidation:'NOT_RUN',originAuthentication:'NOT_ESTABLISHED'};
}
export function checkLiveReferences(metadata:Record<string,unknown>,metadataPath:string) {
 try {
  if(metadata.liveEvidence==null)return failedReference('MISSING','liveEvidence: no doctor/lifecycle references supplied');
  const refs=object(metadata.liveEvidence);
  const doctor=readReference(refs.doctor,metadataPath,'doctor');
  const downloaded=object(readReference(refs.lifecycle,metadataPath,'lifecycle'));
  // A server download wraps the durable lifecycle alongside current display context.
  if('lifecycle' in downloaded&&downloaded.mode!=='live-owner')return failedReference(downloaded.mode==='replay'||downloaded.mode==='live-readonly'?'HISTORICAL_OR_REPLAY':'INVALID','lifecycle: downloaded wrapper requires live-owner mode; replay/read-only exports cannot establish G1 acceptance');
  const lifecycle='lifecycle' in downloaded?downloaded.lifecycle:downloaded;
  return {...validateLiveEvidence(doctor,lifecycle),currentChainRevalidation:'NOT_RUN',originAuthentication:'NOT_ESTABLISHED'};
 }catch(error){const missing=error instanceof Error&&(error.cause as NodeJS.ErrnoException|undefined)?.code==='ENOENT';return failedReference(missing?'MISSING':'INVALID',error instanceof Error?error.message:String(error));}
}
