import { Injectable } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';

import { SECURITY_EVENT_SERVICE_NAME } from '../constants/anti-abuse.constants';
import type { SecurityEventAction } from '../enums/security-event-action.enum';
import type { SecurityEventInput, SecurityEventMetadata } from '../types/security-event.types';
import { fingerprintLogPrefix } from '../utilities/device-hash.utility';
import { extractEmailDomain } from '../utilities/email-domain.utility';

/**
 * Writes the structured security event every anti-abuse refusal leaves behind
 * (server-logs pipeline, `action` = the event name). Carries IP, country and
 * user agent, the email DOMAIN only and an 8-character prefix of the PEPPERED
 * fingerprint hash: an operator can group a farm without the log holding an
 * address or a reusable fingerprint.
 */
@Injectable()
export class SecurityEventService {
  private readonly structuredLogger: StructuredLogger;

  constructor(rabbitMQService: RabbitMQService) {
    this.structuredLogger = new StructuredLogger(
      rabbitMQService,
      SECURITY_EVENT_SERVICE_NAME,
      EventPattern.LOG_SERVER,
      SecurityEventService.name,
    );
  }

  record(action: SecurityEventAction, input: SecurityEventInput): void {
    const metadata: SecurityEventMetadata = {
      ip: input.origin.ip,
      countryCode: input.origin.countryCode,
      userAgent: input.origin.userAgent,
      emailDomain: input.email === null ? null : extractEmailDomain(input.email),
      fingerprintPrefix: fingerprintLogPrefix(input.fingerprintHash),
      reason: input.reason ?? null,
    };
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Security event ${action} domain=${metadata.emailDomain ?? '-'} fp=${metadata.fingerprintPrefix ?? '-'} reason=${metadata.reason ?? '-'}`,
      action,
      service: SecurityEventService.name,
      errorCode: input.code,
      userId: input.userId,
      metadata,
    });
  }
}
