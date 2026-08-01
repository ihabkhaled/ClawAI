import type { NestExpressApplication } from '@nestjs/platform-express';

import { CHAT_REQUEST_BODY_LIMIT_BYTES } from '../constants/http.constants';

export function configureChatBodyParser(app: NestExpressApplication): void {
  app.useBodyParser('json', {
    limit: CHAT_REQUEST_BODY_LIMIT_BYTES,
  });
}
