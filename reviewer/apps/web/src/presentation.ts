import type {AccountModel,RecordedCapture} from '../../../packages/domain/types';
export function describeAccount(account:AccountModel|null){
  return account?.architecture==='official-safe'?(account.reason==='ACCOUNT_EXECUTION_SHAPE_UNSUPPORTED'?'Official factory Safe · execution shape unsupported':'Official factory Safe · threshold 1 proof; direct-controller create-SL requires fresh review')
    :account?.code==='empty'?'Strict direct EOA proof; current wallet authority checked separately'
    :'Unknown / unclassified · no supported execution proven';
}
/** Display labels only. Never infer evidence validity or signing permission from a label. */
export type DeskMode = 'replay' | 'live-readonly' | 'live-owner';

export function parseDeskMode(value: unknown): DeskMode | null {
  return value === 'replay' || value === 'live-readonly' || value === 'live-owner' ? value : null;
}

export function describeMode(mode: DeskMode | null) {
  if (mode === 'replay') return {
    label: 'REPLAY · fixtures',
    description: 'Synthetic scenarios demonstrate behavior. No live account or chain verification.',
  };
  if (mode === 'live-readonly') return {
    label: 'LIVE · read-only',
    description: 'Reads a configured testnet account. This instance cannot send transactions. A live source does not mean protection is verified.',
  };
  if (mode === 'live-owner') return {
    label: 'LOCAL OWNER · testnet',
    description: 'Reads a configured testnet account. Any repair requires the exact owner wallet and a separate confirmation. No server signing key.',
  };
  return {
    label: 'Mode unconfirmed',
    description: 'Waiting for the instance configuration. No live or replay evidence has been established.',
  };
}

export function evidenceFilename(mode: DeskMode | null, scenario: string) {
  const safeScenario = /^[a-z0-9-]+$/.test(scenario) ? scenario : 'scenario';
  return mode === 'replay' ? `dreamshield-replay-${safeScenario}-evidence.json`
    : `dreamshield-${mode ?? 'unconfirmed'}-evidence.json`;
}

export function describeRecorded(capture:RecordedCapture){
 return {label:'RECORDED · real chain capture',description:`Block ${capture.pin.block} · opening ${capture.opening.txHash}. User-created via official DreamDEX UI / Safe, not live, not DreamShield-executed. Known IDs only; aggregate discovery failed.`};
}
