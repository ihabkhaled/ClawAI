import { Controller, Headers, MessageEvent, Param, Req, Sse } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

import { GenerationProgressStreamService } from '../services/generation-progress-stream.service';
import { parseLastEventId } from '../utilities/generation-progress-snapshot.utility';

/**
 * Server-Sent Events twin of `GET generation-progress` (ADR-201). Same owner-only rule: a
 * stranger and an unknown id both get `404 Publication not found` before any byte is streamed.
 */
@Controller('thread-publications/:publicationId')
export class PublicationGenerationStreamController {
  constructor(private readonly stream: GenerationProgressStreamService) {}

  @Sse('generation-progress/stream')
  openStream(
    @Param('publicationId') publicationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('last-event-id') lastEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    return this.stream.open(
      publicationId,
      user.id,
      parseLastEventId(lastEventId),
      () => request.res?.writableNeedDrain === true,
    );
  }
}
