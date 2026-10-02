import {
  buildAnthropicMessagesUrl,
  buildAnthropicNativeHeaders,
  mapAnthropicStopReason,
  readAnthropicMessageContent,
} from '../anthropic-messages-response.utility';

describe('readAnthropicMessageContent', () => {
  it('joins text blocks and separates thinking from the answer', () => {
    const result = readAnthropicMessageContent({
      content: [
        { type: 'thinking', thinking: 'hmm ' },
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world' },
        { type: 'thinking', thinking: 'ok' },
      ],
      stop_reason: 'end_turn',
    });
    expect(result).toEqual({
      text: 'Hello world',
      reasoning: 'hmm ok',
      finishReason: 'stop',
      hasContent: true,
    });
  });

  it('ignores tool_use and malformed blocks instead of throwing', () => {
    const result = readAnthropicMessageContent({
      content: [
        { type: 'tool_use' },
        { type: 'text' },
        { type: 'text', text: 'fine' },
        { type: 'redacted_thinking' },
      ],
    });
    expect(result.text).toBe('fine');
    expect(result.reasoning).toBe('');
  });

  it('reports a response with no content array so the caller can refuse it', () => {
    expect(readAnthropicMessageContent({}).hasContent).toBe(false);
    expect(readAnthropicMessageContent({ content: [] }).hasContent).toBe(true);
  });
});

describe('mapAnthropicStopReason', () => {
  it.each([
    ['end_turn', 'stop'],
    ['stop_sequence', 'stop'],
    ['max_tokens', 'length'],
    ['tool_use', 'tool_calls'],
    ['refusal', 'refusal'],
    [null, 'stop'],
    [undefined, 'stop'],
    ['', 'stop'],
  ])('%s -> %s', (input, expected) => {
    expect(mapAnthropicStopReason(input)).toBe(expected);
  });
});

describe('native transport request helpers', () => {
  it('authenticates with x-api-key and pins the API version, never a Bearer header', () => {
    const headers = buildAnthropicNativeHeaders('sk-test');
    expect(headers).toEqual({ 'x-api-key': 'sk-test', 'anthropic-version': '2023-06-01' });
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('appends /messages to the connector base URL, with or without a trailing slash', () => {
    expect(buildAnthropicMessagesUrl('https://api.anthropic.com/v1')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(buildAnthropicMessagesUrl('https://gateway.example/anthropic/v1/')).toBe(
      'https://gateway.example/anthropic/v1/messages',
    );
  });
});
