import { describe, expect, it, type Mock, vi } from 'vitest';
import type { ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import type { ModelEventsRepository } from '../../repositories/model-events.repository';
import type { RoutingVisibilityManager } from '../../managers/routing-visibility.manager';
import type { ModelVisibilityRow } from '../../types/connectors.types';
import { ModelVisibilityService } from '../model-visibility.service';

const decisionRow = (overrides: Partial<ModelVisibilityRow> = {}): ModelVisibilityRow => ({
  connectorId: 'c1',
  provider: 'GEMINI',
  modelKey: 'models/gemini-decision-1',
  displayName: 'Gemini Decision 1',
  kind: 'TOOL',
  kindReason: 'Google lists only: createDecision',
  exposure: 'EXPOSED',
  lifecycle: 'ACTIVE',
  connector: { name: 'Gemini', isEnabled: true, providerDefinition: null },
  ...overrides,
});

function build(rows: ModelVisibilityRow[], routing: unknown) {
  const models = { findForVisibility: vi.fn().mockResolvedValue(rows) };
  const events = {
    findRecent: vi.fn().mockResolvedValue([
      {
        type: 'KIND_CHANGED',
        beforeKind: 'CHAT',
        afterKind: 'TOOL',
        beforeExposure: 'EXPOSED',
        afterExposure: 'UNEXPOSED',
        reason: 'Google lists only: createDecision',
        createdAt: new Date('2026-11-22T19:14:00Z'),
      },
    ]),
  };
  const routingClient = { fetch: vi.fn().mockResolvedValue(routing) };
  const service = new ModelVisibilityService(
    models as unknown as ConnectorModelsRepository,
    events as unknown as ModelEventsRepository,
    routingClient as unknown as RoutingVisibilityManager,
  );
  return { service, models, events, routingClient };
}

describe('ModelVisibilityService.diagnose', () => {
  it('explains an exposed TOOL model: KIND_CHAT and registry fail, with the sync trail', async () => {
    const { service, models, routingClient } = build([decisionRow()], {
      inRegistry: false,
      lifecycle: null,
      isRouterOnly: null,
      costClass: null,
    });

    const report = await service.diagnose('GEMINI', 'gemini-decision-1');

    expect((models.findForVisibility as Mock).mock.calls[0]?.[1]).toContain(
      'models/gemini-decision-1',
    );
    expect(routingClient.fetch).toHaveBeenCalledWith('GEMINI', 'models/gemini-decision-1');
    expect(report.visibleInPicker).toBe(false);
    expect(report.firstFailingGate).toBe('KIND_CHAT');
    expect(report.model).toMatchObject({
      kind: 'TOOL',
      exposure: 'EXPOSED',
      connectorName: 'Gemini',
    });
    expect(report.gates.map((g) => g.gate)).toEqual([
      'EXISTS',
      'CONNECTOR_ENABLED',
      'LIFECYCLE_ACTIVE',
      'EXPOSED',
      'KIND_CHAT',
      'IN_ROUTING_REGISTRY',
      'NOT_ROUTER_ONLY',
      'PRICED',
    ]);
    expect(report.recentEvents[0]).toMatchObject({ type: 'KIND_CHANGED', afterKind: 'TOOL' });
  });

  it('judges the most visible row when the model sits on several connectors', async () => {
    const disabled = decisionRow({
      connectorId: 'c0',
      kind: 'CHAT',
      connector: { name: 'Old', isEnabled: false, providerDefinition: null },
    });
    const live = decisionRow({ connectorId: 'c2', kind: 'CHAT' });
    const { service } = build([disabled, live], {
      inRegistry: true,
      lifecycle: 'ACTIVE',
      isRouterOnly: false,
      costClass: 'STANDARD',
    });

    const report = await service.diagnose('GEMINI', 'models/gemini-decision-1');

    expect(report.model?.connectorId).toBe('c2');
    expect(report.visibleInPicker).toBe(true);
  });

  it('reports EXISTS failed and no events when no row matches', async () => {
    const { service, events } = build([], null);

    const report = await service.diagnose('GEMINI', 'nope');

    expect(report.model).toBeNull();
    expect(report.firstFailingGate).toBe('EXISTS');
    expect(report.recentEvents).toEqual([]);
    expect(events.findRecent).not.toHaveBeenCalled();
  });
});
