import {resolve} from 'node:path';
import {readJsonFile,object,checkLiveReferences} from './live-evidence-files.js';
const path=process.argv[2]??'evidence/submission.json';
try {
 const metadata=object(readJsonFile(path));
 const required=['whitelistVerified','reviewerRepositoryAccess','realPerpsOrder','nativeProtectionReadback','demoReady','xPost1','xPost2'];
 const missing=required.filter(key=>key.startsWith('xPost')?typeof metadata[key]!=='string'||!String(metadata[key]).trim():metadata[key]!==true);
 const evidence=checkLiveReferences(metadata,path);
 if(!evidence.valid)missing.push('validLiveEvidence');
 for(const key of ['realPerpsOrder','nativeProtectionReadback'] as const)if(!evidence.eligibility[key]&&!missing.includes(key))missing.push(key);
 console.log(JSON.stringify({status:missing.length?'BLOCKED':'READY_FOR_OWNER_SUBMISSION',metadataPath:resolve(path),missing,evidence,submitted:typeof metadata.buildUrl==='string'&&!!metadata.buildUrl,buildUrl:metadata.buildUrl??null,metadataModified:false},null,2));
 if(missing.length)process.exitCode=2;
}catch(error){console.log(JSON.stringify({status:'BLOCKED',errors:[error instanceof Error?error.message:String(error)],metadataModified:false},null,2));process.exitCode=2;}
