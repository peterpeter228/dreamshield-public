import type { ReactNode } from 'react';
export function Icon({name='shield',size=20}:{name?:string;size?:number}) {const paths:Record<string,ReactNode>={shield:<><path d="M12 3 21 6v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/></>,refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></>,copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,file:<><path d="M6 2h8l4 4v16H6zM14 2v5h4M9 12h6m-6 4h6"/></>,warning:<><path d="m12 3 10 18H2zM12 9v5m0 3v1"/></>};return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]??paths.info}</svg>}
export function Panel({title,action,children,className=''}:{title:string;action?:ReactNode;children:ReactNode;className?:string}) {return <section className={'panel '+className}><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>}
export function short(value?:string|null){return value?`${value.slice(0,6)}…${value.slice(-4)}`:'Not available'}
export function friendly(value:string){return value.toLowerCase().replaceAll('_',' ').replace(/^./,s=>s.toUpperCase())}
const reasonLabels:Readonly<Record<string,string>>={
  INVALID_CLOCK:'The current clock is invalid; freshness cannot be verified.',
  READ_FAILED:'The latest read failed; previous observations cannot prove current protection.',
  MISSING_SNAPSHOT:'Market or position data is missing; protection cannot be verified.',
  IDENTITY_MISMATCH:'Chain or pool identities do not match; protection cannot be verified.',
  INVALID_IDENTITY:'An owner or protocol address is invalid; protection cannot be verified.',
  INCOMPLETE_DISCOVERY:'Stop discovery is incomplete; an empty result does not prove there are no stops.',
  MARK_UNAVAILABLE:'A valid mark price is unavailable; stop triggers cannot be verified.',
  INVALID_OBSERVATION_TIME:'An observation timestamp is invalid or in the future; freshness cannot be verified.',
  STALE_DATA:'Reads are stale; refresh before relying on any previous protection result.',
  INVALID_NUMERIC_DATA:'Position or market numbers are invalid; coverage cannot be verified.',
  INCONSISTENT_BLOCKS:'Market and position reads come from different blocks; protection cannot be verified.',
  INVALID_DECIMALS:'Token decimal precision is invalid; quantities cannot be verified.',
  FIXTURE_IN_LIVE_MODE:'Fixture data cannot verify protection in live mode.',
  DUPLICATE_STOP_IDS:'Duplicate stop IDs make the discovered orders ambiguous.',
  INVALID_STOP_DATA:'Stop identity, parameters or observation blocks are invalid or inconsistent.',
  STOP_STATUS_UNKNOWN:'A stop has an unknown lifecycle state; pending protection cannot be verified.',
  NO_POSITION:'No current position was observed.',
  RESIDUAL_STOPS:'Pending stops remain without a position; review them before reopening.',
  NO_MATCHING_SL:'No matching native reduce-only stop-loss protects this position.',
  TAKE_PROFIT_ONLY:'Take-profit only: TP is not stop-loss protection.',
  WRONG_SIDE_SL:'Wrong-side stop: its buy/sell side cannot close this position as a stop-loss.',
  TRIGGER_CONDITION_MET:'The stop trigger condition is already met; reconcile execution and remaining exposure.',
  MULTIPLE_SL_LAYOUT:'Multiple stop-loss orders need review; their quantities are not added together.',
  OCO_LINK_INVALID:'The OCO link is invalid: the paired stop is missing, inconsistent or already at its trigger.',
  PARTIAL_COVERAGE:'The fixed stop quantity covers only part of the current position.',
  WHOLE_POSITION_AT_TRIGGER:'The stop is configured to reduce the whole position at trigger time.',
  FIXED_COVERAGE:'The fixed stop quantity covers the current observed position.',
  OCO_LINK_MATCHED:'The paired OCO stop link matches this observation.',
  SL_ONLY:'A standalone stop-loss is configured without a paired take-profit.',
  EXECUTION_NOT_GUARANTEED:'A matching configuration does not guarantee triggering or fills.',
  OPERATION_UNRESOLVED:'A local operation is unresolved; reconcile its original transaction before relying on protection or sending again.'
};
export function friendlyReason(value:string){return Object.hasOwn(reasonLabels,value)?reasonLabels[value]:friendly(value)}
