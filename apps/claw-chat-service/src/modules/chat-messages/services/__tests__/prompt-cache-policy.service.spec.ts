import { vi } from 'vitest';

import type { ModelCapabilityClient } from '../../clients/model-capability.client';
import { PromptCachePolicyService } from '../prompt-cache-policy.service';

function service(enabled: boolean): {
  policy: PromptCachePolicyService;
  resolvePromptCaching: ReturnType<typeof vi.fn>;
} {
  const resolvePromptCaching = vi.fn().mockResolvedValue(enabled);
  return {
    policy: new PromptCachePolicyService({
      resolvePromptCaching,
    } as unknown as ModelCapabilityClient),
    resolvePromptCaching,
  };
}

const ARGS = {
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  carriesTools: false,
  holdSuppliedByCaller: false,
};

describe('PromptCachePolicyService', () => {
  it('caches an Anthropic model the catalog switched on', async () => {
    const { policy, resolvePromptCaching } = service(true);
    await expect(policy.shouldCache(ARGS)).resolves.toBe(true);
    expect(resolvePromptCaching).toHaveBeenCalledWith('ANTHROPIC', 'claude-sonnet-4');
  });

  it('does not cache when the switch is off', async () => {
    await expect(service(false).policy.shouldCache(ARGS)).resolves.toBe(false);
  });

  it('never even reads the catalog for another provider', async () => {
    const { policy, resolvePromptCaching } = service(true);
    await expect(policy.shouldCache({ ...ARGS, provider: 'OPENAI' })).resolves.toBe(false);
    expect(resolvePromptCaching).not.toHaveBeenCalled();
  });

  it('respects the tool and caller-hold refusals', async () => {
    const { policy } = service(true);
    await expect(policy.shouldCache({ ...ARGS, carriesTools: true })).resolves.toBe(false);
    await expect(policy.shouldCache({ ...ARGS, holdSuppliedByCaller: true })).resolves.toBe(false);
  });
});
