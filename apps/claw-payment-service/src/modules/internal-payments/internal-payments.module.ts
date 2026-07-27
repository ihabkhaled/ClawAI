import { Module } from '@nestjs/common';

import { InternalPaymentsController } from './controllers/internal-payments.controller';
import { InternalPaymentsRepository } from './repositories/internal-payments.repository';
import { InternalPaymentsService } from './services/internal-payments.service';

@Module({
  controllers: [InternalPaymentsController],
  providers: [InternalPaymentsService, InternalPaymentsRepository],
})
export class InternalPaymentsModule {}
