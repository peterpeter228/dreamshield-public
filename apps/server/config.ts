import type { Mode } from '../../packages/domain/types.js';
export interface Config { mode:Mode; host:string; port:number; ownerEnabled:boolean; dataDir:string; owner:string|null; pool:string|null; }
export function loadConfig(env:NodeJS.ProcessEnv=process.env):Config {
 const mode=env.APP_MODE??'replay';if(!['replay','live-readonly','live-owner'].includes(mode))throw new Error('Invalid APP_MODE');
 const host=env.HOST??'127.0.0.1'; const writes=env.ALLOW_TESTNET_WRITES==='true'; const readonly=env.READ_ONLY!=='false';
 if(env.ALLOWED_CHAIN_ID&&env.ALLOWED_CHAIN_ID!=='50383')throw new Error('Only testnet 50383 is allowed');
 const local=['127.0.0.1','::1','localhost'].includes(host);
 if(mode!=='live-owner'&&(!readonly||writes))throw new Error('Read-only mode cannot enable writes');
 if(mode==='live-owner'&&(!local||readonly||!writes))throw new Error('Owner mode requires loopback, READ_ONLY=false and explicit testnet writes');
 const port=Number(env.PORT??3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
 return {mode:mode as Mode,host,port,ownerEnabled:mode==='live-owner'&&local&&!readonly&&writes,dataDir:env.DATA_DIR??'./data',owner:env.DEMO_OWNER_ADDRESS??null,pool:env.DEMO_POOL_ADDRESS??null};
}
