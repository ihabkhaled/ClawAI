import { BusinessCategory } from '../../../../common/enums/business-category.enum';
import { ModelCategory } from '../../../../generated/prisma';
import { classifyModel } from '../model-classifier.utility';

describe('classifyModel', () => {
  it('classifies qwen2.5-coder as CODING with CODING_ASSISTANT business category', () => {
    const result = classifyModel({
      name: 'qwen2.5-coder',
      tag: '32b',
      displayName: 'Qwen 2.5 Coder 32B',
      description: 'Best local coding model',
      capabilities: ['code_generation'],
    });
    expect(result.category).toBe(ModelCategory.CODING);
    expect(result.businessCategories).toContain(BusinessCategory.CODING_ASSISTANT);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('classifies meditron as MEDICAL', () => {
    const result = classifyModel({
      name: 'meditron',
      tag: '7b',
      displayName: 'Meditron 7B',
      description: 'Medical LLM',
      capabilities: [],
    });
    expect(result.category).toBe(ModelCategory.MEDICAL);
    expect(result.businessCategories).toContain(BusinessCategory.MEDICAL);
  });

  it('classifies llava as VISION', () => {
    const result = classifyModel({
      name: 'llava',
      tag: '13b',
      displayName: 'LLaVA 13B',
      description: 'Multimodal vision model',
      capabilities: ['vision'],
    });
    expect(result.category).toBe(ModelCategory.VISION);
    expect(result.businessCategories).toContain(BusinessCategory.VISION_MULTIMODAL);
  });

  it('classifies deepseek-r1 as REASONING', () => {
    const result = classifyModel({
      name: 'deepseek-r1',
      tag: '7b',
      displayName: 'DeepSeek R1 7B',
      description: 'Chain-of-thought reasoning model',
      capabilities: ['reasoning'],
    });
    expect(result.category).toBe(ModelCategory.REASONING);
  });

  it('falls back to GENERAL when no family match', () => {
    const result = classifyModel({
      name: 'obscure-model',
      tag: 'latest',
      displayName: 'Obscure Model',
      description: null,
      capabilities: [],
    });
    expect(result.category).toBe(ModelCategory.GENERAL);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('extracts business categories from description keywords', () => {
    const result = classifyModel({
      name: 'custom-marketing-v1',
      tag: 'latest',
      displayName: 'Custom Marketing V1',
      description: 'Generates ad copy and sales emails',
      capabilities: [],
    });
    expect(result.businessCategories).toContain(BusinessCategory.MARKETING);
  });

  it('classifies tinyllama as ROUTING', () => {
    const result = classifyModel({
      name: 'tinyllama',
      tag: '1.1b',
      displayName: 'TinyLlama 1.1B',
      description: null,
      capabilities: [],
    });
    expect(result.category).toBe(ModelCategory.ROUTING);
  });

  it('classifies nomic-embed as EMBEDDING', () => {
    const result = classifyModel({
      name: 'nomic-embed-text',
      tag: 'latest',
      displayName: 'Nomic Embed Text',
      description: null,
      capabilities: [],
    });
    expect(result.category).toBe(ModelCategory.EMBEDDING);
  });

  it('returns confidence 1.0 for exact family match with matching keywords', () => {
    const result = classifyModel({
      name: 'qwen2.5-coder',
      tag: '7b',
      displayName: 'Qwen Coder',
      description: 'Coding assistant for code generation and debugging',
      capabilities: ['code_generation', 'coding'],
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('boosts confidence when multiple signals agree', () => {
    const strong = classifyModel({
      name: 'deepseek-coder-v2',
      tag: '16b',
      displayName: 'DeepSeek Coder V2',
      description: 'Specialist in code generation and coding',
      capabilities: ['code_generation', 'debugging'],
    });
    const weak = classifyModel({
      name: 'custom-v1',
      tag: 'latest',
      displayName: 'Custom Model',
      description: null,
      capabilities: [],
    });
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });

  it('deduplicates business categories', () => {
    const result = classifyModel({
      name: 'qwen2.5-coder',
      tag: '7b',
      displayName: 'Qwen Coder',
      description: 'Coder coder coding code',
      capabilities: ['coder'],
    });
    const unique = new Set(result.businessCategories);
    expect(unique.size).toBe(result.businessCategories.length);
  });
});
