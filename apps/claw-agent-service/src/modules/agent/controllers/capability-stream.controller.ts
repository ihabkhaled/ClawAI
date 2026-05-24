import { Controller, Logger, type MessageEvent, Sse } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '@claw/shared-auth';
import { filter, map, Observable } from 'rxjs';

import { SkipLogging } from '../../../common/decorators/skip-logging.decorator';
import { CapabilityEventBusService } from '../services/capability-event-bus.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * V2 Stream 08 — Server-Sent Events for the capability queue.
 *
 * Frontend connects via `fetch()` with the Authorization header (NOT
 * the EventSource API — see CLAUDE.md SSE Streaming notes for why)
 * and receives one JSON event per state transition the user owns.
 *
 * Replay/backfill is NOT included; the frontend separately polls the
 * `/agent/capabilities?status=PENDING_APPROVAL` endpoint to seed the
 * initial queue, then this stream takes over for live updates.
 */
@Controller('agent/capabilities')
export class CapabilityStreamController {
  private readonly logger = new Logger(CapabilityStreamController.name);

  constructor(private readonly bus: CapabilityEventBusService) {}

  @Sse('stream')
  @SkipLogging()
  @SkipThrottle()
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    this.logger.debug(`SSE opened for userId=${user.id}`);
    return this.bus.eventBus.pipe(
      filter((event) => event.userId === user.id),
      map((event): MessageEvent => ({ data: JSON.stringify(event) })),
    );
  }
}
