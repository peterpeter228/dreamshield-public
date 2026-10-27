import {readJsonFile,object,checkLiveReferences} from './live-evidence-files.js';
const args=process.argv.slice(2);
try {
 let manifestPath='evidence/manifest.json';let submissionPath='evidence/submission.json';let allowIncomplete=false;let positional=false;
 for(let i=0;i<args.length;i++){
  const arg=args[i]!;
  if(arg==='--submission'){const next=args[++i];if(!next||next.startsWith('--'))throw new Error('--submission requires a metadata path');submissionPath=next;}
  else if(arg==='--allow-incomplete')allowIncomplete=true;
  else if(arg.startsWith('-')||positional)throw new Error(`Unexpected argument: ${arg}`);
  else{manifestPath=arg;positional=true;}
 }
 const manifest=object(readJsonFile(manifestPath));
 if(manifest.schemaVersion!==1||manifest.project!=='DreamShield')throw new Error('Invalid historical evidence manifest schema/project');
 const metadata=object(readJsonFile(submissionPath));const evidence=checkLiveReferences(metadata,submissionPath);
 console.log(JSON.stringify({status:evidence.valid?'CAPTURED_COMPLETE':allowIncomplete?'OFFLINE_SCHEMA_ONLY':'BLOCKED',schema:'valid',liveVerified:evidence.valid,liveChecks:evidence.valid?'CAPTURED_FILE_VALIDATION_ONLY':'NOT_RUN_OR_INVALID',offlineSchemaOnly:allowIncomplete,manifestPath,submissionPath,evidence,reason:'File-only internal consistency; no origin authentication or current chain coverage. Offline allowance cannot satisfy live acceptance.'},null,2));
 if(!evidence.valid&&!allowIncomplete)process.exitCode=2;
}catch(error){console.log(JSON.stringify({status:'BLOCKED',liveVerified:false,errors:[error instanceof Error?error.message:String(error)],currentChainRevalidation:'NOT_RUN'},null,2));process.exitCode=2;}
