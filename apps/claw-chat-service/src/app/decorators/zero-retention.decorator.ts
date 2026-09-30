import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

import { ZERO_RETENTION_HEADER } from '../../modules/chat-messages/constants/zero-retention.constants';
import { isZeroRetentionHeaderOn } from '../../modules/chat-messages/utilities/zero-retention.utility';

/**
 * True when the request carries `X-Claw-Zero-Retention: 1` (F055). A
 * request-scoped value the controller hands to its one service call — no
 * global state, so two concurrent requests can disagree.
 */
export const ZeroRetentionRequested = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return isZeroRetentionHeaderOn(request.header(ZERO_RETENTION_HEADER));
  },
);
