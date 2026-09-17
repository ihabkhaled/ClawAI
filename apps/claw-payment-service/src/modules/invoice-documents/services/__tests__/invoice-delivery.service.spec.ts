import { vi } from 'vitest';
import { createSmtpEmailTransport } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { InvoiceDeliveryStatus } from '../../../../generated/prisma';
import { InvoiceDeliveryService } from '../invoice-delivery.service';

vi.mock('@claw/shared-utilities', async () => ({
  ...await vi.importActual('@claw/shared-utilities'),
  createSmtpEmailTransport: vi.fn(),
}));

describe('InvoiceDeliveryService', () => {
  const job = {
    id: 'delivery-1',
    invoiceId: 'invoice-1',
    recipientEmail: 'buyer@example.com',
    status: InvoiceDeliveryStatus.PENDING,
    attempts: 0,
    availableAt: new Date('2026-07-27T04:00:00.000Z'),
    deliveredAt: null,
    lastErrorCode: null,
    createdAt: new Date('2026-07-27T04:00:00.000Z'),
    updatedAt: new Date('2026-07-27T04:00:00.000Z'),
    invoice: {
      number: 'CLAW-00000001',
    },
  };
  const repository = {
    listDue: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn(),
  };
  const documents = {
    renderByInvoiceId: vi.fn(),
  };
  const jobs = {
    run: vi.fn(async (_options: unknown, callback: () => Promise<number>) => callback()),
  };
  const send = vi.fn();
  let service: InvoiceDeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      CONTACT_EMAIL_ENABLED: 'true',
      CONTACT_EMAIL_PROVIDER: 'smtp',
      CONTACT_EMAIL_FROM: 'billing@claw.ai',
      CONTACT_SMTP_HOST: 'smtp.example.com',
      CONTACT_SMTP_PORT: 587,
      CONTACT_SMTP_SECURE: 'false',
      CONTACT_SMTP_USER: 'mailer',
      CONTACT_SMTP_PASS: 'secret',
      PAYMENT_OUTBOX_MAX_ATTEMPTS: 10,
    } as never);
    vi.mocked(createSmtpEmailTransport).mockReturnValue({ send });
    repository.listDue.mockResolvedValue([job]);
    documents.renderByInvoiceId.mockResolvedValue({
      bytes: new Uint8Array([37, 80, 68, 70]),
      filename: 'CLAW-00000001.pdf',
    });
    service = new InvoiceDeliveryService(repository as never, documents as never, jobs as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers a due invoice through the shared SMTP adapter', async () => {
    await expect(service.drain(Date.parse('2026-07-27T04:00:00.000Z'))).resolves.toBe(1);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        messageId: 'invoice-invoice-1@claw.ai',
        attachments: [
          expect.objectContaining({
            filename: 'CLAW-00000001.pdf',
            contentType: 'application/pdf',
          }),
        ],
      }),
    );
    expect(repository.markDelivered).toHaveBeenCalledWith('delivery-1', expect.any(Date));
  });

  it('records a stable retry state without logging provider payloads', async () => {
    send.mockRejectedValueOnce(new Error('SMTP body with buyer@example.com'));

    await expect(service.drain(Date.parse('2026-07-27T04:00:00.000Z'))).resolves.toBe(0);

    expect(repository.markFailed).toHaveBeenCalledWith(
      'delivery-1',
      1,
      10,
      expect.any(Date),
      'INVOICE_EMAIL_DELIVERY_FAILED',
    );
  });

  it('leaves durable jobs pending when email delivery is disabled', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      CONTACT_EMAIL_ENABLED: 'false',
      CONTACT_EMAIL_PROVIDER: 'none',
    } as never);

    await expect(service.drain()).resolves.toBe(0);
    expect(repository.listDue).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
