import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

// Companion to RawWebhookBodyPipe. The decorator extracts the raw express
// req.body; the pipe validates and coerces it to Buffer. Usage:
//   @RawWebhookBody(RawWebhookBodyPipe) rawBody: Buffer
export const RawWebhookBody = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.body;
  },
);
