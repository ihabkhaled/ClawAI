import {
  isOllamaToolCapableModel,
  OLLAMA_TOOL_CAPABLE_MODEL_PATTERNS,
  OLLAMA_TOOL_INCAPABLE_MODEL_PATTERNS,
} from '../constants/ollama-tool-heuristics.constants';
import { isOllamaMultimodalModel } from '../constants/ollama-vision-heuristics.constants';

describe('ollama-tool-heuristics', () => {
  describe('pattern lists', () => {
    it('exposes non-empty regex lists', () => {
      expect(OLLAMA_TOOL_CAPABLE_MODEL_PATTERNS.length).toBeGreaterThan(0);
      expect(OLLAMA_TOOL_INCAPABLE_MODEL_PATTERNS.length).toBeGreaterThan(0);
      for (const pattern of [
        ...OLLAMA_TOOL_CAPABLE_MODEL_PATTERNS,
        ...OLLAMA_TOOL_INCAPABLE_MODEL_PATTERNS,
      ]) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('isOllamaToolCapableModel', () => {
    it.each([
      'qwen3-coder:480b-cloud',
      'qwen3:30b',
      'gpt-oss:120b-cloud',
      'gpt-oss:20b',
      'deepseek-v4-pro',
      'deepseek-r1:32b',
      'kimi-k2.7-code',
      'glm-5.2',
      'minimax-m3',
      'mistral-small:24b',
      'mixtral:8x7b',
      'llama3.1:8b',
      'llama3.3:70b',
      'command-r-plus',
      'hermes3:8b',
    ])('returns true for tool-capable model %s', (modelName) => {
      expect(isOllamaToolCapableModel(modelName)).toBe(true);
    });

    it.each([
      'gemma3:4b',
      'gemma2:9b',
      'nomic-embed-text',
      'mxbai-embed-large',
      'moondream:latest',
      'llava:13b',
      'bakllava:latest',
      'llama-guard3:8b',
      'shieldgemma:9b',
    ])('returns false for non-tool model %s', (modelName) => {
      expect(isOllamaToolCapableModel(modelName)).toBe(false);
    });

    it('returns false for an unknown model rather than assuming capability', () => {
      // Optimism here is the expensive direction: an agent run routed onto a
      // model that silently ignores `tools` produces a run that cannot call
      // anything and cannot explain why.
      expect(isOllamaToolCapableModel('some-brand-new-model:7b')).toBe(false);
      expect(isOllamaToolCapableModel('')).toBe(false);
    });

    it('does not report llama 3.0 and earlier as tool-capable', () => {
      // Tool calling landed in the llama 3.1 generation.
      expect(isOllamaToolCapableModel('llama3:8b')).toBe(false);
      expect(isOllamaToolCapableModel('llama2:13b')).toBe(false);
    });

    it('lets the incapable list win over a broader capable pattern', () => {
      // `llama-guard3` matches nothing in the capable list today, but the
      // ordering guarantee is the point: a safety-classifier variant of a
      // tool-capable family must not inherit the capability.
      expect(isOllamaToolCapableModel('llama3.1-guard:8b')).toBe(false);
    });

    it('is independent of the vision heuristic', () => {
      // A model can be one, both, or neither. qwen3 is tool-capable and not a
      // vision model; llava is a vision model and not tool-capable.
      expect(isOllamaToolCapableModel('qwen3:30b')).toBe(true);
      expect(isOllamaMultimodalModel('qwen3:30b')).toBe(false);
      expect(isOllamaToolCapableModel('llava:13b')).toBe(false);
      expect(isOllamaMultimodalModel('llava:13b')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isOllamaToolCapableModel('QWEN3-Coder:480B-Cloud')).toBe(true);
      expect(isOllamaToolCapableModel('GEMMA3:4b')).toBe(false);
    });
  });
});
