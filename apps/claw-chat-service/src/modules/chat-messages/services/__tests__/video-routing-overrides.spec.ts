import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageRoutedData } from '../../types/execution.types';
import { ChatMessagesService } from '../chat-messages.service';

// A picked Veo/Grok video model and "generate a video ..." in AUTO must reach video
// generation instead of the chat path that answered 404/400 (ADR-137).
type Overrides = {
  detectVideoOutputModel: (payload: MessageRoutedData) => MessageRoutedData;
  detectVideoRequest: (
    payload: MessageRoutedData,
    messages: unknown[],
    userId?: string,
  ) => Promise<MessageRoutedData>;
  detectImageFromAttachment: (
    payload: MessageRoutedData,
    messages: unknown[],
    userId: string | undefined,
  ) => Promise<MessageRoutedData>;
};

const payload = (over: Partial<MessageRoutedData>): MessageRoutedData =>
  ({
    messageId: 'm1',
    routingMode: 'AUTO',
    selectedProvider: 'GEMINI',
    selectedModel: 'models/gemini-2.5-flash',
    ...over,
  }) as MessageRoutedData;

const user = (content: string): unknown => ({ role: 'USER', content });
const withImage = (content: string): unknown => ({
  role: 'USER',
  content,
  metadata: { fileIds: ['img-1'] },
});

describe('video routing overrides', () => {
  const ctor = ChatMessagesService as unknown as new (...args: unknown[]) => ChatMessagesService;
  const mimeTypes = vi.fn();
  const service = new ctor(...new Array(22).fill({})) as unknown as Overrides;
  (service as unknown as { attachmentInfo: unknown }).attachmentInfo = { mimeTypes };

  beforeEach(() => {
    mimeTypes.mockReset();
  });

  describe('detectVideoOutputModel', () => {
    it.each([
      ['GEMINI', 'models/veo-3.1-generate-preview', 'VIDEO_GEMINI'],
      ['GEMINI', 'models/veo-3.1-fast-generate-preview', 'VIDEO_GEMINI'],
      ['GROK', 'grok-imagine-video', 'VIDEO_GROK'],
      ['GROK', 'grok-imagine-video-1.5', 'VIDEO_GROK'],
    ])('sends a picked %s %s to %s', (provider, model, target) => {
      const out = service.detectVideoOutputModel(
        payload({ routingMode: 'MANUAL_MODEL', selectedProvider: provider, selectedModel: model }),
      );

      expect(out.selectedProvider).toBe(target);
      expect(out.selectedModel).toBe(model);
    });

    it('leaves a chat model and an image model alone', () => {
      const chat = payload({});
      const image = payload({ selectedProvider: 'GROK', selectedModel: 'grok-imagine-image' });

      expect(service.detectVideoOutputModel(chat)).toBe(chat);
      expect(service.detectVideoOutputModel(image)).toBe(image);
    });
  });

  describe('detectVideoRequest', () => {
    it('sends "can you generate video about claw ai ?" to the cheapest video provider in AUTO', async () => {
      const out = await service.detectVideoRequest(payload({}), [
        user('can you generate video about claw ai ?'),
      ]);

      expect(out.selectedProvider).toBe('VIDEO_GEMINI');
      expect(out.selectedModel).toBe('veo-3.1-fast-generate-preview');
    });

    it.each([
      'how do I make a video call',
      'summarise this video',
      'what is video generation',
      'generate an image of a cat',
    ])('does not spend money on %j', async (text) => {
      const original = payload({});

      expect(await service.detectVideoRequest(original, [user(text)])).toBe(original);
      expect(mimeTypes).not.toHaveBeenCalled();
    });

    it('never overrides a model the user picked themselves', async () => {
      const manual = payload({ routingMode: 'MANUAL_MODEL' });

      expect(await service.detectVideoRequest(manual, [user('make a video of the sea')])).toBe(
        manual,
      );
    });

    it('does not re-route a turn that is already video', async () => {
      const already = payload({
        selectedProvider: 'VIDEO_GROK',
        selectedModel: 'grok-imagine-video',
      });

      expect(await service.detectVideoRequest(already, [user('make a video of the sea')])).toBe(
        already,
      );
    });

    it('sends "animate this image" with an image attached to video in AUTO', async () => {
      mimeTypes.mockResolvedValue(['image/png']);

      const out = await service.detectVideoRequest(
        payload({}),
        [withImage('animate this image')],
        'user-1',
      );

      expect(mimeTypes).toHaveBeenCalledWith(['img-1'], 'user-1');
      expect(out.selectedProvider).toBe('VIDEO_GEMINI');
    });

    it('does not route "animate this image" to video when the attachment is not an image', async () => {
      mimeTypes.mockResolvedValue(['application/pdf']);
      const original = payload({});

      expect(
        await service.detectVideoRequest(original, [withImage('animate this image')], 'user-1'),
      ).toBe(original);
    });

    it('does not route "animate this image" to video when nothing is attached', async () => {
      const original = payload({});

      expect(
        await service.detectVideoRequest(original, [user('animate this image')], 'user-1'),
      ).toBe(original);
    });

    it('an attachment lookup outage reads as "no image", never as a video job by guess', async () => {
      mimeTypes.mockRejectedValue(new Error('file-service down'));
      const original = payload({});

      expect(
        await service.detectVideoRequest(original, [withImage('animate this')], 'user-1'),
      ).toBe(original);
    });
  });

  describe('detectImageFromAttachment', () => {
    it('keeps a video provider when an image is attached: image-to-video is not an image edit', async () => {
      const video = payload({
        routingMode: 'MANUAL_MODEL',
        selectedProvider: 'VIDEO_GROK',
        selectedModel: 'grok-imagine-video',
      });

      expect(
        await service.detectImageFromAttachment(video, [withImage('make this move')], 'user-1'),
      ).toBe(video);
      expect(mimeTypes).not.toHaveBeenCalled();
    });
  });
});
