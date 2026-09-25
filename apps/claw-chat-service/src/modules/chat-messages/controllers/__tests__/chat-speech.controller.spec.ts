import 'reflect-metadata';
import { vi } from 'vitest';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { ChatSpeechController } from '../chat-speech.controller';

// Multimodal batch 9 — the "Read aloud" routes are thin: one service call each.
describe('ChatSpeechController', () => {
  const service = {
    getAvailability: vi.fn(async () => ({ available: true, reason: null })),
    synthesize: vi.fn(async () => ({ fileId: 'f1' })),
  };
  const controller = new ChatSpeechController(service as never);
  const user = { id: 'user-1' } as never;

  it('availability asks the service for the current user', async () => {
    await expect(controller.availability(user)).resolves.toEqual({ available: true, reason: null });
    expect(service.getAvailability).toHaveBeenCalledWith('user-1');
  });

  it('synthesize passes the validated id and the current user', async () => {
    await controller.synthesize({ id: 'msg-1' }, user);
    expect(service.synthesize).toHaveBeenCalledWith('user-1', 'msg-1');
  });

  it('mounts GET speech/availability and POST :id/speech under chat-messages', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ChatSpeechController)).toBe('chat-messages');
    const proto = ChatSpeechController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, proto.availability)).toBe('speech/availability');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.availability)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, proto.synthesize)).toBe(':id/speech');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.synthesize)).toBe(RequestMethod.POST);
  });
});
