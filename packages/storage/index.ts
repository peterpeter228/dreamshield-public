import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { transitionOperation } from '../domain/index.js';
import type { Operation, OperationState, RepairDraft } from '../domain/types.js';
const TERMINAL = ['Applied','Failed','Cancelled'];
export interface ReconciliationProof { readBackVerified?: boolean; receiptFailed?: boolean; }
export class Journal {
 private db:DatabaseSync;
 constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL, owner TEXT NOT NULL, pool TEXT NOT NULL, state TEXT NOT NULL, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS cursors(key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, body TEXT NOT NULL); PRAGMA user_version=1;`);}
 list():Operation[]{return this.db.prepare('SELECT body FROM operations ORDER BY rowid DESC').all().map(r=>JSON.parse(String(r.body)) as Operation);}
 get(id:string):Operation|null{const r=this.db.prepare('SELECT body FROM operations WHERE id=?').get(id);return r?JSON.parse(String(r.body)) as Operation:null;}
 reserve(draft:RepairDraft,key:string):Operation {this.db.exec('BEGIN IMMEDIATE');try{const found=this.db.prepare('SELECT body FROM operations WHERE idempotency_key=?').get(key);if(found){const op=JSON.parse(String(found.body)) as Operation;if(JSON.stringify({...op.draft,createdAt:null})!==JSON.stringify({...draft,createdAt:null}))throw new Error('IDEMPOTENCY_CONFLICT');this.db.exec('COMMIT');return op;}const active=this.list().find(o=>o.owner.toLowerCase()===draft.owner.toLowerCase()&&!TERMINAL.includes(o.state));if(active)throw new Error('OPERATION_IN_FLIGHT');const now=new Date().toISOString();const op:Operation={id:randomUUID(),idempotencyKey:key,owner:draft.owner,pool:draft.pool,state:'Draft',draft,txHash:null,error:null,createdAt:now,updatedAt:now};this.db.prepare('INSERT INTO operations VALUES(?,?,?,?,?,?)').run(op.id,key,op.owner,op.pool,op.state,JSON.stringify(op));this.db.exec('COMMIT');return op;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 /** Proof flags come only from the server's verified reconciliation result, never a request body. */
 transition(id:string,state:OperationState,txHash?:string,error?:string,proof:ReconciliationProof={}):Operation{
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const op=this.get(id);if(!op)throw new Error('NOT_FOUND');
   const next=transitionOperation(op,state,{txHash,error:error?.slice(0,300),...proof});
   this.db.prepare('UPDATE operations SET state=?,body=? WHERE id=?').run(state,JSON.stringify(next),id);
   this.db.exec('COMMIT');return next;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 /** Recover a wallet-returned hash without changing outcome, unlocking, or sending. */
 bindRecoveredHash(id:string,txHash:string,owner:string,pool:string):Operation {
  this.db.exec('BEGIN IMMEDIATE');
  try {
   const op=this.get(id);if(!op)throw new Error('NOT_FOUND');
   if(op.owner.toLowerCase()!==owner.toLowerCase()||op.pool.toLowerCase()!==pool.toLowerCase())throw new Error('OPERATION_SCOPE_MISMATCH');
   if(op.state!=='Unknown'&&op.state!=='AwaitingSignature')throw new Error('HASH_RECOVERY_STATE_REQUIRED');
   if(typeof txHash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw new Error('INVALID_TX_HASH');
   if(op.txHash&&op.txHash.toLowerCase()!==txHash.toLowerCase())throw new Error('TX_HASH_IMMUTABLE');
   const next:Operation={...op,state:'Unknown',hashProvenance:op.hashProvenance??(!op.txHash?'recovered':undefined),txHash:op.txHash??txHash,error:'Recovered hash is unverified. Reconcile this original operation; do not resend.',updatedAt:new Date().toISOString()};
   this.db.prepare('UPDATE operations SET state=?,body=? WHERE id=?').run(next.state,JSON.stringify(next),id);
   this.db.exec('COMMIT');return next;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 recover():number{
  let count=0;
  for(const op of this.list()){
   if(op.state==='AwaitingSignature'||op.state==='Reconcile'){
    this.transition(op.id,'Unknown',undefined,op.state==='AwaitingSignature'?'Restart during wallet request; reconcile before another send.':'Restart during reconciliation; recheck the original operation before another send.');
    count++;
   }
  }
  return count;
 }
 recordEvent(id:string,body:unknown):boolean{return this.db.prepare('INSERT OR IGNORE INTO events VALUES(?,?)').run(id,JSON.stringify(body)).changes===1;}
 setCursor(key:string,value:string){this.db.prepare('INSERT INTO cursors VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);}
 getCursor(key:string):string|null{return String(this.db.prepare('SELECT value FROM cursors WHERE key=?').get(key)?.value??'')||null;}
 close(){this.db.close();}
}
