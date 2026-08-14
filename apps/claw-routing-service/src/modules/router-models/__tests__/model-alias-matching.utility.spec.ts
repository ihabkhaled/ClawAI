import { RouterProvider } from '../../../generated/prisma';
import type { AliasMatchCandidate } from '../types/model-discovery.types';
import {
  matchAliasToDeployment,
  normalizeModelId,
} from '../utilities/model-alias-matching.utility';

const candidate = (
  providerModelId: string,
  provider: RouterProvider = RouterProvider.GEMINI,
  deploymentId = 'dep_1',
): AliasMatchCandidate => ({ deploymentId, provider, providerModelId });

describe('normalizeModelId', () => {
  // Gemini returns `models/gemini-2.5-flash` where a chain entry is written
  // `gemini-2.5-flash`. Raw comparison would miss a model that plainly exists.
  it.each([
    ['models/gemini-2.5-flash', 'gemini-2.5-flash'],
    ['model/gemini-2.5-pro', 'gemini-2.5-pro'],
    ['gemini-2.5-flash', 'gemini-2.5-flash'],
  ])('strips a path prefix: %s', (raw, expected) => {
    expect(normalizeModelId(raw)).toBe(expected);
  });

  it('is case and whitespace insensitive', () => {
    expect(normalizeModelId('  Models/Gemini-2.5-Flash  ')).toBe('gemini-2.5-flash');
  });

  // These suffixes change WHICH model is meant, so removing them would resolve
  // an alias to a different endpoint.
  it.each(['gemini-2.0-flash-001', 'qwen3:1.7b', 'gpt-oss:20b'])(
    'preserves the meaningful suffix in %s',
    (raw) => {
      expect(normalizeModelId(raw)).toBe(raw);
    },
  );

  // connector-service lists the hosted Ollama catalogue bare (`gpt-oss:120b`)
  // while the chain writes it decorated (`gpt-oss:120b-cloud`). Both name the
  // same endpoint, because that connector serves only ollama.com.
  it.each([
    ['gpt-oss:120b-cloud', 'gpt-oss:120b'],
    ['glm-4.7:cloud', 'glm-4.7'],
  ])('drops the cloud marker for OLLAMA_CLOUD: %s', (raw, expected) => {
    expect(normalizeModelId(raw, RouterProvider.OLLAMA_CLOUD)).toBe(expected);
  });

  // For the local runtime the same marker would erase a real distinction.
  it('keeps the cloud marker for every other provider', () => {
    expect(normalizeModelId('gpt-oss:120b-cloud', RouterProvider.OLLAMA)).toBe(
      'gpt-oss:120b-cloud',
    );
    expect(normalizeModelId('something-cloud', RouterProvider.GEMINI)).toBe('something-cloud');
  });
});

describe('matchAliasToDeployment', () => {
  it('matches through prefix decoration', () => {
    const match = matchAliasToDeployment('gemini-2.5-flash', RouterProvider.GEMINI, [
      candidate('models/gemini-2.5-flash'),
    ]);

    expect(match?.deploymentId).toBe('dep_1');
  });

  it('matches an exact id', () => {
    const match = matchAliasToDeployment('glm-4.7:cloud', RouterProvider.OLLAMA_CLOUD, [
      candidate('glm-4.7:cloud', RouterProvider.OLLAMA_CLOUD, 'dep_ollama'),
    ]);

    expect(match?.deploymentId).toBe('dep_ollama');
  });

  // The pack seeds gemini-3.5-flash-lite; this installation's Gemini connector
  // has no such model. Substituting the nearest one would leave the admin page
  // showing a chain that is not the one running.
  it('returns null rather than substituting a near neighbour', () => {
    const match = matchAliasToDeployment('gemini-3.5-flash-lite', RouterProvider.GEMINI, [
      candidate('models/gemini-2.5-flash'),
      candidate('models/gemini-2.0-flash-lite', RouterProvider.GEMINI, 'dep_2'),
      candidate('models/gemini-2.5-pro', RouterProvider.GEMINI, 'dep_3'),
    ]);

    expect(match).toBeNull();
  });

  it('never matches across providers', () => {
    const match = matchAliasToDeployment('glm-4.7:cloud', RouterProvider.GEMINI, [
      candidate('glm-4.7:cloud', RouterProvider.OLLAMA_CLOUD),
    ]);

    expect(match).toBeNull();
  });

  // Real case from this installation: the chain writes gpt-oss:120b-cloud and
  // the catalogue lists gpt-oss:120b.
  it('matches a decorated cloud alias to the bare hosted id', () => {
    const match = matchAliasToDeployment('gpt-oss:120b-cloud', RouterProvider.OLLAMA_CLOUD, [
      candidate('gpt-oss:120b', RouterProvider.OLLAMA_CLOUD, 'dep_oss'),
    ]);

    expect(match?.deploymentId).toBe('dep_oss');
  });

  // Also real: the chain asks for glm-4.7 and the catalogue has glm-5.2. That
  // is version drift, not decoration, and must stay unresolved for an admin to
  // see rather than be silently upgraded.
  it('does not resolve a drifted version to a newer one', () => {
    const match = matchAliasToDeployment('glm-4.7:cloud', RouterProvider.OLLAMA_CLOUD, [
      candidate('glm-5.1', RouterProvider.OLLAMA_CLOUD, 'dep_51'),
      candidate('glm-5.2', RouterProvider.OLLAMA_CLOUD, 'dep_52'),
    ]);

    expect(match).toBeNull();
  });

  // Same marker, different provider: the local runtime's id is not the hosted one.
  it('does not strip the cloud marker for the local runtime', () => {
    expect(
      matchAliasToDeployment('gpt-oss:120b-cloud', RouterProvider.OLLAMA, [
        candidate('gpt-oss:120b', RouterProvider.OLLAMA, 'dep_local'),
      ]),
    ).toBeNull();
  });

  it('returns null against an empty catalogue', () => {
    expect(matchAliasToDeployment('anything', RouterProvider.GEMINI, [])).toBeNull();
  });

  it('picks the candidate for the requested provider when ids collide', () => {
    const match = matchAliasToDeployment('shared-model', RouterProvider.OLLAMA_CLOUD, [
      candidate('shared-model', RouterProvider.GEMINI, 'dep_gemini'),
      candidate('shared-model', RouterProvider.OLLAMA_CLOUD, 'dep_ollama'),
    ]);

    expect(match?.deploymentId).toBe('dep_ollama');
  });
});
