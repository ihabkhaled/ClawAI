import { describe, expect, it, type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { ConnectorsManager } from '../../managers/connectors.manager';
import type { ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import type { ConnectorsRepository } from '../../repositories/connectors.repository';
import { ConnectorsService } from '../connectors.service';

const DECISION_REASON = 'Google lists only: createDecision';

function build(kinds: Array<{ modelKey: string; kind: string; kindReason: string | null }>) {
  const connectors = { findById: vi.fn().mockResolvedValue({ id: 'c1' }) };
  const models = {
    findExposedKeys: vi.fn().mockResolvedValue([]),
    setExposure: vi.fn().mockResolvedValue({ updated: kinds.length }),
    findKinds: vi.fn().mockResolvedValue(kinds),
  };
  const rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
  const service = new ConnectorsService(
    connectors as unknown as ConnectorsRepository,
    models as unknown as ConnectorModelsRepository,
    {} as ConnectorsManager,
    rabbit as unknown as RabbitMQService,
  );
  return { service, models };
}

describe('ConnectorsService.setModelExposure non-chat warning', () => {
  it('allows exposing a TOOL model but names it in notInPicker with its reason', async () => {
    const { service } = build([
      { modelKey: 'models/gemini-decision-1', kind: 'TOOL', kindReason: DECISION_REASON },
      { modelKey: 'models/gemini-2.5-pro', kind: 'CHAT', kindReason: null },
      { modelKey: 'gpt-4o-mini-tts', kind: 'AUDIO', kindReason: null },
    ]);

    const result = await service.setModelExposure(
      'c1',
      ['models/gemini-decision-1', 'models/gemini-2.5-pro', 'gpt-4o-mini-tts'],
      true,
    );

    expect(result.updated).toBe(3);
    expect(result.notInPicker).toEqual([
      { modelKey: 'models/gemini-decision-1', kind: 'TOOL', kindReason: DECISION_REASON },
    ]);
  });

  it('does not look up kinds on an unexpose', async () => {
    const { service, models } = build([]);

    const result = await service.setModelExposure('c1', ['models/gemini-decision-1'], false);

    expect(result.notInPicker).toEqual([]);
    expect(models.findKinds as Mock).not.toHaveBeenCalled();
  });
});
