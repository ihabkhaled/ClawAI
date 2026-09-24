import { describe, expect, it } from 'vitest';
import { isLocalVisionModel } from '../local-vision-heuristics.constants';

// Mirrors connector-service's ollama-vision-heuristics.spec.ts case table. The
// two pattern lists are a deliberate two-copy literal; this table is what
// keeps them honest. Since batch 2b a local model this heuristic calls
// text-only receives OCR text instead of image bytes, so a missed family is a
// visible regression, not a cosmetic one.
describe('isLocalVisionModel', () => {
  it.each([
    'llava:13b',
    'bakllava',
    'moondream:latest',
    'llama3.2-vision:11b',
    'minicpm-v:8b',
    'gemma3:4b',
    'gemma3:27b-cloud',
    'qwen2.5vl:7b',
    'qwen3-vl:235b-cloud',
    'llama4:scout',
    'mistral-small3.1:24b',
  ])('treats %s as vision-capable', (model) => {
    expect(isLocalVisionModel(model)).toBe(true);
  });

  it.each([
    'llama2',
    'mistral',
    'qwen2.5-coder',
    'gemma3:1b',
    'gemma3n:e4b',
    'qwen3:8b',
    'mistral-small:22b',
  ])('treats %s as text-only', (model) => {
    expect(isLocalVisionModel(model)).toBe(false);
  });
});
