import { chatMessageSchema, chatSchema } from '../dto/chat.dto';

// The chat DTO is the gate in front of the only Ollama surface that can carry
// tools. It is applied via ZodValidationPipe and the parsed body is what
// reaches the runtime, so a field missing from the schema is silently dropped —
// exactly the failure mode that kept `tools` from ever reaching a model.

describe('chatSchema — native tool passthrough', () => {
  const messages = [{ role: 'user' as const, content: 'Read src/main.ts' }];

  it('round-trips a tools array', () => {
    const parsed = chatSchema.parse({
      model: 'qwen3-coder:30b',
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'workspace_files',
            description: 'Bounded workspace reads.',
            parameters: { type: 'object', properties: {}, required: [] },
          },
        },
      ],
    });

    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools?.[0]?.function.name).toBe('workspace_files');
    expect(parsed.tools?.[0]?.function.parameters).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  it("accepts role: 'tool' so a multi-turn loop can return a result", () => {
    const parsed = chatMessageSchema.parse({
      role: 'tool',
      content: 'export function main() {}',
      tool_call_id: 'call_1',
    });

    expect(parsed.role).toBe('tool');
    expect(parsed.tool_call_id).toBe('call_1');
  });

  it('accepts an assistant turn with EMPTY content and tool_calls', () => {
    // A tool-call turn carries the call, not prose. Rejecting empty content
    // here would make every successful tool call look like a malformed request.
    const parsed = chatMessageSchema.parse({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'workspace_files', arguments: { operation: 'read' } },
        },
      ],
    });

    expect(parsed.content).toBe('');
    // Native Ollama arguments are an OBJECT, unlike the OpenAI-compatible
    // surface which uses a JSON string.
    expect(parsed.tool_calls?.[0]?.function.arguments).toEqual({ operation: 'read' });
  });

  it('accepts a plain chat request with no tool fields', () => {
    const parsed = chatSchema.parse({ model: 'qwen3:8b', messages });

    expect(parsed.tools).toBeUndefined();
    expect(parsed.messages).toHaveLength(1);
  });

  it('accepts both keepAlive spellings', () => {
    expect(chatSchema.parse({ model: 'm', messages, keepAlive: '-1m' }).keepAlive).toBe('-1m');
    expect(chatSchema.parse({ model: 'm', messages, keep_alive: '5m' }).keep_alive).toBe('5m');
  });

  it('accepts a structured-output format (local Ollama only)', () => {
    expect(chatSchema.parse({ model: 'm', messages, format: 'json' }).format).toBe('json');
    expect(chatSchema.parse({ model: 'm', messages, format: { type: 'object' } }).format).toEqual({
      type: 'object',
    });
  });

  it('rejects an unknown role', () => {
    expect(() => chatMessageSchema.parse({ role: 'developer', content: 'x' })).toThrow();
  });

  it('requires a model and at least one message', () => {
    expect(() => chatSchema.parse({ model: '', messages })).toThrow();
    expect(() => chatSchema.parse({ model: 'm', messages: [] })).toThrow();
  });

  it('bounds the tools array and the image array', () => {
    const tool = { type: 'function', function: { name: 'a' } };
    expect(() =>
      chatSchema.parse({ model: 'm', messages, tools: Array.from({ length: 129 }, () => tool) }),
    ).toThrow();
    expect(() =>
      chatMessageSchema.parse({
        role: 'user',
        content: 'x',
        images: Array.from({ length: 11 }, () => 'aGk='),
      }),
    ).toThrow();
  });
});
