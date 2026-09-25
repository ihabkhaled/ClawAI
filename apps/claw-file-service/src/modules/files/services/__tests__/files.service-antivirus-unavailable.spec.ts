import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
// PROD 2026-09-25: clamd was OOM-killed and every upload failed with
// "File rejected by security checks: antivirus_scan: scan_error: connect
// ECONNREFUSED 172.18.0.6:3310". The scanner being down is now a retryable,
// host-free ANTIVIRUS_UNAVAILABLE (503) — on the single-shot AND the chunked
// path — and still fails closed: nothing is stored.

import { FilesService } from '../files.service';
import { BusinessException } from '../../../../common/errors';
import {
  ANTIVIRUS_UNAVAILABLE_ERROR_CODE,
  ANTIVIRUS_UNAVAILABLE_REASON,
} from '../../../../common/constants/clamav.constants';
import { type File } from '../../../../generated/prisma';

vi.mock('../../../../common/utilities', () => ({
  verifyAccessToken: vi.fn(),
  saveFile: vi.fn().mockReturnValue('/data/uploads/x.txt'),
  deleteFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ FILE_RETENTION_DAYS: 0 })) },
}));

const TEXT = Buffer.from('plain text');

describe('FilesService when the antivirus scanner is unavailable', () => {
  let create: Mock;
  let runAllChecks: Mock;
  let cleanup: Mock;
  let service: FilesService;

  const unavailableResult = {
    passed: false,
    antivirusUnavailable: true,
    checks: [{ name: 'antivirus_scan', passed: false, reason: ANTIVIRUS_UNAVAILABLE_REASON }],
  };

  const expectAntivirusUnavailable = async (attempt: Promise<File>): Promise<void> => {
    const error: unknown = await attempt.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BusinessException);
    const business = error as BusinessException;
    expect(business.code).toBe(ANTIVIRUS_UNAVAILABLE_ERROR_CODE);
    expect(business.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    const body = JSON.stringify(business.getResponse());
    expect(body).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    expect(body).not.toContain('3310');
    expect(body).not.toContain('ECONNREFUSED');
  };

  beforeEach(() => {
    create = vi.fn();
    runAllChecks = vi.fn().mockResolvedValue(unavailableResult);
    cleanup = vi.fn();
    service = new FilesService(
      { create } as never,
      {} as never,
      { publish: vi.fn() } as never,
      { runAllChecks, getSanitizedFilename: vi.fn((name: string) => name) } as never,
      {
        reassemble: vi.fn(() => ({
          manifest: { filename: 'big.txt', mimeType: 'text/plain', totalChunks: 2 },
          buffer: TEXT,
        })),
        cleanup,
      } as never,
      { processFile: vi.fn(), requestVideoProcessing: vi.fn(), updateIngestionStatus: vi.fn() },
    );
  });

  it('single-shot upload: 503 ANTIVIRUS_UNAVAILABLE, no IP, nothing stored', async () => {
    await expectAntivirusUnavailable(
      service.uploadFile('user-1', {
        filename: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: TEXT.length,
        content: TEXT.toString('base64'),
      }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('chunked upload completion: same code, nothing stored, session cleaned up', async () => {
    await expectAntivirusUnavailable(service.completeChunkedUpload('user-1', 'upload-1'));
    expect(create).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledWith('upload-1');
  });

  it('a genuine rejection keeps FILE_SECURITY_CHECK_FAILED', async () => {
    runAllChecks.mockResolvedValue({
      passed: false,
      antivirusUnavailable: false,
      checks: [{ name: 'antivirus_scan', passed: false, reason: 'Eicar-Signature' }],
    });
    await expect(
      service.uploadFile('user-1', {
        filename: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: TEXT.length,
        content: TEXT.toString('base64'),
      }),
    ).rejects.toMatchObject({ code: 'FILE_SECURITY_CHECK_FAILED' });
  });
});
