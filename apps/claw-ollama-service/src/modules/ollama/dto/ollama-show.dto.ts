import { z } from 'zod';

// Inbound contract for Ollama's `POST /api/show`: a THIRD PARTY's response.
// Only `model_info` is read. It carries the model's input window under
// `<arch>.context_length` (e.g. `qwen3.context_length`), with the architecture
// named by `general.architecture`. Everything else is dropped.

export const ollamaShowResponseSchema = z.object({
  model_info: z.record(z.string(), z.unknown()),
});

export const ollamaContextLengthSchema = z.number().int().positive();

export const ollamaArchitectureSchema = z.string().min(1).max(100);
