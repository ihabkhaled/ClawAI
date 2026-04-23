import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ChatStreamService } from '../services/chat-stream.service';

describe('ChatStreamService', () => {
  let service: ChatStreamService;

  beforeEach(() => {
    service = new ChatStreamService();
  });

  it('emits request accepted progress details', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitRequestAccepted('thread-1');

    expect(nextSpy).toHaveBeenCalledWith({
      threadId: 'thread-1',
      type: StreamEventType.REQUEST_ACCEPTED,
      label: 'Request accepted',
      description: 'Claw received your message and is preparing the run.',
      actorType: 'request',
      actorName: 'Claw',
    });
  });

  it('emits research completion with a fallback tool label when no tools are present', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchCompleted('thread-2', 4, []);

    expect(nextSpy).toHaveBeenCalledWith({
      threadId: 'thread-2',
      type: StreamEventType.RESPONSE_STREAMING,
      label: 'Evidence ready',
      description: 'Collected 4 evidence items using research tools.',
      actorType: 'system',
      actorName: 'Research workflow',
    });
  });

  it('emits custom progress stages with provider and model context', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitProgressStage('thread-3', StreamEventType.RESPONSE_STREAMING, {
      label: 'Drafting answer',
      description: 'The selected model is producing the answer.',
      actorType: ProgressActorType.MODEL,
      actorName: 'local-ollama / qwen3:1.7b',
      provider: 'local-ollama',
      model: 'qwen3:1.7b',
    });

    expect(nextSpy).toHaveBeenCalledWith({
      threadId: 'thread-3',
      type: StreamEventType.RESPONSE_STREAMING,
      label: 'Drafting answer',
      description: 'The selected model is producing the answer.',
      actorType: ProgressActorType.MODEL,
      actorName: 'local-ollama / qwen3:1.7b',
      provider: 'local-ollama',
      model: 'qwen3:1.7b',
    });
  });
});
