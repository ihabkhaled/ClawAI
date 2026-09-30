import { describe, expect, it } from 'vitest';

import type { MessageRoutedData } from '../../types/execution.types';
import { ChatMessagesService } from '../chat-messages.service';

// A picked Veo/Grok video model and "generate a video ..." in AUTO must reach video
// generation instead of the chat path that answered 404/400 (ADR-137).
type Overrides = {
  detectVideoOutputModel: (payload: MessageRoutedData) => MessageRoutedData;
  detectVideoRequest: (payload: MessageRoutedData, messages: unknown[]) => MessageRoutedData;
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

describe('video routing overrides', () => {
  const ctor = ChatMessagesService as unknown as new (...args: unknown[]) => ChatMessagesService;
  const service = new ctor(...new Array(22).fill({})) as unknown as Overrides;

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
    it('sends "can you generate video about claw ai ?" to the cheapest video provider in AUTO', () => {
      const out = service.detectVideoRequest(payload({}), [
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
    ])('does not spend money on %j', (text) => {
      const original = payload({});

      expect(service.detectVideoRequest(original, [user(text)])).toBe(original);
    });

    it('never overrides a model the user picked themselves', () => {
      const manual = payload({ routingMode: 'MANUAL_MODEL' });

      expect(service.detectVideoRequest(manual, [user('make a video of the sea')])).toBe(manual);
    });

    it('does not re-route a turn that is already video', () => {
      const already = payload({
        selectedProvider: 'VIDEO_GROK',
        selectedModel: 'grok-imagine-video',
      });

      expect(service.detectVideoRequest(already, [user('make a video of the sea')])).toBe(already);
    });
  });
});
