import { type MockInstance, vi } from 'vitest';
import type * as ScannerUtility from '../../../common/utilities/clamav-scanner.utility';
import { Logger } from '@nestjs/common';
import { ClamavClient } from '../clamav.client';
import { ClamScanOutcome } from '../../../common/enums/clam-scan-outcome.enum';
import {
  ANTIVIRUS_UNAVAILABLE_REASON,
  CLAMAV_FAIL_FAST_WINDOW_MS,
  CLAMAV_SCAN_DEADLINE_MS,
} from '../../../common/constants/clamav.constants';
import { sendInstream, sendPing } from '../../../common/utilities/clamav-scanner.utility';
import { AppConfig } from '../../../app/config/app.config';

vi.mock('../../../common/utilities/clamav-scanner.utility', async (importOriginal) => {
  const actual = await importOriginal<typeof ScannerUtility>();
  return { ...actual, sendInstream: vi.fn(), sendPing: vi.fn() };
});

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({ CLAMAV_ENABLED: true, CLAMAV_HOST: 'clamav', CLAMAV_PORT: 3310 })),
  },
}));

const enabledConfig = (): ReturnType<typeof AppConfig.get> =>
  ({ CLAMAV_ENABLED: true, CLAMAV_HOST: 'clamav', CLAMAV_PORT: 3310 }) as ReturnType<
    typeof AppConfig.get
  >;

const refused = (): Error =>
  Object.assign(new Error('connect ECONNREFUSED 172.18.0.6:3310'), { code: 'ECONNREFUSED' });

