import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createSmtpEmailTransport, type EmailTransport } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { ScheduledJobRunnerService } from '../../scheduled-jobs/services/scheduled-job-runner.service';
import {
  INVOICE_DELIVERY_BATCH_SIZE,
  INVOICE_DELIVERY_ERROR_CODE,
  INVOICE_DELIVERY_JOB_NAME,
  INVOICE_DELIVERY_LOCK_KEY,
  INVOICE_DELIVERY_LOCK_TTL_SECONDS,
  INVOICE_DELIVERY_POLL_INTERVAL_MS,
  INVOICE_DELIVERY_RETRY_BASE_DELAY_MS,
  INVOICE_DELIVERY_RETRY_MAX_DELAY_MS,
} from '../constants/invoice-delivery.constants';
import { InvoiceDocumentRepository } from '../repositories/invoice-document.repository';
import { type InvoiceDeliveryCandidate } from '../types/invoice-document.types';
import { InvoiceDocumentService } from './invoice-document.service';

@Injectable()
export class InvoiceDeliveryService {
  private readonly logger = new Logger(InvoiceDeliveryService.name);

  constructor(
    private readonly repository: InvoiceDocumentRepository,
    private readonly documents: InvoiceDocumentService,
    private readonly jobs: ScheduledJobRunnerService,
  ) {}

  @Interval(INVOICE_DELIVERY_POLL_INTERVAL_MS)
  async scheduledDrain(): Promise<void> {
    await this.drain();
  }

  async drain(nowMs: number = Date.now()): Promise<number> {
    const transport = this.createTransport();
    if (transport === null) {
      return 0;
    }
    try {
      const delivered = await this.jobs.run(
        {
          jobName: INVOICE_DELIVERY_JOB_NAME,
          lockKey: INVOICE_DELIVERY_LOCK_KEY,
          lockTtlSeconds: INVOICE_DELIVERY_LOCK_TTL_SECONDS,
        },
        async () => this.drainBatch(transport, nowMs),
      );
      return delivered ?? 0;
    } catch {
      this.logger.error('drain: invoice delivery failed');
      return 0;
    }
  }

  private async drainBatch(transport: EmailTransport, nowMs: number): Promise<number> {
    const batch = await this.repository.listDue(INVOICE_DELIVERY_BATCH_SIZE, new Date(nowMs));
    let delivered = 0;
    for (const job of batch) {
      delivered += (await this.deliverOne(transport, job, nowMs)) ? 1 : 0;
    }
    return delivered;
  }

  private async deliverOne(
    transport: EmailTransport,
    job: InvoiceDeliveryCandidate,
    nowMs: number,
  ): Promise<boolean> {
    try {
      const document = await this.documents.renderByInvoiceId(job.invoiceId);
      await transport.send({
        from: AppConfig.get().CONTACT_EMAIL_FROM,
        to: job.recipientEmail,
        subject: `Your ClawAI invoice ${job.invoice.number}`,
        text: `Your ClawAI invoice ${job.invoice.number} is attached.`,
        html: `<p>Your ClawAI invoice ${job.invoice.number} is attached.</p>`,
        messageId: `invoice-${job.invoiceId}@claw.ai`,
        attachments: [
          {
            filename: document.filename,
            content: document.bytes,
            contentType: 'application/pdf',
          },
        ],
      });
      await this.repository.markDelivered(job.id, new Date(nowMs));
      return true;
    } catch {
      await this.recordFailure(job, nowMs);
      return false;
    }
  }

  private async recordFailure(job: InvoiceDeliveryCandidate, nowMs: number): Promise<void> {
    const attempts = job.attempts + 1;
    const maxAttempts = AppConfig.get().PAYMENT_OUTBOX_MAX_ATTEMPTS;
    const delayMs = Math.min(
      INVOICE_DELIVERY_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1),
      INVOICE_DELIVERY_RETRY_MAX_DELAY_MS,
    );
    await this.repository.markFailed(
      job.id,
      attempts,
      maxAttempts,
      new Date(nowMs + delayMs),
      INVOICE_DELIVERY_ERROR_CODE,
    );
    this.logger.warn(
      `deliverOne: invoice delivery failed attempt=${String(attempts)}/${String(maxAttempts)}`,
    );
  }

  private createTransport(): EmailTransport | null {
    const config = AppConfig.get();
    if (config.CONTACT_EMAIL_ENABLED !== 'true' || config.CONTACT_EMAIL_PROVIDER !== 'smtp') {
      return null;
    }
    if (
      config.CONTACT_SMTP_HOST === undefined ||
      config.CONTACT_SMTP_USER === undefined ||
      config.CONTACT_SMTP_PASS === undefined
    ) {
      return null;
    }
    return createSmtpEmailTransport({
      host: config.CONTACT_SMTP_HOST,
      port: config.CONTACT_SMTP_PORT,
      secure: config.CONTACT_SMTP_SECURE === 'true',
      user: config.CONTACT_SMTP_USER,
      pass: config.CONTACT_SMTP_PASS,
    });
  }
}
