import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { SecurityEventAction } from '../../enums/security-event-action.enum';
import { SecurityEventService } from '../security-event.service';

describe('SecurityEventService', () => {
  let publish: Mock;
  let service: SecurityEventService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    publish = vi.fn().mockResolvedValue(undefined);
    service = new SecurityEventService({ publish } as unknown as RabbitMQService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the action with IP, country, agent, email DOMAIN and an 8-char fingerprint prefix', () => {
    service.record(SecurityEventAction.SIGNUP_REFUSED_DISPOSABLE, {
      origin: { ip: '203.0.113.9', countryCode: 'NL', userAgent: 'python-requests/2.31' },
      email: 'farm.bot.17@euploading.com',
      fingerprintHash: '0123456789abcdef'.repeat(4),
      code: 'DISPOSABLE_EMAIL',
      reason: 'DISPOSABLE',
    });

    expect(publish).toHaveBeenCalledTimes(1);
    const [pattern, payload] = publish.mock.calls[0] as [string, Record<string, unknown>];
    expect(pattern).toBe(EventPattern.LOG_SERVER);
    expect(payload).toMatchObject({
      action: 'signup_refused_disposable',
      errorCode: 'DISPOSABLE_EMAIL',
      metadata: {
        ip: '203.0.113.9',
        countryCode: 'NL',
        userAgent: 'python-requests/2.31',
        emailDomain: 'euploading.com',
        fingerprintPrefix: '01234567',
        reason: 'DISPOSABLE',
      },
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('farm.bot.17');
    expect(serialized).not.toContain('0123456789abcdef0123');
  });

  it('copes with no email, no fingerprint and no origin', () => {
    service.record(SecurityEventAction.LOGIN_BOT_CHECK_REQUIRED, {
      origin: { ip: null, countryCode: null, userAgent: null },
      email: null,
      fingerprintHash: null,
    });
    const [, payload] = publish.mock.calls[0] as [string, { metadata: unknown }];
    expect(payload.metadata).toEqual({
      ip: null,
      countryCode: null,
      userAgent: null,
      emailDomain: null,
      fingerprintPrefix: null,
      reason: null,
    });
  });
});
