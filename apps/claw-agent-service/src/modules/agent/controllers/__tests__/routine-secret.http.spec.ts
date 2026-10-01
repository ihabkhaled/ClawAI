import type { AddressInfo } from 'node:net';
import { type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GlobalExceptionFilter } from '../../../../app/filters/global-exception.filter';
import { RoutineSecretService } from '../../services/routine-secret.service';
import {
  FakeRoutines,
  FakeSecrets,
  FixedKeyring,
  routineRow,
} from '../../services/__tests__/routine-secret.fakes';
import { RoutineSecretController } from '../routine-secret.controller';
import type { RoutineSecretRepository } from '../../repositories/routine-secret.repository';
import type { ScheduledCommandRepository } from '../../repositories/scheduled-command.repository';

const SENTINEL = 'SENTINEL-http-s3cr3t';

/** Stands in for the JWT guard: the caller is whoever `x-test-user` names. */
class HeaderUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: { id: string };
    }>();
    request.user = { id: request.headers['x-test-user'] ?? 'nobody' };
    return true;
  }
}

describe('routine secret routes over HTTP (F099 step 2)', () => {
  let app: INestApplication;
  let base = '';
  const secrets = new FakeSecrets();

  beforeAll(async () => {
    const routines = new FakeRoutines([
      routineRow({ id: 'routine-1', userId: 'user-1' }),
      routineRow({ id: 'routine-2', userId: 'user-2' }),
      routineRow({ id: 'cmd-1', userId: 'user-1', kind: 'COMMAND' }),
    ]);
    const service = new RoutineSecretService(
      secrets as unknown as RoutineSecretRepository,
      routines as unknown as ScheduledCommandRepository,
      new FixedKeyring(),
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [RoutineSecretController],
      providers: [
        { provide: RoutineSecretService, useValue: service },
        { provide: APP_GUARD, useClass: HeaderUserGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const call = async (
    user: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; text: string }> => {
    const response = await fetch(`${base}/agent/scheduled-commands/${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-test-user': user },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, text: await response.text() };
  };

  it('creates (201), lists names only, replaces, deletes (204); no response carries the value', async () => {
    const created = await call('user-1', 'POST', 'routine-1/secrets', {
      name: 'API_KEY',
      value: `${SENTINEL}-1`,
    });
    expect(created.status).toBe(201);
    expect(Object.keys(JSON.parse(created.text) as object).sort()).toEqual([
      'createdAt',
      'name',
      'updatedAt',
    ]);

    const listed = await call('user-1', 'GET', 'routine-1/secrets');
    expect(listed.status).toBe(200);
    expect(JSON.parse(listed.text)).toMatchObject({
      secrets: [{ name: 'API_KEY' }],
      limit: 20,
      webhookRunsReceiveSecrets: false,
    });

    const replaced = await call('user-1', 'PUT', 'routine-1/secrets/API_KEY', {
      value: `${SENTINEL}-2`,
    });
    expect(replaced.status).toBe(200);

    const everything = [created.text, listed.text, replaced.text].join('');
    expect(everything).not.toContain(SENTINEL);
    expect(everything).not.toContain('ciphertext');

    const deleted = await call('user-1', 'DELETE', 'routine-1/secrets/API_KEY');
    expect(deleted.status).toBe(204);
    expect((await call('user-1', 'DELETE', 'routine-1/secrets/API_KEY')).status).toBe(404);
  });

  it("another user's routine is a 404 byte-identical to a routine that does not exist", async () => {
    const cases: [string, string, unknown?][] = [
      ['GET', 'secrets'],
      ['POST', 'secrets', { name: 'API_KEY', value: SENTINEL }],
      ['PUT', 'secrets/API_KEY', { value: SENTINEL }],
      ['DELETE', 'secrets/API_KEY'],
      ['PUT', 'secrets-policy', { webhookRunsReceiveSecrets: true }],
    ];
    for (const [method, tail, body] of cases) {
      const foreign = await call('user-1', method, `routine-2/${tail}`, body);
      const missing = await call('user-1', method, `no-such-routine/${tail}`, body);
      expect(foreign.status).toBe(404);
      const strip = (text: string): unknown => ({
        ...(JSON.parse(text) as Record<string, unknown>),
        timestamp: 0,
      });
      expect(strip(foreign.text)).toEqual(strip(missing.text));
      expect(foreign.text).not.toContain(SENTINEL);
    }
    expect(secrets.rows.filter((row) => row.routineId === 'routine-2')).toHaveLength(0);
  });

  it('validation errors never echo the rejected value', async () => {
    const tooBig = await call('user-1', 'POST', 'routine-1/secrets', {
      name: 'API_KEY',
      value: `${SENTINEL}${'x'.repeat(9000)}`,
    });
    const nul = await call('user-1', 'POST', 'routine-1/secrets', {
      name: 'API_KEY',
      value: `${SENTINEL}\u0000`,
    });
    const badName = await call('user-1', 'POST', 'routine-1/secrets', {
      name: 'lower',
      value: SENTINEL,
    });
    const reserved = await call('user-1', 'POST', 'routine-1/secrets', {
      name: 'NODE_OPTIONS',
      value: SENTINEL,
    });
    for (const response of [tooBig, nul, badName, reserved]) {
      expect(response.status).toBe(400);
      expect(response.text).not.toContain(SENTINEL);
    }
    expect(
      (await call('user-1', 'PUT', 'routine-1/secrets/not_valid', { value: 'v' })).status,
    ).toBe(400);
  });

  it('refuses secrets on a shell-command routine with 400', async () => {
    const response = await call('user-1', 'POST', 'cmd-1/secrets', { name: 'K', value: 'v' });
    expect(response.status).toBe(400);
  });

  it('the opt-in flag is set through the policy route and shows in the list', async () => {
    expect(
      (await call('user-1', 'PUT', 'routine-1/secrets-policy', { webhookRunsReceiveSecrets: true }))
        .status,
    ).toBe(200);
    const listed = JSON.parse((await call('user-1', 'GET', 'routine-1/secrets')).text) as {
      webhookRunsReceiveSecrets: boolean;
    };
    expect(listed.webhookRunsReceiveSecrets).toBe(true);
  });

  it('every handler is an owner route: none is public, so the JWT guard applies', () => {
    const prototype = RoutineSecretController.prototype;
    for (const name of ['list', 'create', 'replace', 'remove', 'setPolicy'] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, prototype[name])).not.toBe(true);
      expect(Reflect.getMetadata('__guards__', prototype[name])).toBeUndefined();
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, RoutineSecretController)).not.toBe(true);
  });
});
