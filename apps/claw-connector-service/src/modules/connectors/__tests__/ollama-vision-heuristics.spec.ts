import {
  isOllamaMultimodalModel,
  OLLAMA_MULTIMODAL_MODEL_PATTERNS,
} from '../constants/ollama-vision-heuristics.constants';

describe('ollama-vision-heuristics', () => {
  describe('OLLAMA_MULTIMODAL_MODEL_PATTERNS', () => {
    it('exposes a non-empty list of regex patterns', () => {
      expect(OLLAMA_MULTIMODAL_MODEL_PATTERNS.length).toBeGreaterThan(0);
      for (const pattern of OLLAMA_MULTIMODAL_MODEL_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('isOllamaMultimodalModel', () => {
    it.each([
      'llava:7b',
      'llava:13b',
      'bakllava:latest',
      'moondream:latest',
      'llama3.2-vision:11b',
      'minicpm-v:8b',
      'gemma3:4b',
      'gemma3:27b-cloud',
      'qwen2.5vl:7b',
      'qwen3-vl:235b-cloud',
      'llama4:scout',
      'mistral-small3.1:24b',
    ])('returns true for known multimodal model %s', (modelName) => {
      expect(isOllamaMultimodalModel(modelName)).toBe(true);
    });

    it.each(['llama2', 'mistral', 'neural-chat', 'qwen2.5-coder', 'gemma3:1b', 'gemma3n:e4b', 'qwen3:8b', 'mistral-small:22b'])(
      'returns false for non-multimodal model %s',
      (modelName) => {
        expect(isOllamaMultimodalModel(modelName)).toBe(false);
      },
    );

    it('is case-insensitive', () => {
      expect(isOllamaMultimodalModel('LLAVA:7B')).toBe(true);
      expect(isOllamaMultimodalModel('LLaMA3.2-Vision:11B')).toBe(true);
    });
  });
});
