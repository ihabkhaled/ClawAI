import { isOpenAiChatModelId } from '../openai-chat-model-id.utility';

describe('isOpenAiChatModelId', () => {
  it.each([
    'gpt-6-astra',
    'gpt-5.6-sol',
    'gpt-6.1',
    'gpt-luna',
    'gpt-terra',
    'gpt-5',
    'gpt-4o',
    'gpt-3.5-turbo',
    'o1',
    'o3-mini',
    'o4-mini',
    'chatgpt-4o-latest',
    'gpt-4o-mini-transcribe',
    'GPT-5',
  ])('keeps %s', (id) => {
    expect(isOpenAiChatModelId(id)).toBe(true);
  });

  it.each([
    'text-embedding-3-small',
    'whisper-1',
    'tts-1',
    'tts-1-hd',
    'dall-e-3',
    'gpt-image-1',
    'omni-moderation-latest',
    'text-moderation-latest',
    'gpt-embedding-x',
    'sora-2',
    'babbage-002',
    'davinci-002',
  ])('drops %s', (id) => {
    expect(isOpenAiChatModelId(id)).toBe(false);
  });
});
