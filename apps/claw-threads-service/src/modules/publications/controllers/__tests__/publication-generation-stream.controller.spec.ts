import type { AuthenticatedUser } from '@claw/shared-types';
import { PATH_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import type { Request } from 'express';

import { PublicationGenerationStreamController } from '../publication-generation-stream.controller';

describe('PublicationGenerationStreamController', () => {
  const user = { id: 'owner-1' } as AuthenticatedUser;

  it('is a GET Server-Sent Events route beside generation-progress', () => {
    const handler = PublicationGenerationStreamController.prototype.openStream;
    expect(Reflect.getMetadata(SSE_METADATA, handler)).toBe(true);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('generation-progress/stream');
  });

  it('opens the stream for the authenticated owner with a validated Last-Event-ID', async () => {
    const stream = { open: vi.fn().mockResolvedValue('observable') };
    const controller = new PublicationGenerationStreamController(stream as never);
    const request = { res: { writableNeedDrain: true } } as unknown as Request;
    await controller.openStream('pub-1', user, request, 'abcdef0123456789');
    const [publicationId, ownerId, lastEventId, isBackedUp] = stream.open.mock.calls[0] as [
      string,
      string,
      string | undefined,
      () => boolean,
    ];
    expect([publicationId, ownerId, lastEventId]).toEqual(['pub-1', 'owner-1', 'abcdef0123456789']);
    expect(isBackedUp()).toBe(true);
  });

  it('ignores a malformed Last-Event-ID', async () => {
    const stream = { open: vi.fn().mockResolvedValue('observable') };
    const controller = new PublicationGenerationStreamController(stream as never);
    await controller.openStream('pub-1', user, {} as Request, '<script>');
    expect(stream.open.mock.calls[0]?.[2]).toBeUndefined();
  });
});
