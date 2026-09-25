// Pack section 72 — ownership of the cancel route. A stranger's id and a
// missing id are the SAME 404 (rules/16: an id cannot be probed).

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { EntityNotFoundException } from '../../../../common/errors';
import { VideoCancellationService } from '../video-cancellation.service';

const OWNED = { id: 'video-1', userId: 'owner-1', mimeType: 'video/mp4' } as File;

describe('VideoCancellationService', () => {
  let files: { findById: Mock };
  let manager: { cancel: Mock };
  let service: VideoCancellationService;

  beforeEach(() => {
    files = { findById: vi.fn() };
    manager = {
      cancel: vi.fn().mockResolvedValue({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.FAILED,
        cancelled: true,
      }),
    };
    service = new VideoCancellationService(files as never, manager as never);
  });

  it('the owner reaches the manager with the row', async () => {
    files.findById.mockResolvedValue(OWNED);
    const answer = await service.cancelProcessing('video-1', 'owner-1');
    expect(manager.cancel).toHaveBeenCalledWith(OWNED);
    expect(answer.cancelled).toBe(true);
  });

  it("a stranger gets a 404 and never touches the owner's job", async () => {
    files.findById.mockResolvedValue(OWNED);
    const attempt = service.cancelProcessing('video-1', 'stranger-9');
    await expect(attempt).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(
      attempt.catch((error: EntityNotFoundException) => error.getStatus()),
    ).resolves.toBe(HttpStatus.NOT_FOUND);
    expect(manager.cancel).not.toHaveBeenCalled();
  });

  it('a missing id gets the same 404', async () => {
    files.findById.mockResolvedValue(null);
    const attempt = service.cancelProcessing('nope', 'owner-1');
    await expect(attempt).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(
      attempt.catch((error: EntityNotFoundException) => error.getStatus()),
    ).resolves.toBe(HttpStatus.NOT_FOUND);
    expect(manager.cancel).not.toHaveBeenCalled();
  });
});
