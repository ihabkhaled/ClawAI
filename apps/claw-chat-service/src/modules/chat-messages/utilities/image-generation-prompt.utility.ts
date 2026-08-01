import { IMAGE_GENERATION_PROMPT_MAX_CHARACTERS } from '../constants/image-generation.constants';

export function boundImageGenerationPrompt(prompt: string): string {
  if (prompt.length <= IMAGE_GENERATION_PROMPT_MAX_CHARACTERS) {
    return prompt;
  }
  return prompt.slice(0, IMAGE_GENERATION_PROMPT_MAX_CHARACTERS).trimEnd();
}
