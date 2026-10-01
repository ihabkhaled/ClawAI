import { Logger } from '@nestjs/common';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../../../../common/errors/business.exception';
import { ROUTINE_SECRET_MAX_PER_ROUTINE } from '../../../../common/constants/routine-secret.constants';
import { decryptWithAad, encryptWithAad } from '../../../../common/utilities/aes-gcm.utility';
import { routineSecretAad } from '../../../../common/utilities/routine-secret-aad.utility';
import { RoutineSecretService } from '../routine-secret.service';
import {
  FakeRoutines,
  FakeSecrets,
  FixedKeyring,
  routineRow,
  TEST_KEY,
} from './routine-secret.fakes';
import type { RoutineSecretRepository } from '../../repositories/routine-secret.repository';
import type { ScheduledCommandRepository } from '../../repositories/scheduled-command.repository';
import type { TerminalCommand } from '../../../../generated/prisma';

beforeAll(() => {
  Logger.overrideLogger(false);
});

/** Every value used here carries the sentinel, so a leak is a plain substring search. */
const SENTINEL = 'SENTINEL-s3cr3t';
const VALUE_A = `${SENTINEL}-A-value`;
const VALUE_B = `${SENTINEL}-B-value`;

type Job = Pick<TerminalCommand, 'routineId' | 'routineRunSource' | 'userId'>;
const job = (overrides: Partial<Job> = {}): Job => ({
  routineId: 'routine-1',
  routineRunSource: 'SCHEDULE',
  userId: 'user-1',
  ...overrides,
});

function setup(routines = [routineRow()]) {
  const secrets = new FakeSecrets();
  const routineRepo = new FakeRoutines(routines);
  const service = new RoutineSecretService(
    secrets as unknown as RoutineSecretRepository,
    routineRepo as unknown as ScheduledCommandRepository,
    new FixedKeyring(),
  );
  return { service, secrets, routineRepo };
}

async function status(promise: Promise<unknown>): Promise<{ status: number; body: unknown }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BusinessException) {
      return { status: error.getStatus(), body: error.getResponse() };
    }
    throw error;
  }
  return { status: 0, body: null };
}

