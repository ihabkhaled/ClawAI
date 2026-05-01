import { Module } from '@nestjs/common';

import { LlamacppEventsPublisher } from './llamacpp-events.publisher';

@Module({
  providers: [LlamacppEventsPublisher],
  exports: [LlamacppEventsPublisher],
})
export class LlamacppEventsModule {}
