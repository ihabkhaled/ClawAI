import 'reflect-metadata';
import { vi } from 'vitest';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { SpeechJobStatus } from '../../../../common/enums';
import { ChatSpeechController } from '../chat-speech.controller';

// "Read aloud" routes are thin: one service call each. POST sets 200 (READY)
// or 202 (a background job is synthesising) from the service's answer.
describe('ChatSpeechController', () => {
  const generating = {
    status: SpeechJobStatus.GENERATING,
    segments: [],
    totalSegments: 3,
    truncated: false,
    errorCode: null,
  };
  const service = {
    getAvailability: vi.fn(async () => ({ available: true, reason: null })),
    start: vi.fn(async () => ({ httpStatus: 202, body: generating })),
    getState: vi.fn(async () => generating),
  };
  const controller = new ChatSpeechController(service as never);
  const user = { id: 'user-1' } as never;

  it('availability asks the service for the current user', async () => {
    await expect(controller.availability(user)).resolves.toEqual({ available: true, reason: null });
    expect(service.getAvailability).toHaveBeenCalledWith('user-1');
  });

  it('start passes the validated id and user, and answers with the service status code', async () => {
    const response = { status: vi.fn() };
    await expect(controller.start({ id: 'msg-1' }, user, response as never)).resolves.toEqual(
      generating,
    );
    expect(service.start).toHaveBeenCalledWith('user-1', 'msg-1');
    expect(response.status).toHaveBeenCalledWith(202);
  });

  it('state is the poll for the current user', async () => {
    await expect(controller.state({ id: 'msg-1' }, user)).resolves.toEqual(generating);
    expect(service.getState).toHaveBeenCalledWith('user-1', 'msg-1');
  });

  it('mounts GET speech/availability, POST :id/speech and GET :id/speech under chat-messages', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ChatSpeechController)).toBe('chat-messages');
    const proto = ChatSpeechController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, proto.availability)).toBe('speech/availability');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.availability)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, proto.start)).toBe(':id/speech');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.start)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, proto.state)).toBe(':id/speech');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.state)).toBe(RequestMethod.GET);
  });
});
