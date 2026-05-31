// Slice D backend 3 — audit-event handler unit tests for the 8 new file
// lifecycle/OCR events introduced by file-service.
//
// For each event we verify:
//   1. handler invokes AuditsService.createAuditLog exactly once with the
//      canonical { action, entityType, entityId, severity, details } shape.
//   2. failure path: when createAuditLog throws, the handler LOGS but does
//      NOT rethrow — rethrowing would DLQ the message for an event whose
//      side-effect (file already on disk / deleted / OCR'd) has already
//      happened on the producer side.
//   3. backward compat: handleFileUploaded (the deprecated FILE_UPLOADED
//      event) writes the same audit row shape as handleFileUploadCompleted.

import { AuditEventManager } from '../audit-event.manager';

type AuditMock = { createAuditLog: jest.Mock };
type UsageMock = { createUsageEntry: jest.Mock };
type RabbitMock = { subscribe: jest.Mock };

function build(): {
  manager: AuditEventManager;
  audits: AuditMock;
  usage: UsageMock;
  rabbit: RabbitMock;
} {
  const audits: AuditMock = { createAuditLog: jest.fn().mockResolvedValue({}) };
  const usage: UsageMock = { createUsageEntry: jest.fn().mockResolvedValue({}) };
  const rabbit: RabbitMock = { subscribe: jest.fn().mockImplementation(async () => {}) };

  const manager = new AuditEventManager(rabbit as any, audits as any, usage as any);
  return { manager, audits, usage, rabbit };
}

describe('AuditEventManager Slice D handlers — happy path', () => {
  it('handleFileUploadStarted writes file.upload_started LOW audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileUploadStarted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: '',
      userId: 'user-1',
      filename: 'doc.txt',
      mimeType: 'text/plain',
      sizeBytes: 1024,
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.upload_started',
      entityType: 'file',
      entityId: '',
      severity: 'LOW',
      details: {
        filename: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      },
    });
  });

  it('handleFileUploadCompleted writes file.upload_completed LOW audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileUploadCompleted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      threadId: '',
      userId: 'user-1',
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      sizeBytes: 1024,
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.upload_completed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        filename: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      },
    });
  });

  it('handleFileExtractionFailed writes file.extraction_failed ERROR audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileExtractionFailed({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      filename: 'broken.pdf',
      errorMessage: 'pdfParse threw',
      failureStage: 'TEXT_EXTRACTION',
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.extraction_failed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'ERROR',
      details: {
        filename: 'broken.pdf',
        errorMessage: 'pdfParse threw',
        failureStage: 'TEXT_EXTRACTION',
      },
    });
  });

  it('handleFileDownloaded writes file.downloaded LOW audit row with method', async () => {
    const { manager, audits } = build();
    await manager.handleFileDownloaded({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      downloadedBy: 'user-1',
      downloadMethod: 'BROWSER',
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.downloaded',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        downloadedBy: 'user-1',
        downloadMethod: 'BROWSER',
      },
    });
  });

  it("handleFileDeleted writes file.deleted LOW audit row when reason='USER'", async () => {
    const { manager, audits } = build();
    await manager.handleFileDeleted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      filename: 'gone.txt',
      deletedBy: 'user-1',
      reason: 'USER',
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.deleted',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        filename: 'gone.txt',
        deletedBy: 'user-1',
        reason: 'USER',
      },
    });
  });

  it("handleFileDeleted writes file.deleted LOW audit row when reason='RETENTION'", async () => {
    const { manager, audits } = build();
    await manager.handleFileDeleted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-9',
      userId: 'user-7',
      filename: 'old.txt',
      deletedBy: 'system',
      reason: 'RETENTION',
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    const row = audits.createAuditLog.mock.calls[0]?.[0] as { severity: string; details: object };
    expect(row.severity).toBe('LOW');
    expect(row.details).toEqual({
      filename: 'old.txt',
      deletedBy: 'system',
      reason: 'RETENTION',
    });
  });

  it("handleFileDeleted bumps severity to MEDIUM when reason='ADMIN'", async () => {
    const { manager, audits } = build();
    await manager.handleFileDeleted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-2',
      userId: 'user-3',
      filename: 'admin-removed.txt',
      deletedBy: 'admin-user',
      reason: 'ADMIN',
    } as any);
    const row = audits.createAuditLog.mock.calls[0]?.[0] as { severity: string };
    expect(row.severity).toBe('MEDIUM');
  });

  it('handleFileOcrStarted writes file.ocr_started LOW audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileOcrStarted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      mimeType: 'image/png',
      isImageFile: true,
      isScannedPdf: false,
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.ocr_started',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        mimeType: 'image/png',
        isImageFile: true,
        isScannedPdf: false,
      },
    });
  });

  it('handleFileOcrCompleted writes file.ocr_completed LOW audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileOcrCompleted({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      extractedTextLength: 4096,
      confidence: 0.92,
      durationMs: 1500,
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.ocr_completed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'LOW',
      details: {
        extractedTextLength: 4096,
        confidence: 0.92,
        durationMs: 1500,
      },
    });
  });

  it('handleFileOcrFailed writes file.ocr_failed ERROR audit row', async () => {
    const { manager, audits } = build();
    await manager.handleFileOcrFailed({
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-1',
      userId: 'user-1',
      errorMessage: 'tesseract worker timed out',
      failureStage: 'TIMEOUT',
    } as any);
    expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'file.ocr_failed',
      entityType: 'file',
      entityId: 'file-1',
      severity: 'ERROR',
      details: {
        errorMessage: 'tesseract worker timed out',
        failureStage: 'TIMEOUT',
      },
    });
  });
});

