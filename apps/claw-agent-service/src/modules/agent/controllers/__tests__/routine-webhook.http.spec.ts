import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../../../../app/filters/global-exception.filter';
import { deriveRoutineWebhookSecret } from '../../../../common/utilities/routine-webhook-secret.utility';
import { ChannelKeyring } from '../../../channels/services/channel-keyring';
import { signChannelPayload } from '../../../channels/utilities/channel-signature.utility';
import { RoutineWebhookService } from '../../services/routine-webhook.service';
import { RoutineWebhookRateStore } from '../../services/routine-webhook.ports';
import { RoutineWebhookController } from '../routine-webhook.controller';
import type { RemoteTriggerService } from '../../services/remote-trigger.service';
import type { ScheduledCommandRepository } from '../../repositories/scheduled-command.repository';
import type { ScheduledCommand } from '../../../../generated/prisma';

/**
 * The route over real HTTP: Nest keeps the exact request bytes (`rawBody`), the
 * HMAC is checked over them, and a refusal is a 401 with the documented code.
 * Auth guards are not installed here; the receiver is `@Public()`, which the
 * controller spec asserts.
 */
const KEY = 'd'.repeat(64);
const ROUTINE = {
  id: 'routine-http',
  userId: 'user-1',
  kind: 'PROMPT',
  status: 'ENABLED',
  webhookEnabled: true,
  webhookSecretVersion: 0,
} as ScheduledCommand;

class FixedKeyring extends ChannelKeyring {
  masterKey(): string {
    return KEY;
  }

  publicOrigin(): string {
    return 'https://claw.test';
  }
}

class OpenRateStore extends RoutineWebhookRateStore {
  claim(): Promise<boolean> {
    return Promise.resolve(true);
  }

  release(): Promise<void> {
    return Promise.resolve();
  }
}

describe('routine webhook over HTTP (F099)', () => {
  let app: INestApplication;
  let base = '';
  const trigger = {
    trigger: vi.fn().mockResolvedValue({ command: { id: 'cmd-http' }, replayed: false }),
  };

  beforeAll(async () => {
    const repo = { findById: vi.fn().mockResolvedValue(ROUTINE) };
    const service = new RoutineWebhookService(
      repo as unknown as ScheduledCommandRepository,
      new FixedKeyring(),
      new OpenRateStore(),
      trigger as unknown as RemoteTriggerService,
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [RoutineWebhookController],
      providers: [{ provide: RoutineWebhookService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true, logger: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function post(body: string, signature: string, timestamp: string) {
    return fetch(`${base}/agent/routines/webhook/routine-http`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-claw-signature': signature,
        'x-claw-timestamp': timestamp,
      },
      body,
    });
  }

  const nowSeconds = (): string => String(Math.floor(Date.now() / 1_000));
  const sign = (body: string, ts: string): string =>
    signChannelPayload(deriveRoutineWebhookSecret(KEY, ROUTINE.id, 0), ts, body);

  it('accepts a delivery signed over the exact bytes sent, whitespace included', async () => {
    const body = '{ "ref" : "refs/heads/main" }\n';
    const ts = nowSeconds();
    const response = await post(body, sign(body, ts), ts);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: true,
      commandId: 'cmd-http',
      replayed: false,
    });
    expect(trigger.trigger).toHaveBeenCalledWith('user-1', 'routine-http', expect.any(String));
  });

  it('answers 401 with the documented code when the body is not what was signed', async () => {
    const ts = nowSeconds();
    const before = trigger.trigger.mock.calls.length;
    const response = await post('{"ref":"x"}', sign('{"ref":"y"}', ts), ts);
    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).toContain('routine_webhook_signature_invalid');
    expect(trigger.trigger.mock.calls.length).toBe(before);
  });
});
