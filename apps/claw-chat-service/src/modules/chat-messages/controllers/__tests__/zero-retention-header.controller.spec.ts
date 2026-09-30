import { type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runtimeV2Sha256 } from '../../utilities/runtime-v2-identity.utility';
import { ChatMessagesService } from '../../services/chat-messages.service';
import { FileDeliveryRecordService } from '../../services/file-delivery-record.service';
import { RuntimeV2RunService } from '../../services/runtime-v2-run.service';
import { ChatMessagesController } from '../chat-messages.controller';
import { RuntimeV2RunController } from '../runtime-v2-run.controller';

/**
 * F055: `X-Claw-Zero-Retention: 1` reaches the one service call of both
 * content-creating entry points as a request-scoped boolean — over real HTTP,
 * so the header name, its casing and the decorator are all exercised.
 */
const toolDefinitions = [
  {
    schemaVersion: '2.0',
    name: 'workspace.read',
    version: '1.0.0',
    description: 'Read a bounded fixture.',
    operations: ['read'],
    riskClasses: ['inspect'],
    targetIds: ['runtime_target_00001'],
    inputSchema: { type: 'object', additionalProperties: false },
  },
];
const runtimeStart = {
  schemaVersion: '2.0',
  threadId: 'runtime_thread_00001',
  clientRequestId: 'runtime_request_00001',
  idempotencyKey: 'runtime_idempotency_1',
  prompt: 'Inspect the safe fixture.',
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: runtimeV2Sha256(JSON.stringify(toolDefinitions)),
  toolDefinitions,
  provider: 'OLLAMA',
  model: 'qwen3:1.7b',
  epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
  budget: {
    maxModelTurns: 4,
    maxToolCalls: 4,
    maxToolRounds: 2,
    maxRepairAttempts: 1,
    maxRuntimeMs: 60_000,
    maxOutputBytes: 65_536,
    maxToolResultBytes: 32_768,
  },
};

describe('zero-retention header on content-creating routes', () => {
  let app: INestApplication;
  let baseUrl: string;
  const createMessage = vi.fn(async () => ({ id: 'msg-1' }));
  const startRun = vi.fn(async () => ({ runId: 'run-1' }));

  beforeEach(async () => {
    createMessage.mockClear();
    startRun.mockClear();
    const moduleReference = await Test.createTestingModule({
      controllers: [ChatMessagesController, RuntimeV2RunController],
      providers: [
        { provide: ChatMessagesService, useValue: { createMessage } },
        { provide: FileDeliveryRecordService, useValue: {} },
        { provide: RuntimeV2RunService, useValue: { start: startRun } },
      ],
    }).compile();
    const expressApp = moduleReference.createNestApplication<NestExpressApplication>();
    // Stands in for the global auth guard, which sets the caller.
    expressApp.use((request: object, _response: unknown, next: () => void) => {
      Reflect.set(request, 'user', { id: 'user-1' });
      next();
    });
    await expressApp.listen(0, '127.0.0.1');
    app = expressApp;
    baseUrl = await expressApp.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  async function post(
    path: string,
    body: object,
    headers: Record<string, string>,
  ): Promise<number> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t', ...headers },
      body: JSON.stringify(body),
    });
    return response.status;
  }

  it('passes true to a chat send that carries the header', async () => {
    const status = await post(
      '/chat-messages',
      { threadId: 'thread-1', content: 'hello' },
      { 'X-Claw-Zero-Retention': '1' },
    );

    expect(status).toBe(201);
    expect(createMessage).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ threadId: 'thread-1' }),
      't',
      true,
    );
  });

  it('passes false to a chat send without it, or with any other value', async () => {
    await post('/chat-messages', { threadId: 'thread-1', content: 'hello' }, {});
    await post(
      '/chat-messages',
      { threadId: 'thread-1', content: 'hello' },
      { 'X-Claw-Zero-Retention': '0' },
    );

    expect(createMessage.mock.calls.map((call) => call.at(3))).toEqual([false, false]);
  });

  it('passes the flag to a Runtime V2 start', async () => {
    expect(
      await post('/chat-messages/runtime/runs', runtimeStart, { 'x-claw-zero-retention': '1' }),
    ).toBe(201);
    expect(await post('/chat-messages/runtime/runs', runtimeStart, {})).toBe(201);

    expect(startRun.mock.calls.map((call) => [call.at(0), call.at(2)])).toEqual([
      ['user-1', true],
      ['user-1', false],
    ]);
  });
});
