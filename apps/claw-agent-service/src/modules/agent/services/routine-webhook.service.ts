import { createHash } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import { ScheduledCommandKind } from '../../../common/enums/scheduled-command-kind.enum';
import { ScheduledCommandStatus } from '../../../common/enums/scheduled-command-status.enum';
import {
  ROUTINE_WEBHOOK_IDEMPOTENCY_DIGEST_CHARS,
  ROUTINE_WEBHOOK_IDEMPOTENCY_PREFIX,
  ROUTINE_WEBHOOK_MAX_BODY_BYTES,
  ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES,
  ROUTINE_WEBHOOK_PATH,
  ROUTINE_WEBHOOK_RATE_KEY_PREFIX,
  ROUTINE_WEBHOOK_SIGNATURE_FORMAT,
} from '../../../common/constants/routine-webhook.constants';
import { deriveRoutineWebhookSecret } from '../../../common/utilities/routine-webhook-secret.utility';
import {
  CHANNEL_SIGNATURE_HEADER,
  CHANNEL_TIMESTAMP_HEADER,
} from '../../channels/constants/channel.constants';
import { ChannelKeyring } from '../../channels/services/channel-keyring';
import {
  isFreshChannelTimestamp,
  isValidChannelSignature,
} from '../../channels/utilities/channel-signature.utility';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import { RemoteTriggerService } from './remote-trigger.service';
import { RoutineWebhookRateStore } from './routine-webhook.ports';
import type {
  RoutineWebhookHeaders,
  RoutineWebhookInfo,
  RoutineWebhookResult,
} from '../types/routine-webhook.types';
import type { ScheduledCommand } from '../../../generated/prisma';

/**
 * F099: a signed webhook that fires one prompt routine now (a CI step, a
 * GitHub Action or a relay calls it after a push or a failed build).
 *
 * The trust model, in order of what is checked:
 *  - the body is size-capped and is NEVER read into the prompt: it only takes
 *    part in the signature, so a commit message cannot steer a routine;
 *  - authenticity is the HMAC plus a 5-minute timestamp window;
 *  - the secret is per routine (derived, versioned), so one leaked secret
 *    reaches one routine and rotation retires it at once;
 *  - an unknown, disabled, paused or shell-command routine answers the same
 *    401 as a bad signature, so routine ids cannot be probed;
 *  - the delivery window is claimed only AFTER the signature verifies, so a
 *    stranger who knows a routine id cannot hold the window shut;
 *  - the fire goes through RemoteTriggerService keyed by a digest of the
 *    signature, so a replayed request returns the first run instead of a second.
 */
@Injectable()
export class RoutineWebhookService {
  private readonly logger = new Logger(RoutineWebhookService.name);

  constructor(
    private readonly routines: ScheduledCommandRepository,
    private readonly keyring: ChannelKeyring,
    private readonly rate: RoutineWebhookRateStore,
    private readonly trigger: RemoteTriggerService,
  ) {}

  async info(userId: string, id: string): Promise<RoutineWebhookInfo> {
    return this.toInfo(await this.requireOwnedPrompt(userId, id));
  }

  async setEnabled(userId: string, id: string, enabled: boolean): Promise<RoutineWebhookInfo> {
    await this.requireOwnedPrompt(userId, id);
    return this.toInfo(await this.routines.setWebhookEnabled(id, enabled));
  }

  async rotate(userId: string, id: string): Promise<RoutineWebhookInfo> {
    await this.requireOwnedPrompt(userId, id);
    return this.toInfo(await this.routines.rotateWebhookSecret(id));
  }

  async receive(
    routineId: string,
    headers: RoutineWebhookHeaders,
    rawBody: string,
    nowMs: number = Date.now(),
  ): Promise<RoutineWebhookResult> {
    const signature = this.checkEnvelope(headers, rawBody, nowMs);
    const routine = await this.routines.findById(routineId);
    const secret = deriveRoutineWebhookSecret(
      this.keyring.masterKey(),
      routineId,
      routine?.webhookSecretVersion ?? 0,
    );
    const signed = isValidChannelSignature(secret, headers.timestamp ?? '', rawBody, signature);
    if (routine === null || !signed || !this.canFire(routine)) {
      this.logger.debug(`routine webhook ${routineId} refused`);
      throw this.unauthorized('routine_webhook_signature_invalid');
    }
    return this.fire(routine, signature);
  }

