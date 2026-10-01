import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { ScheduledCommandKind } from '../../../common/enums/scheduled-command-kind.enum';
import { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import { ROUTINE_SECRET_MAX_PER_ROUTINE } from '../../../common/constants/routine-secret.constants';
import { decryptWithAad, encryptWithAad } from '../../../common/utilities/aes-gcm.utility';
import { routineSecretAad } from '../../../common/utilities/routine-secret-aad.utility';
import { scrubSecretValues } from '../../../common/utilities/routine-secret-scrub.utility';
import { ChannelKeyring } from '../../channels/services/channel-keyring';
import { RoutineSecretRepository } from '../repositories/routine-secret.repository';
import { ScheduledCommandRepository } from '../repositories/scheduled-command.repository';
import type {
  InjectedSecret,
  RoutineJob,
  RoutineSecretList,
  RoutineSecretMetadata,
  RoutineSecretRow,
  RoutineSecretsPolicy,
  RoutineSecretWriteOutcome,
  RunOutput,
  SealedRoutineSecret,
} from '../types/routine-secret.types';
import type { ScheduledCommand } from '../../../generated/prisma';

/**
 * F099 step 2: secrets a prompt routine can read.
 *
 * What keeps one routine's secrets away from everything else:
 *  - every owner call first resolves the routine through `findByIdForUser`, so
 *    another user's routine and a missing one are the same 404;
 *  - every query carries routine id AND owner id, and the ciphertext is sealed
 *    with AAD over routine + owner + name, so a copied row fails to decrypt;
 *  - the owner can never read a value back: list returns names and dates only;
 *  - a value is decrypted in exactly two places: when the runner that claimed the
 *    routine's job is handed it, and to scrub it out of that job's reported output;
 *  - a value never enters a log line, an error, an event or the job's prompt.
 *
 * Nothing in this class logs a value, a ciphertext or the key.
 */
@Injectable()
export class RoutineSecretService {
  private readonly logger = new Logger(RoutineSecretService.name);

  constructor(
    private readonly secrets: RoutineSecretRepository,
    private readonly routines: ScheduledCommandRepository,
    private readonly keyring: ChannelKeyring,
  ) {}

  async list(userId: string, routineId: string): Promise<RoutineSecretList> {
    const routine = await this.requireOwnedPrompt(userId, routineId);
    this.logger.debug(`list: routine=${routineId}`);
    return {
      secrets: await this.secrets.listMetadata(routineId, userId),
      limit: ROUTINE_SECRET_MAX_PER_ROUTINE,
      webhookRunsReceiveSecrets: routine.webhookSecretsEnabled,
    };
  }

  async create(
    userId: string,
    routineId: string,
    name: string,
    value: string,
  ): Promise<RoutineSecretMetadata> {
    await this.requireOwnedPrompt(userId, routineId);
    const outcome = await this.secrets.createWithinLimit(
      this.seal(routineId, userId, name, value),
      ROUTINE_SECRET_MAX_PER_ROUTINE,
    );
    const created = this.unwrap(outcome);
    this.logger.log(`created: routine=${routineId} owner=${userId} name=${name}`);
    return created;
  }

  async replace(
    userId: string,
    routineId: string,
    name: string,
    value: string,
  ): Promise<RoutineSecretMetadata> {
    await this.requireOwnedPrompt(userId, routineId);
    const outcome = await this.secrets.replace(this.seal(routineId, userId, name, value));
    const replaced = this.unwrap(outcome);
    this.logger.log(`replaced: routine=${routineId} owner=${userId} name=${name}`);
    return replaced;
  }

  async remove(userId: string, routineId: string, name: string): Promise<void> {
    await this.requireOwnedPrompt(userId, routineId);
    if (!(await this.secrets.remove(routineId, userId, name))) throw this.secretNotFound();
    this.logger.log(`deleted: routine=${routineId} owner=${userId} name=${name}`);
  }

  async setPolicy(
    userId: string,
    routineId: string,
    webhookRunsReceiveSecrets: boolean,
  ): Promise<RoutineSecretsPolicy> {
    await this.requireOwnedPrompt(userId, routineId);
    const updated = await this.routines.setWebhookSecretsEnabled(
      routineId,
      webhookRunsReceiveSecrets,
    );
    this.logger.log(
      `policy: routine=${routineId} owner=${userId} webhookRunsReceiveSecrets=${String(
        updated.webhookSecretsEnabled,
      )}`,
    );
    return { webhookRunsReceiveSecrets: updated.webhookSecretsEnabled };
  }

  /**
   * The secrets a runner is handed when it claims `job`. Fail closed: anything not
   * provably in order returns no secrets. The runner that claimed must belong to the
   * job's owner, the routine must still exist, belong to that owner and be a prompt
   * routine, and a webhook-fired run needs the owner's current opt-in.
   */
  async resolveForRun(job: RoutineJob, runnerOwnerId: string): Promise<InjectedSecret[]> {
    if (job.routineId === null || job.userId !== runnerOwnerId) return [];
    const routine = await this.grantedRoutine(job, job.routineId);
    if (routine === null) return [];
    return (await this.open(routine.id, routine.userId)).map(({ name, value }) => ({
      name,
      value,
    }));
  }

  /**
   * Removes the routine's secret values from a job's reported output before it is
   * stored. Runs for every job that came from a routine, granted or not: a value that
   * leaks into output is scrubbed whatever put it there. Best effort by nature (exact
   * matches only); a failure to decrypt never blocks the completion.
   */
  async redactRunOutput(job: RoutineJob, output: RunOutput): Promise<RunOutput> {
    if (job.routineId === null) return output;
    const routine = await this.routines.findByIdForUser(job.routineId, job.userId);
    if (routine === null) return output;
    const values = (await this.open(routine.id, routine.userId)).map((secret) => secret.value);
    if (values.length === 0) return output;
    return {
      ...(output.stdout === undefined ? {} : { stdout: scrubSecretValues(output.stdout, values) }),
      ...(output.stderr === undefined ? {} : { stderr: scrubSecretValues(output.stderr, values) }),
    };
  }

  private async grantedRoutine(
    job: RoutineJob,
    routineId: string,
  ): Promise<ScheduledCommand | null> {
    const source = this.parseSource(job.routineRunSource);
    if (source === null) return null;
    const routine = await this.routines.findByIdForUser(routineId, job.userId);
    if (routine === null || routine.kind !== ScheduledCommandKind.PROMPT) return null;
    return source === RoutineRunSource.WEBHOOK && !routine.webhookSecretsEnabled ? null : routine;
  }

  private parseSource(raw: string | null): RoutineRunSource | null {
    return Object.values(RoutineRunSource).find((source) => source === raw) ?? null;
  }

  private async open(routineId: string, userId: string): Promise<InjectedSecret[]> {
    const rows = await this.secrets.listSealed(routineId, userId);
    const opened: InjectedSecret[] = [];
    for (const row of rows) {
      const value = this.tryDecrypt(row);
      if (value !== null) opened.push({ name: row.name, value });
    }
    return opened;
  }

  /** The AAD comes from the row's own columns, so a row edited to point elsewhere cannot open. */
  private tryDecrypt(row: RoutineSecretRow): string | null {
    try {
      return decryptWithAad(
        row.ciphertext,
        this.keyring.masterKey(),
        routineSecretAad(row.routineId, row.userId, row.name),
      );
    } catch {
      this.logger.error(`secret ${row.name} of routine ${row.routineId} could not be decrypted`);
      return null;
    }
  }

  private seal(
    routineId: string,
    userId: string,
    name: string,
    value: string,
  ): SealedRoutineSecret {
    return {
      routineId,
      userId,
      name,
      ciphertext: encryptWithAad(
        value,
        this.keyring.masterKey(),
        routineSecretAad(routineId, userId, name),
      ),
    };
  }

  private unwrap(outcome: RoutineSecretWriteOutcome): RoutineSecretMetadata {
    if (outcome.status === 'ok') return outcome.secret;
    if (outcome.status === 'missing') throw this.secretNotFound();
    if (outcome.status === 'limit') {
      throw new BusinessException(
        'agent.routine_secret.limit_reached',
        'routine_secret_limit_reached',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { limit: ROUTINE_SECRET_MAX_PER_ROUTINE },
      );
    }
    throw new BusinessException(
      'agent.routine_secret.exists',
      'routine_secret_exists',
      HttpStatus.CONFLICT,
    );
  }

  private secretNotFound(): BusinessException {
    return new BusinessException(
      'agent.routine_secret.not_found',
      'routine_secret_not_found',
      HttpStatus.NOT_FOUND,
    );
  }

  /** Another user's routine, a missing one and a non-prompt one never share a message with a hit. */
  private async requireOwnedPrompt(userId: string, routineId: string): Promise<ScheduledCommand> {
    const routine = await this.routines.findByIdForUser(routineId, userId);
    if (routine === null) {
      throw new BusinessException(
        'agent.scheduled_command.not_found',
        'scheduled_command_not_found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (routine.kind !== ScheduledCommandKind.PROMPT) {
      throw new BusinessException(
        'agent.routine_secret.unsupported_kind',
        'routine_secret_unsupported_kind',
        HttpStatus.BAD_REQUEST,
      );
    }
    return routine;
  }
}
