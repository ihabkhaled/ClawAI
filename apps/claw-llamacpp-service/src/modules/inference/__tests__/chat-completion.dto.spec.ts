import { ChatCompletionSchema, ChatMessageSchema } from '../dto/chat-completion.dto';

// The controller applies this schema via ZodValidationPipe and forwards the
// PARSED body to llama-server. Zod strips unknown keys silently, so any field
// missing from the schema disappears with no error anywhere — which is exactly
// how `tools` used to vanish. These tests assert round-trip survival, not just
// acceptance.

describe('ChatCompletionSchema — native tool calling', () => {
  const baseMessages = [{ role: 'user' as const, content: 'Read src/main.ts' }];

  it('round-trips a tools array instead of stripping it', () => {
    const parsed = ChatCompletionSchema.parse({
      messages: baseMessages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'workspace_files',
            description: 'Bounded workspace discovery and reads.',
            parameters: {
              type: 'object',
              properties: { operation: { type: 'string' } },
              required: [],
              additionalProperties: false,
            },
          },
        },
      ],
    });

    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools?.[0]?.function.name).toBe('workspace_files');
    // The JSON Schema must survive verbatim — the model has to be shown exactly
    // what the executor enforces.
    expect(parsed.tools?.[0]?.function.parameters).toEqual({
      type: 'object',
      properties: { operation: { type: 'string' } },
      required: [],
      additionalProperties: false,
    });
  });

  it('round-trips tool_choice in both its string and object forms', () => {
    expect(
      ChatCompletionSchema.parse({ messages: baseMessages, tool_choice: 'required' }).tool_choice,
    ).toBe('required');
    expect(
      ChatCompletionSchema.parse({ messages: baseMessages, tool_choice: { type: 'any' } })
        .tool_choice,
    ).toEqual({ type: 'any' });
  });

  it("accepts role: 'tool' — without it a multi-turn loop dies on the first result", () => {
    const parsed = ChatMessageSchema.parse({
      role: 'tool',
      content: 'export function main() {}',
      tool_call_id: 'call_1',
    });

    expect(parsed.role).toBe('tool');
    expect(parsed.tool_call_id).toBe('call_1');
  });

  it('round-trips an assistant turn echoing its own tool_calls', () => {
    const parsed = ChatMessageSchema.parse({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'workspace_files', arguments: '{"operation":"read"}' },
        },
      ],
    });

    expect(parsed.tool_calls).toHaveLength(1);
    // OpenAI-compatible arguments are a JSON string, not an object.
    expect(typeof parsed.tool_calls?.[0]?.function.arguments).toBe('string');
  });

  it('still accepts a plain request with no tool fields at all', () => {
    const parsed = ChatCompletionSchema.parse({ messages: baseMessages });

    expect(parsed.tools).toBeUndefined();
    expect(parsed.tool_choice).toBeUndefined();
    expect(parsed.stream).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(() => ChatMessageSchema.parse({ role: 'system_admin', content: 'x' })).toThrow();
  });

  it('bounds the tools array and tool-call arguments', () => {
    const tool = {
      type: 'function',
      function: { name: 'a', parameters: {} },
    };
    expect(() =>
      ChatCompletionSchema.parse({
        messages: baseMessages,
        tools: Array.from({ length: 129 }, () => tool),
      }),
    ).toThrow();

    expect(() =>
      ChatMessageSchema.parse({
        role: 'assistant',
        content: '',
        tool_calls: [{ function: { name: 'a', arguments: 'x'.repeat(262_145) } }],
      }),
    ).toThrow();
  });
});
