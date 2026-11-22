import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { LiveErrorCode } from '../../../common/enums/live-error-code.enum';
import { LiveSseSessionRepository } from '../repositories/live-sse-session.repository';
import { RedisLiveEventBus } from '../services/redis-live-event-bus.service';
import { parseLastEventId } from '../utilities/live-event-filter.utility';
import { LiveSseConnection } from './live-sse-connection.manager';

/**
 * Opens GET /live/sessions/:sessionId/stream. The session must belong to the
 * caller (404 otherwise, before a single byte is written), and only the run the
 * session is attached to is ever subscribed.
 */
@Injectable()
export class LiveSseManager {
  private readonly logger = new Logger(LiveSseManager.name);

  constructor(
    private readonly bus: RedisLiveEventBus,
    private readonly sessions: LiveSseSessionRepository,
  ) {}

  async open(
    sessionId: string,
    userId: string,
    lastEventIdHeader: string | undefined,
    request: Request,
    response: Response,
  ): Promise<LiveSseConnection> {
    const view = await this.sessions.findOwned(sessionId, userId);
    if (!view) {
      throw new NotFoundException({
        message: 'Live session not found',
        errorCode: LiveErrorCode.LIVE_SESSION_NOT_FOUND,
      });
    }
    const connection = new LiveSseConnection(this.bus, this.sessions, response, view, this.logger);
    request.on('close', () => {
      connection.close();
    });
    await connection.start(parseLastEventId(lastEventIdHeader));
    return connection;
  }
}