describe('ClamavClient', () => {
  const instream = vi.mocked(sendInstream);
  const ping = vi.mocked(sendPing);
  const config = vi.mocked(AppConfig.get);
  let client: ClamavClient;
  let warn: MockInstance;
  let error: MockInstance;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T12:00:00Z'));
    instream.mockReset();
    ping.mockReset();
    config.mockReturnValue(enabledConfig());
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      // silenced
    });
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      // silenced
    });
    client = new ClamavClient();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('scan', () => {
    it('returns CLEAN for an OK verdict', async () => {
      instream.mockResolvedValue('stream: OK');
      await expect(client.scan(Buffer.from('x'))).resolves.toEqual({
        clean: true,
        outcome: ClamScanOutcome.CLEAN,
        reason: 'clean',
      });
    });

    it('returns INFECTED with the signature for a FOUND verdict', async () => {
      instream.mockResolvedValue('stream: Eicar-Signature FOUND');
      await expect(client.scan(Buffer.from('x'))).resolves.toEqual({
        clean: false,
        outcome: ClamScanOutcome.INFECTED,
        reason: 'Eicar-Signature',
      });
    });

    it('returns UNEXPECTED (not clean) for an unknown reply, without retrying', async () => {
      instream.mockResolvedValue('INSTREAM size limit exceeded. ERROR');
      const result = await client.scan(Buffer.from('x'));
      expect(result.clean).toBe(false);
      expect(result.outcome).toBe(ClamScanOutcome.UNEXPECTED);
      expect(instream).toHaveBeenCalledTimes(1);
    });

    it('skips the scan when ClamAV is disabled', async () => {
      config.mockReturnValue({ ...enabledConfig(), CLAMAV_ENABLED: false });
      const result = await client.scan(Buffer.from('x'));
      expect(result).toMatchObject({ clean: true, outcome: ClamScanOutcome.DISABLED });
      expect(instream).not.toHaveBeenCalled();
    });

    it('retries ECONNREFUSED with backoff and succeeds once clamd is back', async () => {
      instream
        .mockRejectedValueOnce(refused())
        .mockRejectedValueOnce(refused())
        .mockResolvedValueOnce('stream: OK');
      const pending = client.scan(Buffer.from('x'));
      await vi.advanceTimersByTimeAsync(1_000); // first backoff
      await vi.advanceTimersByTimeAsync(2_000); // second backoff doubles
      await expect(pending).resolves.toMatchObject({ clean: true, outcome: ClamScanOutcome.CLEAN });
      expect(instream).toHaveBeenCalledTimes(3);
      expect(warn).toHaveBeenCalledTimes(2);
      expect(String(warn.mock.calls[0]?.[0])).toContain('ECONNREFUSED');
    });

    it.each(['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'CLAMAV_EMPTY_REPLY'])(
      'treats %s as transient',
      async (code) => {
        instream
          .mockRejectedValueOnce(Object.assign(new Error('boom'), { code }))
          .mockResolvedValueOnce('stream: OK');
        const pending = client.scan(Buffer.from('x'));
        await vi.advanceTimersByTimeAsync(1_000);
        await expect(pending).resolves.toMatchObject({ clean: true });
      },
    );

    it('FAILS CLOSED as UNAVAILABLE after the deadline, never clean', async () => {
      instream.mockRejectedValue(refused());
      const pending = client.scan(Buffer.from('x'));
      let settled = false;
      void pending.then(() => {
        settled = true;
      });
      // Resolves exactly at the deadline, not a backoff step later.
      await vi.advanceTimersByTimeAsync(CLAMAV_SCAN_DEADLINE_MS);
      expect(settled).toBe(true);
      const result = await pending;
      expect(result).toEqual({
        clean: false,
        outcome: ClamScanOutcome.UNAVAILABLE,
        reason: ANTIVIRUS_UNAVAILABLE_REASON,
      });
      expect(instream.mock.calls.length).toBeGreaterThan(5);
      expect(error).toHaveBeenCalledTimes(1);
    });

    it('never leaks the internal IP into the reason or the logs', async () => {
      instream.mockRejectedValue(refused());
      const pending = client.scan(Buffer.from('x'));
      await vi.advanceTimersByTimeAsync(CLAMAV_SCAN_DEADLINE_MS + 10_000);
      const result = await pending;
      const logged = [...warn.mock.calls, ...error.mock.calls].flat().join(' ');
      expect(result.reason).not.toContain('172.18');
      expect(logged).not.toContain('172.18');
    });

    it('does not retry a non-transient socket error', async () => {
      instream.mockRejectedValue(Object.assign(new Error('weird'), { code: 'EACCES' }));
      const result = await client.scan(Buffer.from('x'));
      expect(result.outcome).toBe(ClamScanOutcome.UNAVAILABLE);
      expect(instream).toHaveBeenCalledTimes(1);
    });

    it('fails fast (one attempt) inside the window after a deadline was exhausted', async () => {
      instream.mockRejectedValue(refused());
      const first = client.scan(Buffer.from('x'));
      await vi.advanceTimersByTimeAsync(CLAMAV_SCAN_DEADLINE_MS + 10_000);
      await first;
      instream.mockClear();

      const second = await client.scan(Buffer.from('y'));
      expect(second.outcome).toBe(ClamScanOutcome.UNAVAILABLE);
      expect(instream).toHaveBeenCalledTimes(1);

      // After the window, a scan waits the full deadline again.
      vi.setSystemTime(Date.now() + CLAMAV_FAIL_FAST_WINDOW_MS + 1);
      instream.mockClear();
      instream.mockRejectedValueOnce(refused()).mockResolvedValueOnce('stream: OK');
      const third = client.scan(Buffer.from('z'));
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(third).resolves.toMatchObject({ clean: true });
      expect(instream).toHaveBeenCalledTimes(2);
    });

    it('a success clears the fail-fast window', async () => {
      instream.mockRejectedValue(refused());
      const first = client.scan(Buffer.from('x'));
      await vi.advanceTimersByTimeAsync(CLAMAV_SCAN_DEADLINE_MS + 10_000);
      await first;
      instream.mockReset();
      instream.mockResolvedValueOnce('stream: OK');
      await client.scan(Buffer.from('y'));
      instream.mockRejectedValueOnce(refused()).mockResolvedValueOnce('stream: OK');
      const third = client.scan(Buffer.from('z'));
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(third).resolves.toMatchObject({ clean: true });
    });
  });

  describe('ping', () => {
    it('is true on PONG', async () => {
      ping.mockResolvedValue('PONG');
      await expect(client.ping()).resolves.toBe(true);
    });

    it('is false on any other reply', async () => {
      ping.mockResolvedValue('nope');
      await expect(client.ping()).resolves.toBe(false);
    });

    it('is false (never throws) when clamd refuses the connection', async () => {
      ping.mockRejectedValue(refused());
      await expect(client.ping()).resolves.toBe(false);
    });

    it('reports null (not measured) when ClamAV is disabled', async () => {
      config.mockReturnValue({ ...enabledConfig(), CLAMAV_ENABLED: false });
      await expect(client.ping()).resolves.toBeNull();
      expect(ping).not.toHaveBeenCalled();
    });
  });
});
