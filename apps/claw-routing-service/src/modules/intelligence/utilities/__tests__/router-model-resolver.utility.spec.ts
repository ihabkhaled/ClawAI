import { type InstalledModelInfo } from '../../../routing/types/installed-model.types';
import { resolveRouterModel } from '../router-model-resolver.utility';

function installed(...names: string[]): InstalledModelInfo[] {
  return names.map((name) => ({
    name,
    tag: 'latest',
    category: null,
    roles: [],
    capabilities: [],
    parameterCount: null,
  })) as InstalledModelInfo[];
}

describe('resolveRouterModel', () => {
  it('honours a pinned model the connector actually has', () => {
    // An operator who pinned a model meant it.
    expect(resolveRouterModel('glm-5.2', installed('deepseek-v4-pro', 'glm-5.2'))).toBe('glm-5.2');
  });

  it('matches regardless of the tag the connector reports', () => {
    // kimi-k2.7-code:cloud and kimi-k2.7-code:latest are the same model; the
    // tag is a deployment detail.
    expect(resolveRouterModel('kimi-k2.7-code', installed('kimi-k2.7-code:cloud'))).toBe(
      'kimi-k2.7-code:cloud',
    );
  });

  it('falls to the preference order when the pinned model is absent', () => {
    // The old behaviour here was every route plan failing until somebody
    // noticed the env var pointed at a model nobody had pulled.
    expect(resolveRouterModel('not-installed', installed('gpt-oss:20b', 'deepseek-v4-pro'))).toBe(
      'deepseek-v4-pro',
    );
  });

  it('takes anything installed rather than nothing', () => {
    // A worse planner still beats no planner — a failed plan falls back to
    // deterministic routing, which is strictly less informed.
    expect(resolveRouterModel('not-installed', installed('some-unknown-model'))).toBe(
      'some-unknown-model',
    );
  });

  it('returns the configured name when the inventory is empty', () => {
    // Inventing a model name would turn an inventory outage into a confusing
    // wrong-model error. Let the call fail honestly.
    expect(resolveRouterModel('deepseek-v4-pro', installed())).toBe('deepseek-v4-pro');
  });
});
