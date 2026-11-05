import { describe, expect, it } from 'vitest';
import { describeMode, evidenceFilename, parseDeskMode } from '../../apps/web/src/presentation';

describe('evidence mode presentation', () => {
  it('does not label an unknown instance as live or replay', () => {
    expect(parseDeskMode('live')).toBeNull();
    expect(parseDeskMode(undefined)).toBeNull();
    expect(describeMode(null).label).toBe('Mode unconfirmed');
  });
  it('distinguishes fixtures, read-only reads and owner execution boundaries', () => {
    expect(describeMode(parseDeskMode('replay')).label).toContain('REPLAY');
    expect(describeMode(parseDeskMode('live-readonly')).description).toContain('cannot send');
    expect(describeMode(parseDeskMode('live-owner')).description).toContain('separate confirmation');
    expect(describeMode('live-readonly').description).toContain('does not mean protection is verified');
  });
  it('does not put a replay scenario name on a live export', () => {
    expect(evidenceFilename('live-owner', 'protected')).toBe('dreamshield-live-owner-evidence.json');
    expect(evidenceFilename('live-readonly', 'protected')).toBe('dreamshield-live-readonly-evidence.json');
    expect(evidenceFilename('replay', 'protected')).toBe('dreamshield-replay-protected-evidence.json');
    expect(evidenceFilename(null, 'protected')).toBe('dreamshield-unconfirmed-evidence.json');
    expect(evidenceFilename('replay', '../../foo')).toBe('dreamshield-replay-scenario-evidence.json');
  });
});
