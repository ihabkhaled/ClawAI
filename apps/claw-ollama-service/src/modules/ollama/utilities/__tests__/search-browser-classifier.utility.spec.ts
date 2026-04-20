import { ModelCategory } from '../../../../generated/prisma';
import type { SearchBrowserClassifierInput } from '../../types/search-browser-classifier.types';
import { classifySearchBrowser } from '../search-browser-classifier.utility';

function makeInput(
  overrides: Partial<SearchBrowserClassifierInput> = {},
): SearchBrowserClassifierInput {
  return {
    name: 'sample',
    displayName: 'Sample Model',
    description: null,
    parameterCount: '7B',
    category: ModelCategory.GENERAL,
    capabilities: [],
    downloadStatus: 'AVAILABLE',
    ...overrides,
  };
}

describe('classifySearchBrowser', () => {
  it('scores a strong general-purpose tool-calling 7B model above the eligibility threshold', () => {
    const result = classifySearchBrowser(
      makeInput({
        name: 'qwen3',
        displayName: 'Qwen 3 Instruct 7B',
        description: 'general-purpose instruct model with tool-calling support',
        category: ModelCategory.GENERAL,
        parameterCount: '7B',
        capabilities: ['tool_calling'],
      }),
    );

    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'friendly_category:GENERAL',
        'tool_capability',
        expect.stringMatching(/^params_adequate:/) as unknown as string,
        expect.stringMatching(/^text_signals:/) as unknown as string,
      ]),
    );
  });

  it('returns score 0 and ineligible for image-generation models', () => {
    const result = classifySearchBrowser(
      makeInput({
        name: 'flux-dev',
        displayName: 'FLUX Dev',
        category: ModelCategory.IMAGE_GENERATION,
        parameterCount: '12B',
        capabilities: [],
      }),
    );

    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toContain('hostile_category:IMAGE_GENERATION');
  });

  it('flags tiny models with params_too_small but still allows text/tool boost', () => {
    const result = classifySearchBrowser(
      makeInput({
        name: 'tiny-helper',
        displayName: 'Tiny Helper 360M',
        parameterCount: '360M',
        category: ModelCategory.GENERAL,
        capabilities: [],
      }),
    );

    expect(result.reasons).toContain('params_too_small:0.36B');
    expect(result.score).toBeLessThan(0.5);
    expect(result.eligible).toBe(false);
  });

  it('handles unknown parameter count without crashing', () => {
    const result = classifySearchBrowser(
      makeInput({
        parameterCount: null,
        category: ModelCategory.REASONING,
        capabilities: ['tool_calling'],
      }),
    );

    expect(result.reasons).toContain('params_unknown');
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores hostile VISION category at zero', () => {
    const result = classifySearchBrowser(
      makeInput({
        category: ModelCategory.VISION,
        parameterCount: '7B',
        capabilities: ['tool_calling'],
      }),
    );

    expect(result.score).toBe(0);
    expect(result.eligible).toBe(false);
  });

  it('boosts via text signals even without tool capability', () => {
    const result = classifySearchBrowser(
      makeInput({
        name: 'research-helper',
        displayName: 'Research Agent Browser',
        description: 'designed for retrieval and browsing research workflows',
        category: ModelCategory.GENERAL,
        parameterCount: '3B',
        capabilities: [],
      }),
    );

    const signalReason = result.reasons.find((r) => r.startsWith('text_signals:'));
    expect(signalReason).toBeDefined();
    const count = signalReason === undefined ? 0 : Number(signalReason.split(':')[1]);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('awards strong-params bonus at 7B', () => {
    const result = classifySearchBrowser(
      makeInput({
        category: ModelCategory.GENERAL,
        parameterCount: '7B',
        capabilities: ['tool_calling'],
      }),
    );

    expect(result.reasons).toContain('params_strong:7B');
  });

  it('does not break on malformed parameterCount string', () => {
    const result = classifySearchBrowser(
      makeInput({
        parameterCount: 'not-a-number',
      }),
    );

    expect(result.reasons).toContain('params_unknown');
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('clamps score to [0,1]', () => {
    const result = classifySearchBrowser(
      makeInput({
        name: 'agent search tool research browser retrieval',
        displayName: 'Search Browse Agent Reason Tool',
        description: 'search browse tool reason research rag retrieval instruct agent',
        category: ModelCategory.GENERAL,
        parameterCount: '70B',
        capabilities: ['tool_calling', 'tools', 'function_calling'],
        downloadStatus: 'AVAILABLE',
      }),
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('is deterministic for identical input', () => {
    const input: SearchBrowserClassifierInput = makeInput({
      name: 'deterministic',
      displayName: 'Deterministic 7B',
      parameterCount: '7B',
      category: ModelCategory.THINKING,
      capabilities: ['tool_calling'],
    });

    const r1 = classifySearchBrowser(input);
    const r2 = classifySearchBrowser(input);
    expect(r1).toEqual(r2);
  });

  it('treats EMBEDDING category as hostile', () => {
    const result = classifySearchBrowser(
      makeInput({
        category: ModelCategory.EMBEDDING,
        parameterCount: '1B',
      }),
    );
    expect(result.score).toBe(0);
  });

  it('penalizes downloadStatus=CLOUD_ONLY by not granting downloadable bonus', () => {
    const result = classifySearchBrowser(
      makeInput({
        category: ModelCategory.GENERAL,
        parameterCount: '7B',
        capabilities: ['tool_calling'],
        downloadStatus: 'CLOUD_ONLY',
      }),
    );

    expect(result.reasons.find((r) => r.startsWith('download_status:'))).toBeUndefined();
  });
});
