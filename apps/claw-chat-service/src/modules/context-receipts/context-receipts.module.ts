import { Module } from '@nestjs/common';
import { ContextReceiptController } from './controllers/context-receipt.controller';
import { ContextReceiptRepository } from './repositories/context-receipt.repository';
import { ContextReceiptService } from './services/context-receipt.service';

@Module({
  controllers: [ContextReceiptController],
  providers: [ContextReceiptRepository, ContextReceiptService],
  exports: [ContextReceiptService],
})
export class ContextReceiptsModule {}
