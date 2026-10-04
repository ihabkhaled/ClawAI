import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { ThreadSnapshotInternalController } from '../thread-snapshot-internal.controller';
import { ThreadSnapshotService } from '../../services/thread-snapshot.service';

describe('ThreadSnapshotInternalController HTTP contract', () => {
  let app: INestApplication;
  const createSnapshot = vi.fn();

  beforeEach(async () => {
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'snapshot-integration-token-1234567890');
    vi.stubEnv('CHAT_DATABASE_URL', 'postgresql://unused');
    vi.stubEnv('REDIS_URL', 'redis://unused');
    vi.stubEnv('RABBITMQ_URL', 'amqp://unused');
    vi.stubEnv('JWT_SECRET', 'j'.repeat(40));
    AppConfig.validate();
    createSnapshot.mockResolvedValue({
      schemaVersion: 1,
      sourceThreadId: 'thread-fixture',
      title: null,
      sourceCreatedAt: '2026-10-01T10:00:00.000Z',
      messageCount: 0,
      byteCount: 0,
      sha256: 'a'.repeat(64),
      messages: [],
    });
    const module = await Test.createTestingModule({
      controllers: [ThreadSnapshotInternalController],
      providers: [{ provide: ThreadSnapshotService, useValue: { create: createSnapshot } }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('requires the service token and invokes the owner-scoped snapshot service', async () => {
    const address = app.getHttpServer().address() as { port: number };
    const url = `http://127.0.0.1:${String(address.port)}/api/v1/internal/thread-snapshots/thread-fixture`;
    const denied = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'owner-fixture' }),
    });
    const accepted = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Service snapshot-integration-token-1234567890',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'owner-fixture' }),
    });

    expect(denied.status).toBe(401);
    expect(accepted.status).toBe(201);
    expect(createSnapshot).toHaveBeenCalledWith('owner-fixture', 'thread-fixture');
  });
});
