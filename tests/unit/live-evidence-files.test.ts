import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLiveReferences } from '../../scripts/live-evidence-files.js';
import { createSyntheticLiveEvidence } from '../fixtures/live-evidence.js';

const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });

function checkDownload(mode: unknown, wrapped = true, innerReplay = false) {
  const directory = mkdtempSync(join(tmpdir(), 'dreamshield-evidence-files-')); directories.push(directory);
  const fixture = createSyntheticLiveEvidence();
  const reference = (name: string, value: unknown) => {
    const bytes = JSON.stringify(value); writeFileSync(join(directory, name), bytes);
    return { path: name, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  const lifecycle = innerReplay ? { ...fixture.lifecycle, mode: 'replay' } : fixture.lifecycle;
  const body = { schemaVersion: 1, project: 'DreamShield', mode, lifecycle };
  const download = wrapped ? { ...body, sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex') } : lifecycle;
  return checkLiveReferences({ liveEvidence: { doctor: reference('doctor.json', fixture.doctor), lifecycle: reference('download.json', download) } }, join(directory, 'submission.json'));
}

describe('downloaded lifecycle classification', () => {
  it('distinguishes missing references from malformed metadata without granting eligibility', () => {
    const missing = checkLiveReferences({ liveEvidence: null }, '/unused/submission.json');
    const malformed = checkLiveReferences({ liveEvidence: [] }, '/unused/submission.json');
    expect(missing).toMatchObject({ valid: false, status: 'MISSING', eligibility: { realPerpsOrder: false, nativeProtectionReadback: false }, fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true });
    expect(malformed).toMatchObject({ valid: false, status: 'INVALID', eligibility: { realPerpsOrder: false, nativeProtectionReadback: false }, fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true });
  });
  it('classifies an absent referenced file as missing rather than invalid captured evidence', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dreamshield-evidence-files-')); directories.push(directory);
    const result = checkLiveReferences({ liveEvidence: { doctor: { path: 'absent.json', sha256: '0'.repeat(64) } } }, join(directory, 'submission.json'));
    expect(result).toMatchObject({ valid: false, status: 'MISSING', eligibility: { realPerpsOrder: false, nativeProtectionReadback: false }, fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true });
  });
  it.each(['replay', 'live-readonly', 'unsupported', null, undefined])('rejects %s wrappers even with complete nested owner proof and valid checksums', mode => {
    const result = checkDownload(mode);
    expect(result.valid).toBe(false);
    expect(result.eligibility).toEqual({ realPerpsOrder: false, nativeProtectionReadback: false });
    expect(result).toMatchObject({ status: mode === 'replay' || mode === 'live-readonly' ? 'HISTORICAL_OR_REPLAY' : 'INVALID', fileOnly: true, originAuthenticated: false, currentChainRevalidated: false, historical: true });
  });
  it('accepts complete owner evidence without claiming current chain validation', () => {
    expect(checkDownload('live-owner')).toMatchObject({ valid: true, status: 'CAPTURED_COMPLETE', currentChainRevalidation: 'NOT_RUN', originAuthentication: 'NOT_ESTABLISHED' });
  });
  it('still validates a standalone durable lifecycle', () => {
    expect(checkDownload(undefined, false)).toMatchObject({ valid: true, status: 'CAPTURED_COMPLETE' });
  });
  it('does not let an owner wrapper promote nested replay evidence', () => {
    const result = checkDownload('live-owner', true, true);
    expect(result.valid).toBe(false);
    expect(result.eligibility).toEqual({ realPerpsOrder: false, nativeProtectionReadback: false });
  });
});
