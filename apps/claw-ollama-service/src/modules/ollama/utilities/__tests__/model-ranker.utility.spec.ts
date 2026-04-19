import { rankDiscoveredModels } from '../model-ranker.utility';

type TestModel = {
  name: string;
  tag: string;
  familyName: string | null;
  sizeBytes: bigint | null;
  capabilities: string[];
};

describe('rankDiscoveredModels', () => {
  const buildModel = (overrides: Partial<TestModel> = {}): TestModel => ({
    name: 'qwen3',
    tag: '1.7b',
    familyName: 'qwen',
    sizeBytes: 1_000_000_000n,
    capabilities: [],
    ...overrides,
  });

  it('ranks well-known families higher than unknown', () => {
    const known = buildModel({ familyName: 'qwen' });
    const unknown = buildModel({ familyName: null, name: 'obscure' });
    const result = rankDiscoveredModels([unknown, known]);
    expect(result[0]).toBe(known);
  });

  it('ranks models with more capabilities higher', () => {
    const rich = buildModel({
      capabilities: ['code_generation', 'reasoning', 'tool_use'],
    });
    const poor = buildModel({ capabilities: [], name: 'other', tag: 'latest' });
    const result = rankDiscoveredModels([poor, rich]);
    expect(result[0]).toBe(rich);
  });

  it('penalizes absurdly large models with no clear benefit', () => {
    const huge = buildModel({ sizeBytes: 200_000_000_000n, name: 'giant' });
    const normal = buildModel({ sizeBytes: 10_000_000_000n });
    const result = rankDiscoveredModels([huge, normal]);
    expect(result[0]).toBe(normal);
  });

  it('does not crash on empty array', () => {
    expect(rankDiscoveredModels([])).toEqual([]);
  });

  it('handles null sizeBytes gracefully', () => {
    const a = buildModel({ sizeBytes: null, name: 'a' });
    const b = buildModel({ sizeBytes: null, name: 'b' });
    const result = rankDiscoveredModels([a, b]);
    expect(result).toHaveLength(2);
  });
});