// ============================================================================
// Failure path — every Slice D handler must SWALLOW (log-only) errors from
// AuditsService so the RabbitMQ consumer does not re-fail and DLQ a message
// whose producer-side effect has already happened.
// ============================================================================

describe('AuditEventManager Slice D handlers — error swallowing', () => {
  const slice = [
    {
      name: 'handleFileUploadStarted',
      payload: {
        timestamp: 't',
        fileId: '',
        userId: 'u',
        filename: 'f',
        mimeType: 'text/plain',
        sizeBytes: 1,
      },
    },
    {
      name: 'handleFileUploadCompleted',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        threadId: '',
        userId: 'u',
        fileName: 'f',
        mimeType: 'text/plain',
        sizeBytes: 1,
      },
    },
    {
      name: 'handleFileExtractionFailed',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        filename: 'f',
        errorMessage: 'e',
        failureStage: 'TEXT_EXTRACTION',
      },
    },
    {
      name: 'handleFileDownloaded',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        downloadedBy: 'u',
        downloadMethod: 'BROWSER',
      },
    },
    {
      name: 'handleFileDeleted',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        filename: 'f',
        deletedBy: 'u',
        reason: 'USER',
      },
    },
    {
      name: 'handleFileOcrStarted',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        mimeType: 'image/png',
        isImageFile: true,
        isScannedPdf: false,
      },
    },
    {
      name: 'handleFileOcrCompleted',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        extractedTextLength: 10,
        confidence: 0.5,
        durationMs: 1,
      },
    },
    {
      name: 'handleFileOcrFailed',
      payload: {
        timestamp: 't',
        fileId: 'f1',
        userId: 'u',
        errorMessage: 'e',
        failureStage: 'TIMEOUT',
      },
    },
  ] as const;

  for (const { name, payload } of slice) {
    it(`${name} does NOT rethrow when createAuditLog throws (event-bus stability)`, async () => {
      const { manager, audits } = build();
      audits.createAuditLog.mockRejectedValueOnce(new Error('mongo down'));
      const errorSpy = jest.spyOn((manager as any).logger, 'error').mockImplementation();

      const fn = (manager as any)[name].bind(manager) as (p: unknown) => Promise<void>;
      await expect(fn(payload)).resolves.toBeUndefined();

      expect(audits.createAuditLog).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`${name}: failed`));
      errorSpy.mockRestore();
    });
  }
});

// ============================================================================
// Backward compat — the deprecated FILE_UPLOADED event still routes to
// handleFileUploaded, which must produce the same logical audit row as the
// new FILE_UPLOAD_COMPLETED handler. We assert that:
//   - action differs ('file.uploaded' vs 'file.upload_completed') so we can
//     tell them apart in the audit log
//   - entityType / entityId / severity / details are identical
//   - userId is taken from the payload in both cases
// ============================================================================

describe('AuditEventManager Slice D — backward compat (FILE_UPLOADED deprecated alias)', () => {
  it('handleFileUploaded writes the same logical audit row as handleFileUploadCompleted', async () => {
    const { manager: m1, audits: a1 } = build();
    const { manager: m2, audits: a2 } = build();

    const sharedPayload = {
      timestamp: '2026-05-31T00:00:00.000Z',
      fileId: 'file-compat',
      threadId: '',
      userId: 'user-1',
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      sizeBytes: 1024,
    };

    await m1.handleFileUploaded(sharedPayload as any);

    await m2.handleFileUploadCompleted(sharedPayload as any);

    const legacyRow = a1.createAuditLog.mock.calls[0]?.[0] as {
      action: string;
      entityType: string;
      entityId: string;
      severity: string;
      details: { filename: string; sizeBytes: number; mimeType: string };
      userId: string;
    };
    const canonicalRow = a2.createAuditLog.mock.calls[0]?.[0] as {
      action: string;
      entityType: string;
      entityId: string;
      severity: string;
      details: { filename: string; sizeBytes: number; mimeType: string };
      userId: string;
    };

    // Different action string — that's intentional so downstream consumers can
    // tell legacy from canonical events apart during the deprecation window.
    expect(legacyRow.action).toBe('file.uploaded');
    expect(canonicalRow.action).toBe('file.upload_completed');

    // Everything else (the audit semantics) is identical.
    expect(legacyRow.userId).toBe(canonicalRow.userId);
    expect(legacyRow.entityType).toBe(canonicalRow.entityType);
    expect(legacyRow.entityId).toBe(canonicalRow.entityId);
    expect(legacyRow.severity).toBe(canonicalRow.severity);
    expect(legacyRow.details.filename).toBe(canonicalRow.details.filename);
    expect(legacyRow.details.sizeBytes).toBe(canonicalRow.details.sizeBytes);
    expect(legacyRow.details.mimeType).toBe(canonicalRow.details.mimeType);
  });
});
