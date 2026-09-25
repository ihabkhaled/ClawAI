import { vi } from 'vitest';
import { FileSecurityManager } from '../file-security.manager';
import { type ClamavClient } from '../../../../infrastructure/clamav/clamav.client';
import { ClamScanOutcome } from '../../../../common/enums/clam-scan-outcome.enum';
import { ANTIVIRUS_UNAVAILABLE_REASON } from '../../../../common/constants/clamav.constants';
import { type ClamScanResult } from '../../types/file-security.types';

const PLAIN_TEXT = Buffer.from('hello world, just some text');

const clamavReturning = (result: ClamScanResult): Pick<ClamavClient, 'scan' | 'ping'> => ({
  scan: vi.fn().mockResolvedValue(result),
  ping: vi.fn(),
});

const unavailable: ClamScanResult = {
  clean: false,
  outcome: ClamScanOutcome.UNAVAILABLE,
  reason: ANTIVIRUS_UNAVAILABLE_REASON,
};

describe('FileSecurityManager antivirus outcome', () => {
  it('passes a clean text file', async () => {
    const manager = new FileSecurityManager(
      clamavReturning({
        clean: true,
        outcome: ClamScanOutcome.CLEAN,
        reason: 'clean',
      }) as ClamavClient,
    );
    const result = await manager.runAllChecks('notes.txt', 'text/plain', PLAIN_TEXT);
    expect(result).toMatchObject({ passed: true, antivirusUnavailable: false });
  });

  it('flags antivirusUnavailable when the scanner is the only failure', async () => {
    const manager = new FileSecurityManager(clamavReturning(unavailable) as ClamavClient);
    const result = await manager.runAllChecks('notes.txt', 'text/plain', PLAIN_TEXT);
    expect(result.passed).toBe(false);
    expect(result.antivirusUnavailable).toBe(true);
    expect(result.checks.find((c) => c.name === 'antivirus_scan')?.reason).toBe(
      ANTIVIRUS_UNAVAILABLE_REASON,
    );
  });

  it('does NOT flag antivirusUnavailable when another check also failed', async () => {
    const manager = new FileSecurityManager(clamavReturning(unavailable) as ClamavClient);
    const result = await manager.runAllChecks('evil.exe', 'text/plain', PLAIN_TEXT);
    expect(result.passed).toBe(false);
    expect(result.antivirusUnavailable).toBe(false);
  });

  it('an infected file is a rejection, not an outage', async () => {
    const manager = new FileSecurityManager(
      clamavReturning({
        clean: false,
        outcome: ClamScanOutcome.INFECTED,
        reason: 'Eicar',
      }) as ClamavClient,
    );
    const result = await manager.runAllChecks('notes.txt', 'text/plain', PLAIN_TEXT);
    expect(result).toMatchObject({ passed: false, antivirusUnavailable: false });
  });
});
