import { EventPattern } from '@claw/shared-types';

import { WorkspaceCanonicalEventType } from '../../../../common/enums/workspace-canonical-event-type.enum';
import { WorkspaceObjectType } from '../../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import type { WorkspaceEventProcessingStatus } from '../../../../generated/prisma';
import type { WebhookReceivedEvent } from '../../../suggestion-factory/types/webhook-event.types';
import type { WorkspaceEventRepository } from '../../repositories/workspace-event.repository';
import { WorkspaceEventMapperService } from '../../services/workspace-event-mapper.service';
import { WebhookIngestConsumer } from '../webhook-ingest.consumer';

function fakeStore(): {
  repo: WorkspaceEventRepository;
  rows: Array<{ id: string; idempotencyKey: string; provider: string }>;
} {
  const rows: Array<{ id: string; idempotencyKey: string; provider: string }> = [];
  let seq = 0;
  const repo = {
    createIfNew: jest.fn(
      async (input: {
        provider: string;
        idempotencyKey: string;
        eventType: string;
        connectorId: string | null;
        correlationId: string;
      }) => {
        const existing = rows.find(
          (r) => r.provider === input.provider && r.idempotencyKey === input.idempotencyKey,
        );
        if (existing !== undefined) {
          return {
            created: false,
            event: {
              id: existing.id,
              provider: input.provider,
              eventType: input.eventType,
              connectorId: input.connectorId,
              correlationId: input.correlationId,
              processingStatus: 'PENDING' as WorkspaceEventProcessingStatus,
            },
          };
        }
        seq += 1;
        const id = `evt-${seq}`;
        rows.push({ id, idempotencyKey: input.idempotencyKey, provider: input.provider });
        return {
          created: true,
          event: {
            id,
            provider: input.provider,
            eventType: input.eventType,
            connectorId: input.connectorId,
            correlationId: input.correlationId,
            processingStatus: 'PENDING' as WorkspaceEventProcessingStatus,
          },
        };
      },
    ),
  } as unknown as WorkspaceEventRepository;
  return { repo, rows };
}

function githubPrOpened(deliveryId: string): WebhookReceivedEvent {
  return {
    deliveryId,
    provider: WorkspaceProvider.GITHUB,
    connectorId: 'connector-1',
    externalDeliveryId: deliveryId,
    eventType: 'pull_request',
    body: {
      action: 'opened',
      pull_request: { number: 1, merged: false, updated_at: '2026-08-16T10:00:00Z' },
    },
    occurredAt: '2026-08-16T10:00:00Z',
  };
}

describe('WebhookIngestConsumer', () => {
  it('maps and persists a canonical event, then publishes WORKSPACE_EVENT_INGESTED', async () => {
    const { repo } = fakeStore();
    const publish = jest.fn().mockResolvedValue(undefined);
    const rabbitmq = { subscribe: jest.fn(), publish } as never;
    const consumer = new WebhookIngestConsumer(rabbitmq, new WorkspaceEventMapperService(), repo);

    await consumer.handle(githubPrOpened('delivery-1'));

    expect(repo.createIfNew).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      EventPattern.WORKSPACE_EVENT_INGESTED,
      expect.objectContaining({
        eventType: WorkspaceCanonicalEventType.PR_OPENED,
        provider: WorkspaceProvider.GITHUB,
      }),
    );
  });

  it('skips persistence entirely when the mapper has no canonical mapping for this delivery', async () => {
    const { repo } = fakeStore();
    const publish = jest.fn().mockResolvedValue(undefined);
    const rabbitmq = { subscribe: jest.fn(), publish } as never;
    const consumer = new WebhookIngestConsumer(rabbitmq, new WorkspaceEventMapperService(), repo);

    await consumer.handle({
      deliveryId: 'd2',
      provider: WorkspaceProvider.GITHUB,
      connectorId: 'c1',
      externalDeliveryId: 'd2',
      eventType: 'push',
      body: { ref: 'refs/heads/main' },
      occurredAt: '2026-08-16T10:00:00Z',
    });

    expect(repo.createIfNew).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('duplicate delivery: handling the same webhook event twice creates exactly one WorkspaceEvent and publishes exactly once', async () => {
    const { repo } = fakeStore();
    const publish = jest.fn().mockResolvedValue(undefined);
    const rabbitmq = { subscribe: jest.fn(), publish } as never;
    const consumer = new WebhookIngestConsumer(rabbitmq, new WorkspaceEventMapperService(), repo);

    const event = githubPrOpened('delivery-dup');
    await consumer.handle(event);
    await consumer.handle(event); // simulates RabbitMQ at-least-once redelivery or a manual replay

    expect(repo.createIfNew).toHaveBeenCalledTimes(2); // both attempts reach the repo...
    expect(publish).toHaveBeenCalledTimes(1); // ...but only the first actually creates a row and republishes
  });

  it('out-of-order delivery: two distinct deliveries for the same resource, processed in reverse chronological order, both persist as separate correctly-typed events', async () => {
    const { repo } = fakeStore();
    const publish = jest.fn().mockResolvedValue(undefined);
    const rabbitmq = { subscribe: jest.fn(), publish } as never;
    const consumer = new WebhookIngestConsumer(rabbitmq, new WorkspaceEventMapperService(), repo);

    const openedLater: WebhookReceivedEvent = {
      deliveryId: 'delivery-opened',
      provider: WorkspaceProvider.GITHUB,
      connectorId: 'c1',
      externalDeliveryId: 'delivery-opened',
      eventType: 'pull_request',
      body: {
        action: 'opened',
        pull_request: { number: 9, merged: false, updated_at: '2026-08-16T09:00:00Z' },
      },
      occurredAt: '2026-08-16T09:00:00Z',
    };
    const updatedArrivesFirst: WebhookReceivedEvent = {
      deliveryId: 'delivery-updated',
      provider: WorkspaceProvider.GITHUB,
      connectorId: 'c1',
      externalDeliveryId: 'delivery-updated',
      eventType: 'pull_request',
      body: {
        action: 'synchronize',
        pull_request: { number: 9, updated_at: '2026-08-16T10:00:00Z' },
      },
      occurredAt: '2026-08-16T10:00:00Z',
    };

    // Network/queue timing means the "updated" delivery is handled before
    // the earlier "opened" delivery for the same PR.
    await consumer.handle(updatedArrivesFirst);
    await consumer.handle(openedLater);

    expect(repo.createIfNew).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenNthCalledWith(
      1,
      EventPattern.WORKSPACE_EVENT_INGESTED,
      expect.objectContaining({ eventType: WorkspaceCanonicalEventType.PR_UPDATED }),
    );
    expect(publish).toHaveBeenNthCalledWith(
      2,
      EventPattern.WORKSPACE_EVENT_INGESTED,
      expect.objectContaining({ eventType: WorkspaceCanonicalEventType.PR_OPENED }),
    );
  });

  it('derives resourceType/resourceExternalId from the mapping onto the persisted event input', async () => {
    const { repo } = fakeStore();
    const rabbitmq = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    } as never;
    const consumer = new WebhookIngestConsumer(rabbitmq, new WorkspaceEventMapperService(), repo);

    await consumer.handle(githubPrOpened('delivery-shape'));

    expect(repo.createIfNew).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: WorkspaceObjectType.PULL_REQUEST,
        resourceExternalId: '1',
        sourceDeliveryId: 'delivery-shape',
        correlationId: 'delivery-shape',
      }),
    );
  });
});
