import { Module } from '@nestjs/common';

import { ScheduledJobsModule } from '../scheduled-jobs/scheduled-jobs.module';
import { InvoiceDocumentRepository } from './repositories/invoice-document.repository';
import { InvoiceDeliveryService } from './services/invoice-delivery.service';
import { InvoiceDocumentService } from './services/invoice-document.service';

@Module({
  imports: [ScheduledJobsModule],
  providers: [InvoiceDocumentRepository, InvoiceDocumentService, InvoiceDeliveryService],
  exports: [InvoiceDocumentService],
})
export class InvoiceDocumentsModule {}