  /** Size, presence and freshness: everything checkable before the routine is read. */
  private checkEnvelope(headers: RoutineWebhookHeaders, rawBody: string, nowMs: number): string {
    if (Buffer.byteLength(rawBody, 'utf8') > ROUTINE_WEBHOOK_MAX_BODY_BYTES) {
      throw new BusinessException(
        'agent.routine_webhook.payload_too_large',
        'routine_webhook_payload_too_large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const { signature, timestamp } = headers;
    if (signature === undefined || timestamp === undefined) {
      throw this.unauthorized('routine_webhook_signature_missing');
    }
    if (!isFreshChannelTimestamp(timestamp, nowMs)) {
      throw this.unauthorized('routine_webhook_timestamp_stale');
    }
    return signature;
  }

  private async fire(routine: ScheduledCommand, signature: string): Promise<RoutineWebhookResult> {
    const rateKey = `${ROUTINE_WEBHOOK_RATE_KEY_PREFIX}${routine.id}`;
    if (!(await this.rate.claim(rateKey))) {
      throw new BusinessException(
        'agent.routine_webhook.rate_limited',
        'routine_webhook_rate_limited',
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds: ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES },
      );
    }
    try {
      const result = await this.trigger.trigger(
        routine.userId,
        routine.id,
        this.keyFor(signature),
        RoutineRunSource.WEBHOOK,
      );
      this.logger.log(`routine webhook ${routine.id} fired (replayed=${result.replayed})`);
      return { accepted: true, commandId: result.command.id, replayed: result.replayed };
    } catch (error) {
      await this.rate.release(rateKey);
      throw error;
    }
  }

  private keyFor(signature: string): string {
    const digest = createHash('sha256')
      .update(signature)
      .digest('hex')
      .slice(0, ROUTINE_WEBHOOK_IDEMPOTENCY_DIGEST_CHARS);
    return `${ROUTINE_WEBHOOK_IDEMPOTENCY_PREFIX}${digest}`;
  }

  private canFire(routine: ScheduledCommand): boolean {
    return (
      routine.webhookEnabled &&
      routine.kind === ScheduledCommandKind.PROMPT &&
      routine.status === ScheduledCommandStatus.ENABLED
    );
  }

  private async requireOwnedPrompt(userId: string, id: string): Promise<ScheduledCommand> {
    const routine = await this.routines.findByIdForUser(id, userId);
    if (routine === null) {
      throw new BusinessException(
        'agent.scheduled_command.not_found',
        'scheduled_command_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (routine.kind !== ScheduledCommandKind.PROMPT) {
      throw new BusinessException(
        'agent.routine_webhook.unsupported_kind',
        'routine_webhook_unsupported_kind',
        HttpStatus.BAD_REQUEST,
      );
    }
    return routine;
  }

  private toInfo(routine: ScheduledCommand): RoutineWebhookInfo {
    return {
      enabled: routine.webhookEnabled,
      url: `${this.keyring.publicOrigin()}${ROUTINE_WEBHOOK_PATH}/${encodeURIComponent(routine.id)}`,
      secret: deriveRoutineWebhookSecret(
        this.keyring.masterKey(),
        routine.id,
        routine.webhookSecretVersion,
      ),
      signatureHeader: CHANNEL_SIGNATURE_HEADER,
      timestampHeader: CHANNEL_TIMESTAMP_HEADER,
      signatureFormat: ROUTINE_WEBHOOK_SIGNATURE_FORMAT,
      minSecondsBetweenDeliveries: ROUTINE_WEBHOOK_MIN_SECONDS_BETWEEN_DELIVERIES,
    };
  }

  private unauthorized(code: string): BusinessException {
    return new BusinessException(`agent.${code}`, code, HttpStatus.UNAUTHORIZED);
  }
}
