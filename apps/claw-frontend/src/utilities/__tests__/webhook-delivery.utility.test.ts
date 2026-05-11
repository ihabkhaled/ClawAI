import { describe, expect, it } from 'vitest';

import { WebhookDeliveryStatus } from '@/enums/webhook-delivery-status.enum';
import type { WebhookDelivery } from '@/types/webhook-delivery.types';
import {
  deriveWebhookDeliveryStatus,
  getWebhookDeliveryStatusInfo,
} from '@/utilities/webhook-delivery.utility';

const baseDelivery: WebhookDelivery = {
  id: 'd1',
  provider: 'GITHUB',
  connectorId: 'qa-github-test',
  externalDeliveryId: null,
  eventType: null,
  signatureValid: false,
  signature: null,
  errorMessage: null,
  ipAddress: '1.2.3.4',
  bodyBytes: 10,
  createdAt: '2026-05-09T08:57:57.838Z',
  processedAt: null,
};

describe('deriveWebhookDeliveryStatus', () => {
  it('returns REJECTED when errorMessage is set', () => {
    const status = deriveWebhookDeliveryStatus({
      ...baseDelivery,
      errorMessage: 'SIGNATURE_INVALID',
    });
    expect(status).toBe(WebhookDeliveryStatus.REJECTED);
  });

  it('returns ACCEPTED when signature valid and no error', () => {
    const status = deriveWebhookDeliveryStatus({
      ...baseDelivery,
      signatureValid: true,
    });
    expect(status).toBe(WebhookDeliveryStatus.ACCEPTED);
  });

  it('returns IDEMPOTENT when signature invalid and no error', () => {
    const status = deriveWebhookDeliveryStatus(baseDelivery);
    expect(status).toBe(WebhookDeliveryStatus.IDEMPOTENT);
  });

  it('treats empty-string errorMessage as no error', () => {
    const status = deriveWebhookDeliveryStatus({
      ...baseDelivery,
      errorMessage: '',
      signatureValid: true,
    });
    expect(status).toBe(WebhookDeliveryStatus.ACCEPTED);
  });
});

describe('getWebhookDeliveryStatusInfo', () => {
  it('returns full info bundle for REJECTED', () => {
    const info = getWebhookDeliveryStatusInfo({
      ...baseDelivery,
      errorMessage: 'SIGNATURE_INVALID',
    });
    expect(info.status).toBe(WebhookDeliveryStatus.REJECTED);
    expect(info.labelKey).toBe('adminWebhooks.status.rejected');
    expect(info.styleClass).toContain('red');
  });

  it('returns full info bundle for ACCEPTED', () => {
    const info = getWebhookDeliveryStatusInfo({ ...baseDelivery, signatureValid: true });
    expect(info.status).toBe(WebhookDeliveryStatus.ACCEPTED);
    expect(info.labelKey).toBe('adminWebhooks.status.accepted');
    expect(info.styleClass).toContain('emerald');
  });

  it('returns full info bundle for IDEMPOTENT', () => {
    const info = getWebhookDeliveryStatusInfo(baseDelivery);
    expect(info.status).toBe(WebhookDeliveryStatus.IDEMPOTENT);
    expect(info.labelKey).toBe('adminWebhooks.status.idempotent');
    expect(info.styleClass).toContain('amber');
  });
});
