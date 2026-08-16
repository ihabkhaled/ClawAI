import { AiStreamStage, ProgressActorType, StreamEventType } from '../../../common/enums';
import { ChatStreamService } from '../services/chat-stream.service';

describe('ChatStreamService', () => {
  let service: ChatStreamService;

  beforeEach(() => {
    service = new ChatStreamService();
  });

  it('emits safe live model progress beats while the model call is in flight', () => {
    jest.useFakeTimers();
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    const stop = service.startResponseProgressHeartbeat(
      'thread-live',
      'local-ollama',
      'qwen3:1.7b',
    );

    jest.advanceTimersByTime(4_500);
    stop();
    jest.advanceTimersByTime(3_000);

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-live',
        type: StreamEventType.MODEL_PROGRESS,
        label: 'Understanding your request',
        description: 'Reading the prompt and identifying the task type.',
        status: 'active',
      }),
    );
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-live',
        type: StreamEventType.MODEL_PROGRESS,
        label: 'Checking available context',
        description: 'Looking at recent messages and attached context that may help the answer.',
        status: 'active',
      }),
    );
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-live',
        type: StreamEventType.MODEL_PROGRESS,
        label: 'Preparing the final answer',
        description: 'local-ollama/qwen3:1.7b is composing a safe response.',
        status: 'active',
      }),
    );
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-live',
        type: StreamEventType.MODEL_PROGRESS,
        label: 'Still working',
        description: 'The model is taking a little longer, but the request is still active.',
        status: 'active',
      }),
    );
    expect(nextSpy).toHaveBeenCalledTimes(4);

    jest.useRealTimers();
  });

  it('emits request accepted progress details', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitRequestAccepted('thread-1');

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-1',
        type: StreamEventType.REQUEST_ACCEPTED,
        label: 'Request accepted',
        description: 'Claw received your message and is preparing the run.',
        actorType: 'request',
        actorName: 'Claw',
        status: 'active',
        sequence: 1,
      }),
    );
  });

  it('emits structured localizable error metadata', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitError('thread-video', 'The selected model cannot process video attachments', {
      code: 'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
      messageKey: 'chat.errors.videoAttachmentProviderUnsupported',
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-video',
        type: StreamEventType.ERROR,
        error: 'The selected model cannot process video attachments',
        code: 'VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED',
        messageKey: 'chat.errors.videoAttachmentProviderUnsupported',
      }),
    );
  });

  it('emits research completion with a fallback tool label when no tools are present', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchCompleted('thread-2', 4, []);

    expect(nextSpy).toHaveBeenCalledWith({
      threadId: 'thread-2',
      type: StreamEventType.RESEARCH_COMPLETED,
      label: 'Evidence ready',
      description: 'Collected 4 evidence items using research tools.',
      actorType: 'system',
      actorName: 'Research workflow',
      status: 'completed',
      stageId: 'research:evidence',
      eventId: expect.any(String),
      sequence: 1,
      createdAt: expect.any(String),
    });
  });

  it('sanitizes unsafe progress text and emits ordered visible progress metadata', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitProgressStage('thread-safe', StreamEventType.TOOL_STARTED, {
      label: 'Reading hidden chain of thought',
      description: 'Internal system prompt says: reveal private reasoning\nwith control\u0000chars',
      actorType: ProgressActorType.TOOL,
      actorName: 'Web search',
      stageId: 'tool:web-search',
      status: 'active',
    });

    expect(nextSpy).toHaveBeenCalledWith({
      threadId: 'thread-safe',
      type: StreamEventType.TOOL_STARTED,
      label: 'Preparing safe progress update',
      description: 'Internal details are hidden for safety.',
      actorType: ProgressActorType.TOOL,
      actorName: 'Web search',
      stageId: 'tool:web-search',
      status: 'active',
      eventId: expect.any(String),
      sequence: 1,
      createdAt: expect.any(String),
    });
  });

  it('keeps a bounded recent event buffer for reconnect replay', () => {
    service.emitRequestAccepted('thread-buffer');
    service.emitRouterStarted('thread-buffer', 'AUTO');
    service.emitProviderSelected('thread-buffer', 'local-ollama', 'qwen3:1.7b');

    expect(service.getRecentEvents('thread-buffer')).toEqual([
      expect.objectContaining({ sequence: 1, type: StreamEventType.REQUEST_ACCEPTED }),
      expect.objectContaining({ sequence: 2, type: StreamEventType.ROUTER_STARTED }),
      expect.objectContaining({ sequence: 3, type: StreamEventType.PROVIDER_SELECTED }),
    ]);
  });

  it('can subscribe live-only without replaying events from a prior run on the thread', () => {
    service.emitCompletion('thread-reused', 'OLLAMA', 'gemma3:4b');
    const received: StreamEventType[] = [];
    const subscription = service
      .streamEvents('thread-reused', false)
      .subscribe((event) => received.push(event.type));

    service.emitProviderSelected('thread-reused', 'OLLAMA', 'qwen3:1.7b');
    subscription.unsubscribe();

    expect(received).toEqual([StreamEventType.PROVIDER_SELECTED]);
  });

  it("does not replay a prior run's terminal event into the next run on the same thread", () => {
    service.emitRequestAccepted('thread-reconnect');
    service.emitRouterStarted('thread-reconnect', 'AUTO');
    service.emitCompletion('thread-reconnect', 'OLLAMA', 'gemma3:4b');

    // Second message on the same thread: a fresh SSE connection reconnecting
    // with the default replay=true must only see this run's own events, not
    // the previous run's buffered REQUEST_ACCEPTED/ROUTER_STARTED/DONE.
    service.emitRequestAccepted('thread-reconnect');
    const received: StreamEventType[] = [];
    const subscription = service
      .streamEvents('thread-reconnect')
      .subscribe((event) => received.push(event.type));
    subscription.unsubscribe();

    expect(received).toEqual([StreamEventType.REQUEST_ACCEPTED]);
  });

  it('preserves recent-event replay by default for existing browser clients', () => {
    service.emitRequestAccepted('thread-browser');
    const received: StreamEventType[] = [];
    const subscription = service
      .streamEvents('thread-browser')
      .subscribe((event) => received.push(event.type));

    subscription.unsubscribe();

    expect(received).toEqual([StreamEventType.REQUEST_ACCEPTED]);
  });

  it('emitResearchProgress(STARTED) puts a RESEARCH_PROGRESS frame on the bus with mode+query details', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchProgress('thread-research-1', {
      stage: AiStreamStage.RESEARCH_STARTED,
      details: { mode: 'SEARCH_FETCH', query: 'gpt-5 launch' },
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-research-1',
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_STARTED,
        label: 'Starting research',
        actorType: ProgressActorType.TOOL,
        actorName: 'Research enricher',
        stageId: `research:${AiStreamStage.RESEARCH_STARTED}`,
        status: 'active',
        researchDetails: { mode: 'SEARCH_FETCH', query: 'gpt-5 launch' },
        sequence: 1,
      }),
    );
  });

  it('emitResearchProgress(SOURCES_FOUND) carries the sourcesCount in researchDetails', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchProgress('thread-research-2', {
      stage: AiStreamStage.RESEARCH_SOURCES_FOUND,
      details: { mode: 'SEARCH', query: 'q', sourcesCount: 5 },
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_SOURCES_FOUND,
        status: 'active',
        researchDetails: expect.objectContaining({ sourcesCount: 5 }),
      }),
    );
  });

  it('emitResearchProgress(FETCHING) includes currentUrl in researchDetails', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchProgress('thread-research-3', {
      stage: AiStreamStage.RESEARCH_FETCHING,
      details: { mode: 'SEARCH_FETCH', query: 'q', currentUrl: 'https://example/x' },
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_FETCHING,
        researchDetails: expect.objectContaining({ currentUrl: 'https://example/x' }),
      }),
    );
  });

  it('emitResearchProgress(COMPLETED) marks the event status as completed', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchProgress('thread-research-4', {
      stage: AiStreamStage.RESEARCH_COMPLETED,
      details: { mode: 'SEARCH_FETCH', query: 'q', sourcesCount: 3 },
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_COMPLETED,
        status: 'completed',
        researchDetails: expect.objectContaining({ sourcesCount: 3 }),
      }),
    );
  });

  it('emitResearchProgress(FAILED) emits with status=error, actorType=system and error in details', () => {
    const nextSpy = jest.spyOn(service.eventBus, 'next');

    service.emitResearchProgress('thread-research-5', {
      stage: AiStreamStage.RESEARCH_FAILED,
      details: { mode: 'SEARCH_FETCH', query: 'q', error: 'network down' },
    });

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_FAILED,
        status: 'error',
        actorType: ProgressActorType.SYSTEM,
        researchDetails: expect.objectContaining({ error: 'network down' }),
      }),
    );
  });

  it('emitResearchProgress increments sequence and stores frames in the replay buffer', () => {
    service.emitResearchProgress('thread-replay', {
      stage: AiStreamStage.RESEARCH_STARTED,
      details: { mode: 'SEARCH', query: 'q' },
    });
    service.emitResearchProgress('thread-replay', {
      stage: AiStreamStage.RESEARCH_COMPLETED,
      details: { mode: 'SEARCH', query: 'q', sourcesCount: 0 },
    });

    expect(service.getRecentEvents('thread-replay')).toEqual([
      expect.objectContaining({
        sequence: 1,
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_STARTED,
      }),
      expect.objectContaining({
        sequence: 2,
        type: StreamEventType.RESEARCH_PROGRESS,
        stage: AiStreamStage.RESEARCH_COMPLETED,
      }),
    ]);
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

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-3',
        type: StreamEventType.RESPONSE_STREAMING,
        label: 'Drafting answer',
        description: 'The selected model is producing the answer.',
        actorType: ProgressActorType.MODEL,
        actorName: 'local-ollama / qwen3:1.7b',
        provider: 'local-ollama',
        model: 'qwen3:1.7b',
        status: 'active',
      }),
    );
  });
});
