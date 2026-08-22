import { createHmac } from 'node:crypto';

import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WEBHOOK_REJECTION_CODES } from '../../constants/webhook-receiver.constants';
import type { WebhookDeliveryRepository } from '../../repositories/webhook-delivery.repository';
import { WebhookReceiverManager } from '../webhook-receiver.manager';
import type { WebhookRateLimiterManager } from '../webhook-rate-limiter.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { WebhookDelivery } from '../../../../generated/prisma';

const GITHUB_SECRET = 'githubsecret';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WEBHOOK_BODY_MAX_BYTES: 1_048_576,
  GITHUB_WEBHOOK_SECRET: GITHUB_SECRET,
  GITLAB_WEBHOOK_SECRET: '',
  BITBUCKET_WEBHOOK_SECRET: '',
  JIRA_WEBHOOK_SECRET: '',
  SLACK_SIGNING_SECRET: '',
  FIGMA_WEBHOOK_SECRET: '',
} as unknown as ReturnType<typeof AppConfig.get>);

function githubHeaders(body: Buffer, deliveryId = 'gh-delivery-1', event = 'push') {
  const sig = `sha256=${createHmac('sha256', GITHUB_SECRET).update(body).digest('hex')}`;
  return {
    'x-hub-signature-256': sig,
    'x-github-event': event,
    'x-github-delivery': deliveryId,
  };
}

function mockRow(overrides: Partial<WebhookDelivery> = {}): WebhookDelivery {
  return {
    id: 'row-1',
    connectorId: null,
    provider: WorkspaceProvider.GITHUB,
    externalDeliveryId: null,
    eventType: null,
    signatureValid: true,
    signature: null,
    rawPayload: {},
    processedAt: null,
    errorMessage: null,
    ipAddress: null,
    bodyBytes: 0,
    createdAt: new Date(),
    ...overrides,
  } as unknown as WebhookDelivery;
}

