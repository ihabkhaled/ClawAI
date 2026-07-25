import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../billing.exception';
import { BusinessException } from '../business.exception';
import { EntityNotFoundException } from '../entity-not-found.exception';

describe('BusinessException', () => {
  it('carries a message key and machine-readable code', () => {
    const exception = new BusinessException('billing.errors.SOMETHING', 'SOMETHING');
    expect(exception.messageKey).toBe('billing.errors.SOMETHING');
    expect(exception.code).toBe('SOMETHING');
  });

  it('defaults to 400', () => {
    expect(new BusinessException('k', 'C').getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('honours an explicit status', () => {
    expect(new BusinessException('k', 'C', HttpStatus.CONFLICT).getStatus()).toBe(
      HttpStatus.CONFLICT,
    );
  });

  it('exposes details in the response body', () => {
    const exception = new BusinessException('k', 'C', HttpStatus.BAD_REQUEST, { planSlug: 'pro' });
    expect(exception.getResponse()).toEqual({
      messageKey: 'k',
      code: 'C',
      details: { planSlug: 'pro' },
    });
  });
});

describe('EntityNotFoundException', () => {
  it('reports 404 with a lowercased entity message key', () => {
    const exception = new EntityNotFoundException('Subscription', 'sub_1');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.messageKey).toBe('errors.subscription.notFound');
    expect(exception.code).toBe('ENTITY_NOT_FOUND');
  });

  it('records the entity and id for the caller', () => {
    const exception = new EntityNotFoundException('Invoice', 'inv_9');
    expect(exception.getResponse()).toMatchObject({
      details: { entity: 'Invoice', id: 'inv_9' },
    });
  });
});

describe('BillingException', () => {
  it('derives the i18n key from the stable error code', () => {
    const exception = new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
    expect(exception.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect(exception.messageKey).toBe('billing.errors.PAYMENT_AMOUNT_MISMATCH');
  });

  it('defaults to 400 but accepts a payment-required status', () => {
    expect(new BillingException(BillingErrorCode.PLAN_NOT_FOUND).getStatus()).toBe(
      HttpStatus.BAD_REQUEST,
    );
    expect(
      new BillingException(
        BillingErrorCode.PAYMENT_REQUIRED,
        HttpStatus.PAYMENT_REQUIRED,
      ).getStatus(),
    ).toBe(HttpStatus.PAYMENT_REQUIRED);
  });

  it('carries only caller-owned identifiers in details', () => {
    const exception = new BillingException(
      BillingErrorCode.QUOTA_DAILY_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
      { window: 'DAY' },
    );
    const body = exception.getResponse() as Record<string, unknown>;
    expect(body['details']).toEqual({ window: 'DAY' });
    // No provider payload, no cost ceiling, no secret identifier.
    expect(JSON.stringify(body)).not.toMatch(/secret|token|microUsd|ceiling/i);
  });

  it('produces a distinct key per code so the frontend can translate each', () => {
    const keys = new Set(
      Object.values(BillingErrorCode).map((code) => new BillingException(code).messageKey),
    );
    expect(keys.size).toBe(Object.values(BillingErrorCode).length);
  });
});
