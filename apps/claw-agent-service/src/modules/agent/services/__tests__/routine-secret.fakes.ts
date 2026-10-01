import { ChannelKeyring } from '../../../channels/services/channel-keyring';
import type {
  RoutineSecretMetadata,
  RoutineSecretRow,
  RoutineSecretWriteOutcome,
  SealedRoutineSecret,
} from '../../types/routine-secret.types';
import type { ScheduledCommand } from '../../../../generated/prisma';

export const TEST_KEY = 'c3'.repeat(32);

export class FixedKeyring extends ChannelKeyring {
  masterKey(): string {
    return TEST_KEY;
  }

  publicOrigin(): string {
    return 'https://claw.test';
  }
}

/** A routine as the repository would return it. */
export function routineRow(overrides: Partial<ScheduledCommand> = {}): ScheduledCommand {
  return {
    id: 'routine-1',
    userId: 'user-1',
    kind: 'PROMPT',
    status: 'ENABLED',
    webhookEnabled: false,
    webhookSecretVersion: 0,
    webhookSecretsEnabled: false,
    ...overrides,
  } as ScheduledCommand;
}

/** In-memory routines, scoped by owner exactly as the real repository is. */
export class FakeRoutines {
  constructor(readonly rows: ScheduledCommand[]) {}

  findByIdForUser(id: string, userId: string): Promise<ScheduledCommand | null> {
    return Promise.resolve(this.rows.find((r) => r.id === id && r.userId === userId) ?? null);
  }

  setWebhookSecretsEnabled(id: string, enabled: boolean): Promise<ScheduledCommand> {
    const row = this.rows.find((r) => r.id === id);
    if (row === undefined) return Promise.reject(new Error('missing'));
    row.webhookSecretsEnabled = enabled;
    return Promise.resolve(row);
  }
}

/** In-memory secret store with the real repository's scoping and limit semantics. */
export class FakeSecrets {
  rows: RoutineSecretRow[] = [];
  private seq = 0;

  private metadata(row: RoutineSecretRow): RoutineSecretMetadata {
    return { name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  listMetadata(routineId: string, userId: string): Promise<RoutineSecretMetadata[]> {
    return Promise.resolve(
      this.rows
        .filter((r) => r.routineId === routineId && r.userId === userId)
        .map((r) => this.metadata(r)),
    );
  }

  listSealed(routineId: string, userId: string): Promise<RoutineSecretRow[]> {
    return Promise.resolve(
      this.rows.filter((r) => r.routineId === routineId && r.userId === userId),
    );
  }

  createWithinLimit(data: SealedRoutineSecret, limit: number): Promise<RoutineSecretWriteOutcome> {
    if (this.rows.some((r) => r.routineId === data.routineId && r.name === data.name)) {
      return Promise.resolve({ status: 'exists' });
    }
    const count = this.rows.filter(
      (r) => r.routineId === data.routineId && r.userId === data.userId,
    ).length;
    if (count >= limit) return Promise.resolve({ status: 'limit' });
    this.seq += 1;
    const now = new Date();
    const row: RoutineSecretRow = {
      id: `s${String(this.seq)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return Promise.resolve({ status: 'ok', secret: this.metadata(row) });
  }

  replace(data: SealedRoutineSecret): Promise<RoutineSecretWriteOutcome> {
    const row = this.rows.find(
      (r) => r.routineId === data.routineId && r.userId === data.userId && r.name === data.name,
    );
    if (row === undefined) return Promise.resolve({ status: 'missing' });
    row.ciphertext = data.ciphertext;
    row.updatedAt = new Date();
    return Promise.resolve({ status: 'ok', secret: this.metadata(row) });
  }

  remove(routineId: string, userId: string, name: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (r) => !(r.routineId === routineId && r.userId === userId && r.name === name),
    );
    return Promise.resolve(this.rows.length < before);
  }
}