describe('RoutineSecretService: owner CRUD (F099 step 2)', () => {
  it('stores only ciphertext, never the value', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    const [row] = secrets.rows;
    expect(row?.ciphertext).not.toContain(SENTINEL);
    expect(JSON.stringify(secrets.rows)).not.toContain(SENTINEL);
    expect(
      decryptWithAad(
        row?.ciphertext ?? '',
        TEST_KEY,
        routineSecretAad('routine-1', 'user-1', 'API_KEY'),
      ),
    ).toBe(VALUE_A);
  });

  it('list returns names and dates only: no value, no ciphertext, no nonce', async () => {
    const { service } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.create('user-1', 'routine-1', 'DB_URL', VALUE_B);
    const listed = await service.list('user-1', 'routine-1');
    expect(listed.secrets.map((s) => s.name)).toEqual(['API_KEY', 'DB_URL']);
    expect(Object.keys(listed.secrets[0] ?? {}).sort()).toEqual(['createdAt', 'name', 'updatedAt']);
    expect(listed.limit).toBe(ROUTINE_SECRET_MAX_PER_ROUTINE);
    expect(listed.webhookRunsReceiveSecrets).toBe(false);
    expect(JSON.stringify(listed)).not.toContain(SENTINEL);
  });

  it('the result of create and replace is metadata, never the value', async () => {
    const { service } = setup();
    const created = await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    const replaced = await service.replace('user-1', 'routine-1', 'API_KEY', VALUE_B);
    expect(JSON.stringify([created, replaced])).not.toContain(SENTINEL);
    expect(Object.keys(replaced).sort()).toEqual(['createdAt', 'name', 'updatedAt']);
  });

  it('a duplicate name is 409 and does not overwrite', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    const second = await status(service.create('user-1', 'routine-1', 'API_KEY', VALUE_B));
    expect(second.status).toBe(409);
    expect(secrets.rows).toHaveLength(1);
    expect(JSON.stringify(second.body)).not.toContain(SENTINEL);
  });

  it('replace swaps the value and keeps one row; a missing name is 404', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.replace('user-1', 'routine-1', 'API_KEY', VALUE_B);
    expect(secrets.rows).toHaveLength(1);
    const opened = await service.resolveForRun(job(), 'user-1');
    expect(opened).toEqual([{ name: 'API_KEY', value: VALUE_B }]);
    const missing = await status(service.replace('user-1', 'routine-1', 'NOPE', VALUE_B));
    expect(missing.status).toBe(404);
  });

  it('delete removes the secret; deleting a missing one is 404', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.remove('user-1', 'routine-1', 'API_KEY');
    expect(secrets.rows).toHaveLength(0);
    expect((await status(service.remove('user-1', 'routine-1', 'API_KEY'))).status).toBe(404);
  });

  it('allows 20 secrets per routine and refuses the 21st with 422; replacing at the limit still works', async () => {
    const { service, secrets } = setup();
    for (let i = 0; i < ROUTINE_SECRET_MAX_PER_ROUTINE; i += 1) {
      await service.create('user-1', 'routine-1', `KEY_${String(i)}`, `v${String(i)}`);
    }
    expect(secrets.rows).toHaveLength(20);
    const over = await status(service.create('user-1', 'routine-1', 'ONE_TOO_MANY', 'v'));
    expect(over.status).toBe(422);
    expect(secrets.rows).toHaveLength(20);
    await service.replace('user-1', 'routine-1', 'KEY_0', 'new');
    await service.remove('user-1', 'routine-1', 'KEY_1');
    await service.create('user-1', 'routine-1', 'ONE_TOO_MANY', 'v');
    expect(secrets.rows).toHaveLength(20);
  });

  it('the limit is per routine: a full routine does not block another', async () => {
    const { service } = setup([routineRow(), routineRow({ id: 'routine-2' })]);
    for (let i = 0; i < ROUTINE_SECRET_MAX_PER_ROUTINE; i += 1) {
      await service.create('user-1', 'routine-1', `KEY_${String(i)}`, 'v');
    }
    await expect(service.create('user-1', 'routine-2', 'KEY_0', 'v')).resolves.toBeDefined();
  });

  it('shell-command routines have no secrets: 400, nothing stored', async () => {
    const { service, secrets } = setup([routineRow({ id: 'cmd-routine', kind: 'COMMAND' })]);
    const outcome = await status(service.create('user-1', 'cmd-routine', 'API_KEY', VALUE_A));
    expect(outcome.status).toBe(400);
    expect((await status(service.list('user-1', 'cmd-routine'))).status).toBe(400);
    expect(secrets.rows).toHaveLength(0);
  });

  it('the webhook opt-in is owner-only and defaults off', async () => {
    const { service, routineRepo } = setup();
    expect((await service.list('user-1', 'routine-1')).webhookRunsReceiveSecrets).toBe(false);
    expect(await service.setPolicy('user-1', 'routine-1', true)).toEqual({
      webhookRunsReceiveSecrets: true,
    });
    expect(routineRepo.rows[0]?.webhookSecretsEnabled).toBe(true);
    expect((await status(service.setPolicy('user-2', 'routine-1', false))).status).toBe(404);
    expect(routineRepo.rows[0]?.webhookSecretsEnabled).toBe(true);
  });
});

