import { generateImageSchema } from '../generate-image.dto';
import { IMAGE_REFERENCE_FILE_ID_MAX_LENGTH } from '../../constants/image-reference.constants';

/**
 * The contract chat-service's `callImageService` sends to
 * `POST /internal/images/generate`. chat-service's own spec asserts the body it
 * builds; this one asserts image-service accepts exactly that shape and refuses
 * anything past its bounds.
 */
const CHAT_BODY = {
  prompt: 'a lighthouse at dusk',
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  userId: 'user-1',
  isAutoMode: true,
  threadId: 'thread-1',
  userMessageId: 'msg-1',
  referenceImageBase64: 'aGVsbG8=',
  referenceImageMimeType: 'image/png',
  referenceFileId: 'file-ref',
};

describe('generateImageSchema (chat → image contract)', () => {
  it('accepts the body chat-service sends, keeping the turn ids and the reference file id', () => {
    const parsed = generateImageSchema.parse(CHAT_BODY);
    expect(parsed).toMatchObject({
      threadId: 'thread-1',
      userMessageId: 'msg-1',
      referenceFileId: 'file-ref',
    });
  });

  it('keeps every id optional — an older caller without them still parses', () => {
    const bare = {
      prompt: CHAT_BODY.prompt,
      provider: CHAT_BODY.provider,
      model: CHAT_BODY.model,
      userId: CHAT_BODY.userId,
    };
    expect(generateImageSchema.safeParse(bare).success).toBe(true);
  });

  it.each([
    ['threadId', 'x'.repeat(101)],
    ['userMessageId', 'x'.repeat(101)],
    ['assistantMessageId', 'x'.repeat(101)],
    ['referenceFileId', 'x'.repeat(IMAGE_REFERENCE_FILE_ID_MAX_LENGTH + 1)],
    ['referenceFileId', ''],
  ])('refuses %s outside its bounds', (field, value) => {
    const result = generateImageSchema.safeParse({ ...CHAT_BODY, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});
