import { vi } from 'vitest';

import type { ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import { ModelUnavailableService } from '../model-unavailable.service';

describe('ModelUnavailableService (ADR-151)', () => {
  function build(retired = 0) {
    const repo = { recordUnavailable: vi.fn().mockResolvedValue({ counted: 1, retired }) };
    return {
      repo,
      service: new ModelUnavailableService(repo as unknown as ConnectorModelsRepository),
    };
  }

  it('counts the report against every catalog spelling of the model', async () => {
    const { repo, service } = build();
    await expect(service.record({ provider: 'GEMINI', model: 'gemini-x' })).resolves.toEqual({
      counted: 1,
      retired: 0,
    });
    expect(repo.recordUnavailable).toHaveBeenCalledWith('GEMINI', ['gemini-x', 'models/gemini-x']);
  });

  it('reports a retirement', async () => {
    const { service } = build(1);
    await expect(service.record({ provider: 'OPENAI', model: 'gpt-5-chat-latest' })).resolves.toEqual(
      { counted: 1, retired: 1 },
    );
  });

  it('ignores a provider outside the connector enum instead of throwing', async () => {
    const { repo, service } = build();
    await expect(service.record({ provider: 'local-ollama', model: 'm' })).resolves.toEqual({
      counted: 0,
      retired: 0,
    });
    expect(repo.recordUnavailable).not.toHaveBeenCalled();
  });
});
