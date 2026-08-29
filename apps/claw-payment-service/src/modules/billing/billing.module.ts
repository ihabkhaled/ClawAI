import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox/outbox.module';
import { CheckoutSessionRepository } from './repositories/checkout-session.repository';
import { InvoiceWriteRepository } from './repositories/invoice-write.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';
import { ProrationQuoteRepository } from './repositories/proration-quote.repository';
import { BillingRecordService } from './services/billing-record.service';
import { CreditTopupLifecycleService } from './services/credit-topup-lifecycle.service';
import { ProrationService } from './services/proration.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';

@Module({
  imports: [OutboxModule],
  providers: [
    ProrationService,
    SubscriptionLifecycleService,
    CreditTopupLifecycleService,
    BillingRecordService,
    CheckoutSessionRepository,
    ProrationQuoteRepository,
    PaymentTransactionRepository,
    InvoiceWriteRepository,
  ],
  exports: [
    ProrationService,
    SubscriptionLifecycleService,
    CreditTopupLifecycleService,
    BillingRecordService,
    CheckoutSessionRepository,
    PaymentTransactionRepository,
  ],
})
export class BillingModule {}
