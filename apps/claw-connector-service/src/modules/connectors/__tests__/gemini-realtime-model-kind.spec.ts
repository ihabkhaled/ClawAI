import { ModelKind } from '../../../generated/prisma';
import { classifyGeminiModelKind } from '../utilities/gemini-model-kind.utility';
import { nonChatKindForModelKey } from '../utilities/model-kind.utility';

// The seven Gemini ids that answered HTTP 400 "only supports real-time
// bidirectional streaming" when pinned in chat.
const REALTIME_MODELS = [
  'models/gemini-2.5-flash-native-audio-latest',
  'models/gemini-2.5-flash-native-audio-preview-09-2025',
  'models/gemini-2.5-flash-native-audio-preview-12-2025',
  'models/gemini-3.1-flash-live-preview',
  'models/gemini-3.5-live-translate-preview',
  'models/gemini-robotics-er-2-streaming-preview',
  'models/lyria-realtime-exp',
];

const CHAT_MODELS = [
  'models/gemini-3.6-flash',
  'models/gemini-2.5-pro',
  'models/gemini-robotics-er-2-preview',
  'models/gemini-deliver-flash',
];

describe('Gemini realtime-only models are never CHAT', () => {
  it('bidi-only method lists are not chat', () => {
    expect(classifyGeminiModelKind(['bidiGenerateContent'])).toBe(ModelKind.TOOL);
    expect(classifyGeminiModelKind(['bidiGenerateMusic'])).toBe(ModelKind.TOOL);
  });

  it.each(REALTIME_MODELS)('%s: the id alone says non-chat when the list is unreadable', (id) => {
    expect(nonChatKindForModelKey(id)).not.toBeNull();
  });

  it.each(CHAT_MODELS)('%s stays CHAT', (modelKey) => {
    expect(nonChatKindForModelKey(modelKey)).toBeNull();
  });

  it('a generateContent model stays CHAT', () => {
    expect(classifyGeminiModelKind(['generateContent', 'countTokens'])).toBe(ModelKind.CHAT);
    expect(classifyGeminiModelKind(undefined)).toBe(ModelKind.CHAT);
  });
});