describe('WebhookReceiverManager', () => {
  let manager: WebhookReceiverManager;
  let repo: jest.Mocked<
    Pick<WebhookDeliveryRepository, 'create' | 'findByExternalId' | 'findById' | 'markProcessed'>
  >;
  let rabbitmq: jest.Mocked<Pick<RabbitMQService, 'publish'>>;
  let rateLimiter: jest.Mocked<Pick<WebhookRateLimiterManager, 'tryReserve'>>;

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue(mockRow()),
      findByExternalId: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      markProcessed: jest.fn().mockResolvedValue(undefined),
    };
    rabbitmq = { publish: jest.fn().mockResolvedValue(undefined) };
    rateLimiter = { tryReserve: jest.fn().mockReturnValue(true) };
    manager = new WebhookReceiverManager(
      repo as unknown as WebhookDeliveryRepository,
      rabbitmq as unknown as RabbitMQService,
      rateLimiter as unknown as WebhookRateLimiterManager,
    );
  });

  describe('receive() — preflight rejections', () => {
    it('rejects a body over the configured max size before touching the verifier', async () => {
      const body = Buffer.alloc(2_000_000);
      const result = await manager.receive(WorkspaceProvider.GITHUB, null, body, {}, null);
      expect(result.status).toBe('REJECTED');
      if (result.status === 'REJECTED') {
        expect(result.reasonCode).toBe(WEBHOOK_REJECTION_CODES.BODY_TOO_LARGE);
      }
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          signatureValid: false,
          errorMessage: WEBHOOK_REJECTION_CODES.BODY_TOO_LARGE,
        }),
      );
    });

    it('rejects when the rate limiter refuses the connector', async () => {
      rateLimiter.tryReserve.mockReturnValue(false);
      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        'conn-1',
        Buffer.from('{}'),
        {},
        null,
      );
      expect(result.status).toBe('REJECTED');
      if (result.status === 'REJECTED') {
        expect(result.reasonCode).toBe(WEBHOOK_REJECTION_CODES.RATE_LIMITED);
      }
      expect(rateLimiter.tryReserve).toHaveBeenCalledWith('conn-1');
    });
  });

  describe('receive() — verification', () => {
    it('rejects a provider with no registered verifier', async () => {
      const result = await manager.receive(
        WorkspaceProvider.CLICKUP,
        null,
        Buffer.from('{}'),
        {},
        null,
      );
      expect(result.status).toBe('REJECTED');
      if (result.status === 'REJECTED') {
        expect(result.reasonCode).toBe(WEBHOOK_REJECTION_CODES.UNSUPPORTED_PROVIDER);
      }
    });

    it('rejects an invalid signature', async () => {
      const body = Buffer.from('{"ref":"refs/heads/main"}');
      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        null,
        body,
        { 'x-hub-signature-256': 'sha256=deadbeef' },
        null,
      );
      expect(result.status).toBe('REJECTED');
      if (result.status === 'REJECTED') {
        expect(result.reasonCode).toBe(WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID);
      }
    });
  });

  describe('receive() — dedup and body parsing', () => {
    it('returns IDEMPOTENT for a delivery id already stored', async () => {
      const body = Buffer.from('{"ref":"refs/heads/main"}');
      repo.findByExternalId.mockResolvedValue(mockRow({ id: 'existing-row' }));
      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        null,
        body,
        githubHeaders(body),
        null,
      );
      expect(result).toEqual({
        status: 'IDEMPOTENT',
        deliveryId: 'existing-row',
        signatureValid: true,
      });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a validly-signed but non-JSON body', async () => {
      const body = Buffer.from('not-json');
      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        null,
        body,
        githubHeaders(body),
        null,
      );
      expect(result.status).toBe('REJECTED');
      if (result.status === 'REJECTED') {
        expect(result.reasonCode).toBe(WEBHOOK_REJECTION_CODES.MALFORMED_BODY);
      }
    });
  });

  describe('receive() — happy path', () => {
    it('accepts a valid webhook, persists it, and publishes WORKSPACE_WEBHOOK_RECEIVED', async () => {
      const body = Buffer.from('{"ref":"refs/heads/main"}');
      repo.create.mockResolvedValue(
        mockRow({ id: 'new-row', externalDeliveryId: 'gh-delivery-1' }),
      );
      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        'conn-1',
        body,
        githubHeaders(body),
        '203.0.113.1',
      );
      expect(result).toEqual({ status: 'ACCEPTED', deliveryId: 'new-row', signatureValid: true });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'conn-1',
          provider: WorkspaceProvider.GITHUB,
          externalDeliveryId: 'gh-delivery-1',
          eventType: 'push',
          signatureValid: true,
          ipAddress: '203.0.113.1',
        }),
      );
      expect(rabbitmq.publish).toHaveBeenCalledWith(
        EventPattern.WORKSPACE_WEBHOOK_RECEIVED,
        expect.objectContaining({
          deliveryId: 'new-row',
          provider: WorkspaceProvider.GITHUB,
          connectorId: 'conn-1',
          externalDeliveryId: 'gh-delivery-1',
          eventType: 'push',
        }),
      );
    });
  });

  // Chaos: the delivery row is durably persisted before the event is published.
  // These tests inject a downstream RabbitMQ outage and confirm the manager's
  // documented fault-isolation contract — the webhook response to the external
  // provider must never depend on RabbitMQ being reachable — while making the
  // resulting event-loss explicit rather than an unverified assumption.
  describe('chaos — RabbitMQ unreachable during publish', () => {
    it('still returns ACCEPTED with the row persisted when publish rejects on the accept path', async () => {
      rabbitmq.publish.mockRejectedValue(new Error('ECONNREFUSED'));
      const body = Buffer.from('{"ref":"refs/heads/main"}');
      repo.create.mockResolvedValue(mockRow({ id: 'new-row' }));

      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        null,
        body,
        githubHeaders(body),
        null,
      );

      expect(result).toEqual({ status: 'ACCEPTED', deliveryId: 'new-row', signatureValid: true });
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('still returns REJECTED with the row persisted when publish rejects on the rejection path', async () => {
      rabbitmq.publish.mockRejectedValue(new Error('ECONNREFUSED'));
      repo.create.mockResolvedValue(mockRow({ id: 'rejected-row', signatureValid: false }));

      const result = await manager.receive(
        WorkspaceProvider.GITHUB,
        null,
        Buffer.from('{}'),
        { 'x-hub-signature-256': 'sha256=deadbeef' },
        null,
      );

      expect(result).toEqual({
        status: 'REJECTED',
        deliveryId: 'rejected-row',
        signatureValid: false,
        reasonCode: WEBHOOK_REJECTION_CODES.SIGNATURE_INVALID,
      });
    });
  });

  describe('replay()', () => {
    it('throws NotFoundException when the delivery does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(manager.replay('missing-id')).rejects.toMatchObject({
        response: { messageKey: 'WEBHOOK_DELIVERY_NOT_FOUND' },
      });
    });

    it('republishes WORKSPACE_WEBHOOK_REPLAYED and marks the delivery processed', async () => {
      repo.findById.mockResolvedValue(
        mockRow({
          id: 'row-1',
          provider: WorkspaceProvider.GITHUB,
          connectorId: 'conn-1',
          externalDeliveryId: 'gh-1',
        }),
      );

      const result = await manager.replay('row-1');

      expect(result).toEqual({ deliveryId: 'row-1' });
      expect(rabbitmq.publish).toHaveBeenCalledWith(
        EventPattern.WORKSPACE_WEBHOOK_REPLAYED,
        expect.objectContaining({
          deliveryId: 'row-1',
          provider: WorkspaceProvider.GITHUB,
          connectorId: 'conn-1',
          externalDeliveryId: 'gh-1',
        }),
      );
      expect(repo.markProcessed).toHaveBeenCalledWith('row-1');
    });

    // Chaos / documented gap: replay() swallows a publish failure the same way
    // receive() does, but unlike receive() there is no durable "did this event
    // actually reach RabbitMQ" signal for an operator to inspect afterward —
    // the row is marked processed regardless of whether the republish
    // succeeded. See the Phase 15 gap-map entry: this is a real, deliberately
    // undeferred observability gap, not fixed in this slice.
    it('marks the delivery processed even when the republish itself fails', async () => {
      repo.findById.mockResolvedValue(mockRow({ id: 'row-1' }));
      rabbitmq.publish.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await manager.replay('row-1');

      expect(result).toEqual({ deliveryId: 'row-1' });
      expect(repo.markProcessed).toHaveBeenCalledWith('row-1');
    });
  });
});