describe('RoutineSecretService: isolation (IDOR)', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(async () => {
    ctx = setup([
      routineRow(),
      routineRow({ id: 'routine-2' }),
      routineRow({ id: 'routine-3', userId: 'user-2' }),
    ]);
    await ctx.service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await ctx.service.create('user-1', 'routine-2', 'API_KEY', VALUE_B);
    await ctx.service.create('user-2', 'routine-3', 'API_KEY', `${SENTINEL}-victim`);
  });

  it("another user's routine answers exactly like a routine that does not exist (404, same body)", async () => {
    const operations: ((id: string) => Promise<unknown>)[] = [
      (id) => ctx.service.list('user-1', id),
      (id) => ctx.service.create('user-1', id, 'NEW_KEY', 'v'),
      (id) => ctx.service.replace('user-1', id, 'API_KEY', 'v'),
      (id) => ctx.service.remove('user-1', id, 'API_KEY'),
      (id) => ctx.service.setPolicy('user-1', id, true),
    ];
    for (const operation of operations) {
      const foreign = await status(operation('routine-3'));
      const missing = await status(operation('routine-does-not-exist'));
      expect(foreign.status).toBe(404);
      expect(foreign).toEqual(missing);
    }
  });

  it("a cross-user attempt changes nothing: the victim's secret and policy are untouched", async () => {
    await status(ctx.service.replace('user-1', 'routine-3', 'API_KEY', 'attacker'));
    await status(ctx.service.remove('user-1', 'routine-3', 'API_KEY'));
    await status(ctx.service.create('user-1', 'routine-3', 'EXTRA', 'attacker'));
    await status(ctx.service.setPolicy('user-1', 'routine-3', true));
    const victim = ctx.secrets.rows.filter((r) => r.routineId === 'routine-3');
    expect(victim.map((r) => r.name)).toEqual(['API_KEY']);
    const opened = await ctx.service.resolveForRun(
      job({ routineId: 'routine-3', userId: 'user-2' }),
      'user-2',
    );
    expect(opened).toEqual([{ name: 'API_KEY', value: `${SENTINEL}-victim` }]);
    expect(ctx.routineRepo.rows.find((r) => r.id === 'routine-3')?.webhookSecretsEnabled).toBe(
      false,
    );
  });

  it("a job gets only its own routine's secrets, never a sibling routine's", async () => {
    const first = await ctx.service.resolveForRun(job({ routineId: 'routine-1' }), 'user-1');
    const second = await ctx.service.resolveForRun(job({ routineId: 'routine-2' }), 'user-1');
    expect(first).toEqual([{ name: 'API_KEY', value: VALUE_A }]);
    expect(second).toEqual([{ name: 'API_KEY', value: VALUE_B }]);
  });

  it("a job cannot be pointed at another user's routine: owner mismatch yields nothing", async () => {
    const stolen = job({ routineId: 'routine-3', userId: 'user-1' });
    expect(await ctx.service.resolveForRun(stolen, 'user-1')).toEqual([]);
    expect(
      await ctx.service.resolveForRun(job({ routineId: 'routine-3', userId: 'user-2' }), 'user-1'),
    ).toEqual([]);
  });

  it('a runner belonging to another user is handed nothing, even for a valid job', async () => {
    expect(await ctx.service.resolveForRun(job(), 'user-2')).toEqual([]);
  });

  it('a ciphertext copied to another routine row cannot be opened there', async () => {
    const source = ctx.secrets.rows.find((r) => r.routineId === 'routine-1');
    const target = ctx.secrets.rows.find((r) => r.routineId === 'routine-2');
    if (source === undefined || target === undefined) throw new Error('fixture');
    target.ciphertext = source.ciphertext;
    const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    expect(await ctx.service.resolveForRun(job({ routineId: 'routine-2' }), 'user-1')).toEqual([]);
    expect(errors).toHaveBeenCalled();
    expect(JSON.stringify(errors.mock.calls)).not.toContain(SENTINEL);
    errors.mockRestore();
  });

  it('a row re-pointed at another user or name in the database cannot be opened', async () => {
    const row = ctx.secrets.rows.find((r) => r.routineId === 'routine-1');
    if (row === undefined) throw new Error('fixture');
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    row.name = 'RENAMED';
    expect(await ctx.service.resolveForRun(job(), 'user-1')).toEqual([]);
    row.name = 'API_KEY';
    row.userId = 'user-2';
    expect(await ctx.service.resolveForRun(job({ userId: 'user-2' }), 'user-2')).toEqual([]);
    vi.restoreAllMocks();
  });
});

describe('RoutineSecretService.resolveForRun: when a run is granted its secrets', () => {
  async function seeded(routineOverrides = {}) {
    const ctx = setup([routineRow(routineOverrides)]);
    await ctx.service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    return ctx;
  }

  it.each(['SCHEDULE', 'MANUAL'])('a %s run receives them', async (source) => {
    const { service } = await seeded();
    expect(await service.resolveForRun(job({ routineRunSource: source }), 'user-1')).toEqual([
      { name: 'API_KEY', value: VALUE_A },
    ]);
  });

  it('a webhook run receives nothing by default', async () => {
    const { service } = await seeded();
    expect(await service.resolveForRun(job({ routineRunSource: 'WEBHOOK' }), 'user-1')).toEqual([]);
  });

  it('a webhook run receives them once the owner opted in, and stops when they opt out', async () => {
    const { service } = await seeded();
    await service.setPolicy('user-1', 'routine-1', true);
    expect(
      await service.resolveForRun(job({ routineRunSource: 'WEBHOOK' }), 'user-1'),
    ).toHaveLength(1);
    await service.setPolicy('user-1', 'routine-1', false);
    expect(await service.resolveForRun(job({ routineRunSource: 'WEBHOOK' }), 'user-1')).toEqual([]);
  });

  it.each([null, '', 'webhook', 'ADMIN', 'SCHEDULE '])(
    'an unknown or missing run source (%j) fails closed',
    async (source) => {
      const { service } = await seeded({ webhookSecretsEnabled: true });
      expect(await service.resolveForRun(job({ routineRunSource: source }), 'user-1')).toEqual([]);
    },
  );

  it('a job with no routine, a deleted routine or a non-prompt routine gets nothing', async () => {
    const { service } = await seeded();
    expect(await service.resolveForRun(job({ routineId: null }), 'user-1')).toEqual([]);
    expect(await service.resolveForRun(job({ routineId: 'gone' }), 'user-1')).toEqual([]);
    const command = await seeded();
    const row = command.routineRepo.rows[0];
    if (row === undefined) throw new Error('fixture');
    row.kind = 'COMMAND';
    expect(await command.service.resolveForRun(job(), 'user-1')).toEqual([]);
  });
});

