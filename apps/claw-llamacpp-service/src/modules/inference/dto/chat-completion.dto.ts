import { z } from 'zod';

// Native tool calling, OpenAI-compatible shape. llama-server implements this
// surface when launched with `--jinja` and a tool-aware chat template.
//
// Both halves below are mandatory, not cosmetic. This schema is applied via
// ZodValidationPipe and the controller forwards the PARSED body, so anything
// absent here is silently STRIPPED before it reaches llama-server — which is
// how `tools` used to disappear without a trace. Equally, `role: 'tool'` being
// absent from the enum meant a multi-turn tool loop died mid-run on a
// validation error the moment the first tool result came back.

export const ToolFunctionSpecSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(8_000).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const ToolSpecSchema = z.object({
  type: z.literal('function'),
  function: ToolFunctionSpecSchema,
});

export const ToolCallSchema = z.object({
  id: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  function: z.object({
    name: z.string().min(1).max(64),
    // OpenAI-compatible providers carry tool-call arguments as a JSON STRING,
    // not an object. Bounded to the Runtime V2 argument cap.
    arguments: z.string().max(262_144),
  }),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().max(100_000),
  // Set on a `role: 'tool'` message to correlate it with the call it answers.
  tool_call_id: z.string().max(200).optional(),
  // Echoed back on the assistant turn that requested the calls, so the model
  // sees its own tool call in the transcript on the next turn.
  tool_calls: z.array(ToolCallSchema).max(64).optional(),
});

export const ChatCompletionSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(200),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(64_000).optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string().max(200), z.array(z.string().max(200)).max(10)]).optional(),
  model: z.string().max(200).optional(),
  tools: z.array(ToolSpecSchema).max(128).optional(),
  tool_choice: z.union([z.string().max(50), z.record(z.string(), z.unknown())]).optional(),
});

export type ToolSpecDto = z.infer<typeof ToolSpecSchema>;
export type ToolCallDto = z.infer<typeof ToolCallSchema>;
export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;
export type ChatCompletionDto = z.infer<typeof ChatCompletionSchema>;
