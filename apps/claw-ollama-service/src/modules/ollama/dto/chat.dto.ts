import { z } from 'zod';

// Native Ollama `/api/chat` request. Every string and array is bounded per the
// service DTO checklist.
//
// `role` MUST include 'tool' — without it a multi-turn tool loop dies on the
// first result message, and the failure surfaces as an opaque validation error
// rather than anything explaining why the run stopped.

export const chatToolSpecSchema = z.object({
  type: z.string().min(1).max(50),
  function: z.object({
    name: z.string().min(1).max(64),
    description: z.string().max(8_000).optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const chatToolCallSchema = z.object({
  id: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  function: z.object({
    name: z.string().min(1).max(64),
    // Native Ollama carries arguments as an object, not a JSON string.
    arguments: z.record(z.string(), z.unknown()),
  }),
});

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  // Empty content is legitimate: a tool-call turn carries the call, not prose.
  content: z.string().max(200_000),
  images: z.array(z.string().max(20_000_000)).max(10).optional(),
  thinking: z.string().max(200_000).optional(),
  tool_call_id: z.string().max(200).optional(),
  tool_calls: z.array(chatToolCallSchema).max(64).optional(),
});

export const chatSchema = z.object({
  model: z.string().min(1, 'Model is required').max(255),
  messages: z.array(chatMessageSchema).min(1).max(200),
  stream: z.boolean().optional(),
  think: z.boolean().optional(),
  tools: z.array(chatToolSpecSchema).max(128).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  keepAlive: z.string().min(1).max(32).optional(),
  keep_alive: z.string().min(1).max(32).optional(),
  // Local Ollama supports JSON / JSON-Schema structured output. Ollama Cloud
  // does not, so callers must not assume this field is honoured everywhere.
  format: z.union([z.string().max(50), z.record(z.string(), z.unknown())]).optional(),
});

export type ChatDto = z.infer<typeof chatSchema>;