describe('RoutineSecretService.redactRunOutput', () => {
  it('scrubs every secret value out of stdout and stderr, whatever fired the run', async () => {
    const { service } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.create('user-1', 'routine-1', 'DB_URL', VALUE_B);
    for (const routineRunSource of ['SCHEDULE', 'WEBHOOK', null]) {
      const out = await service.redactRunOutput(job({ routineRunSource }), {
        stdout: `key=${VALUE_A} db=${VALUE_B}`,
        stderr: `oops ${VALUE_B}`,
      });
      expect(out).toEqual({ stdout: 'key=[REDACTED] db=[REDACTED]', stderr: 'oops [REDACTED]' });
    }
  });

  it('leaves absent fields absent and passes non-routine jobs through untouched', async () => {
    const { service } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    expect(await service.redactRunOutput(job(), { stdout: 'clean' })).toEqual({ stdout: 'clean' });
    const plain = { stdout: VALUE_A };
    expect(await service.redactRunOutput(job({ routineId: null }), plain)).toBe(plain);
  });

  it("never scrubs with another routine's or user's secrets", async () => {
    const { service } = setup([routineRow(), routineRow({ id: 'routine-3', userId: 'user-2' })]);
    await service.create('user-2', 'routine-3', 'API_KEY', VALUE_B);
    const out = await service.redactRunOutput(job(), { stdout: `x ${VALUE_B}` });
    expect(out).toEqual({ stdout: `x ${VALUE_B}` });
  });

  it('a secret that cannot be decrypted never blocks the completion', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.create('user-1', 'routine-1', 'DB_URL', VALUE_B);
    const broken = secrets.rows.find((r) => r.name === 'API_KEY');
    if (broken === undefined) throw new Error('fixture');
    broken.ciphertext = encryptWithAad('x', TEST_KEY, 'wrong-aad');
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const out = await service.redactRunOutput(job(), { stdout: `${VALUE_A} ${VALUE_B}` });
    expect(out.stdout).toBe(`${VALUE_A} [REDACTED]`);
    vi.restoreAllMocks();
  });
});

describe('RoutineSecretService: a value never reaches a log or an error', () => {
  const spies: ReturnType<typeof vi.spyOn>[] = [];
  const captured: unknown[][] = [];

  beforeEach(() => {
    captured.length = 0;
    for (const method of ['log', 'debug', 'warn', 'error', 'verbose', 'fatal'] as const) {
      spies.push(
        vi.spyOn(Logger.prototype, method).mockImplementation((...args: unknown[]) => {
          captured.push(args);
        }),
      );
    }
    spies.push(
      vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => void captured.push(args)),
    );
  });
  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  it('create, list, replace, resolve, redact and delete log no value, ciphertext or key', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    await service.list('user-1', 'routine-1');
    await service.replace('user-1', 'routine-1', 'API_KEY', VALUE_B);
    await service.resolveForRun(job(), 'user-1');
    await service.redactRunOutput(job(), { stdout: VALUE_B });
    const ciphertext = secrets.rows[0]?.ciphertext ?? '';
    await service.remove('user-1', 'routine-1', 'API_KEY');
    const everything = JSON.stringify(captured);
    expect(captured.length).toBeGreaterThan(0);
    expect(everything).not.toContain(SENTINEL);
    expect(everything).not.toContain(ciphertext);
    expect(everything).not.toContain(TEST_KEY);
  });

  it('a failed decrypt logs the name and routine, not the value, the ciphertext or the key', async () => {
    const { service, secrets } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    const row = secrets.rows[0];
    if (row === undefined) throw new Error('fixture');
    const original = row.ciphertext;
    row.ciphertext = encryptWithAad(VALUE_A, TEST_KEY, 'other-aad');
    await service.resolveForRun(job(), 'user-1');
    const everything = JSON.stringify(captured);
    expect(everything).toContain('API_KEY');
    expect(everything).not.toContain(SENTINEL);
    expect(everything).not.toContain(row.ciphertext);
    expect(everything).not.toContain(original);
    expect(everything).not.toContain(TEST_KEY);
  });

  it('errors raised by the service never carry a value', async () => {
    const { service } = setup();
    await service.create('user-1', 'routine-1', 'API_KEY', VALUE_A);
    const duplicate = await status(service.create('user-1', 'routine-1', 'API_KEY', VALUE_B));
    const missing = await status(service.replace('user-1', 'routine-1', 'NOPE', VALUE_B));
    const foreign = await status(service.create('user-2', 'routine-1', 'API_KEY', VALUE_B));
    expect(JSON.stringify([duplicate, missing, foreign])).not.toContain(SENTINEL);
  });
});
