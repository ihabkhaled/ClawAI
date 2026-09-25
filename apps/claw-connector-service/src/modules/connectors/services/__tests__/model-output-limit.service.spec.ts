import { vi } from 'vitest';

import type { ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import { ModelOutputLimitService } from '../model-output-limit.service';

describe('ModelOutputLimitService', () => {
  function build(count = 1) {
    const repo = { lowerLearnedMaxOutputTokens: vi.fn().mockResolvedValue(count) };
    return {
      repo,
      service: new ModelOutputLimitService(repo as unknown as ConnectorModelsRepository),
    };
  }

  it('lowers the learned ceiling for every catalog spelling of the model', async () => {
    const { repo, service } = build();
    await expect(
      service.recordLearned({ provider: 'GEMINI', model: 'gemini-3.5-pro', maxOutputTokens: 8192 }),
    ).resolves.toEqual({ updated: 1 });
    expect(repo.lowerLearnedMaxOutputTokens).toHaveBeenCalledWith(
      'GEMINI',
      ['gemini-3.5-pro', 'models/gemini-3.5-pro'],
      8192,
    );
  });

  it('ignores a provider outside the connector enum instead of throwing', async () => {
    const { repo, service } = build();
    await expect(
      service.recordLearned({ provider: 'local-ollama', model: 'm', maxOutputTokens: 10 }),
    ).resolves.toEqual({ updated: 0 });
    expect(repo.lowerLearnedMaxOutputTokens).not.toHaveBeenCalled();
  });
});
