import { HttpStatus, Injectable } from '@nestjs/common';
import { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import {
  REMOTE_TRIGGER_KEY_PREFIX,
  REMOTE_TRIGGER_PENDING_MARKER,
} from '../constants/remote-trigger.constants';
import { RemoteJobRunner, RemoteTriggerIdempotencyStore } from './remote-trigger.ports';
import type { RemoteTriggerResult } from '../types/remote-trigger.types';

/**
 * Fires a scheduled command now, at most once per idempotency key (F029).
 *
 * A retry with the same key returns the command the first request created,
 * marked `replayed`, instead of running the job twice. A key whose first fire
 * is still in flight answers 409; a fire that fails releases the key so the
 * caller can try again with it.
 */
@Injectable()
export class RemoteTriggerService {
  constructor(
    private readonly runner: RemoteJobRunner,
    private readonly idempotency: RemoteTriggerIdempotencyStore,
  ) {}

  /** `source` is what fired the run; it decides whether the routine's secrets are injected. */
  async trigger(
    userId: string,
    id: string,
    idempotencyKey: string,
    source: RoutineRunSource = RoutineRunSource.MANUAL,
  ): Promise<RemoteTriggerResult> {
    const scheduled = await this.runner.findOwned(userId, id);
    if (scheduled === null) {
      throw new BusinessException(
        'agent.scheduled_command.not_found',
        'scheduled_command_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    const key = `${REMOTE_TRIGGER_KEY_PREFIX}${userId}:${id}:${idempotencyKey}`;
    if (!(await this.idempotency.claim(key))) return this.replay(key);
    try {
      const command = await this.runner.fire(scheduled, source);
      if (command === null) {
        throw new BusinessException(
          'agent.remote_trigger.device_offline',
          'remote_trigger_device_offline',
          HttpStatus.CONFLICT,
        );
      }
      await this.idempotency.settle(key, command.id);
      return { command, replayed: false };
    } catch (error) {
      await this.idempotency.release(key);
      throw error;
    }
  }

  private async replay(key: string): Promise<RemoteTriggerResult> {
    const commandId = await this.idempotency.read(key);
    const command =
      commandId === null || commandId === REMOTE_TRIGGER_PENDING_MARKER
        ? null
        : await this.runner.findCommand(commandId);
    if (command === null) {
      throw new BusinessException(
        'agent.remote_trigger.in_progress',
        'remote_trigger_in_progress',
        HttpStatus.CONFLICT,
      );
    }
    return { command, replayed: true };
  }
}
