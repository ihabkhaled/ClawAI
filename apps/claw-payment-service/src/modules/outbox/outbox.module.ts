import { Module } from '@nestjs/common';

import { OutboxRepository } from './repositories/outbox.repository';
import { OutboxPublisherService } from './services/outbox-publisher.service';

// The publisher is the only thing that moves an outbox row onto the broker.
// Exporting the repository (and not the publisher) keeps writers using the
// transactional enqueue path rather than publishing directly, which is what
// makes the state change and the event inseparable.
@Module({
  providers: [OutboxRepository, OutboxPublisherService],
  exports: [OutboxRepository],
})
export class OutboxModule {}
