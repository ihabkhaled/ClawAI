import { Injectable } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';

import { ABUSE_AUDIT_SERVICE_NAME } from '../constants/abuse-defense.constants';
import { AbuseAuditAction } from '../enums/abuse-audit-action.enum';

/**
 * The structured audit line of every abuse decision (server-logs pipeline, `action` = the event).
 * Carries ids, a level, a code and counts. Never a token, an address, a fingerprint or a
 * credential: the redaction spec feeds hostile values through every method.
 */
@Injectable()
export class AbuseAuditService {
  private readonly structuredLogger: StructuredLogger;

  constructor(rabbitMQService: RabbitMQService) {
    this.structuredLogger = new StructuredLogger(
      rabbitMQService,
      ABUSE_AUDIT_SERVICE_NAME,
      EventPattern.LOG_SERVER,
      AbuseAuditService.name,
    );
  }

  suspended(input: {
    userId: string;
    level: number;
    code: string;
    endsAt: Date;
    evidence: Record<string, number>;
  }): void {
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Account auto-suspended level=${String(input.level)} code=${input.code} until=${input.endsAt.toISOString()}`,
      action: AbuseAuditAction.ACCOUNT_AUTO_SUSPENDED,
      service: AbuseAuditService.name,
      userId: input.userId,
      errorCode: input.code,
      metadata: {
        level: input.level,
        endsAt: input.endsAt.toISOString(),
        evidence: input.evidence,
      },
    });
  }

  suspensionLifted(input: { userId: string; actorUserId: string; lifted: number }): void {
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Auto-suspension lifted by administrator count=${String(input.lifted)}`,
      action: AbuseAuditAction.AUTO_SUSPENSION_LIFTED,
      service: AbuseAuditService.name,
      userId: input.userId,
      metadata: { actorUserId: input.actorUserId, lifted: input.lifted },
    });
  }

  /** A threshold was crossed but nothing was done (kill switch off, protected account, already blocked). */
  thresholdCrossed(input: { userId: string; code: string; reason: string; count: number }): void {
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Abuse threshold crossed code=${input.code} count=${String(input.count)} not acted on: ${input.reason}`,
      action: AbuseAuditAction.ABUSE_THRESHOLD_CROSSED,
      service: AbuseAuditService.name,
      userId: input.userId,
      errorCode: input.code,
      metadata: { count: input.count, reason: input.reason },
    });
  }

  /** Evidence an administrator reviews, never counted: a replayed token, a sign-in on a banned device. */
  flagged(input: { userId: string; code: string; source: string }): void {
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Abuse evidence flagged code=${input.code} source=${input.source}`,
      action: AbuseAuditAction.ABUSE_EVIDENCE_FLAGGED,
      service: AbuseAuditService.name,
      userId: input.userId,
      errorCode: input.code,
      metadata: { source: input.source },
    });
  }

  deviceMarked(input: { sourceUserId: string; marks: number; reason: string }): void {
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      message: `Banned account devices marked marks=${String(input.marks)} reason=${input.reason}`,
      action: AbuseAuditAction.BANNED_DEVICE_MARKED,
      service: AbuseAuditService.name,
      userId: input.sourceUserId,
      metadata: { marks: input.marks, reason: input.reason },
    });
  }

  deviceMarksLifted(input: { sourceUserId: string; lifted: number }): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Banned device marks lifted lifted=${String(input.lifted)}`,
      action: AbuseAuditAction.BANNED_DEVICE_LIFTED,
      service: AbuseAuditService.name,
      userId: input.sourceUserId,
      metadata: { lifted: input.lifted },
    });
  }
}
