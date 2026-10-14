import { Injectable, Logger } from '@nestjs/common';

import { InvocationAuditRepository } from '../repositories/invocation-audit.repository';
import { type AuditEntry } from '../types/invoke.types';
import { toInvocationState } from '../utilities/to-invocation-state.utility';

/**
 * Records what happened to a call, without payloads: who, which tool, how it ended, a hash of the
 * arguments, byte counts and timing. A failure to write is logged and swallowed, because the
 * user already has their answer; the unique (userId, callId) key stops a replay from doubling it.
 */
@Injectable()
export class InvocationAuditManager {
  private readonly logger = new Logger(InvocationAuditManager.name);

  constructor(private readonly repository: InvocationAuditRepository) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repository.insert({
        userId: entry.userId,
        installId: entry.target.installId,
        pluginId: entry.target.pluginId,
        serverId: entry.target.serverId,
        callId: entry.callId,
        toolName: entry.target.toolName,
        conversationId: entry.conversationId ?? null,
        messageId: entry.messageId ?? null,
        surface: entry.surface,
        status: toInvocationState(entry.status),
        riskLevel: entry.target.riskLevel,
        consentDecision: entry.consentDecision,
        taintedTurn: entry.tainted,
        argsHash: entry.argsHash,
        resultBytes: entry.resultBytes,
        truncated: entry.truncated,
        errorCode: entry.errorCode,
        durationMs: entry.durationMs,
      });
    } catch {
      this.logger.error(`record: could not write the audit row for call ${entry.callId}`);
    }
  }

  async alreadyRecorded(userId: string, callId: string): Promise<boolean> {
    return this.repository.existsForCall(userId, callId);
  }
}
