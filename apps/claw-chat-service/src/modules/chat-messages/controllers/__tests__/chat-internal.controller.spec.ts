import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import type { ChatExecutionManager } from '../../managers/chat-execution.manager';
import type { ModelAuthorizationMetricsService } from '../../services/model-authorization-metrics.service';
import type { InternalGenerateDto } from '../../dto/internal-generate.dto';
import type { InternalGenerateResponse, NdjsonResponse } from '../../types/internal-generate.types';
import { ChatInternalController } from '../chat-internal.controller';

const DTO: InternalGenerateDto = {
  userId: 'user-1',
  requestId: 'job-1:author-1:round-1',
  threadJobBudgetId: 'budget-1',
  surface: PaygSurface.THREADS,
  provider: 'OLLAMA',
  model: 'kimi',
  systemPrompt: 'sys',
  userPrompt: 'go',
};

const RESULT: InternalGenerateResponse = {
  content: 'draft',
  provider: 'OLLAMA',
  model: 'kimi',
  durationMs: 5,
  clamped: false,
};

class FakeResponse extends EventEmitter implements NdjsonResponse {
  writableEnded = false;
  destroyed = false;
  statusCode = 0;
  readonly written: string[] = [];
  setHeader(): this {
    return this;
  }
  flushHeaders(): void {}
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
  end(): this {
    this.writableEnded = true;
    return this;
  }
}

describe('ChatInternalController', () => {
  it('requires service authentication for provider generation', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ChatInternalController.prototype.generate);

    expect(guards).toContain(ServiceTokenGuard);
  });

  it('requires service authentication for the streaming variant too', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ChatInternalController.prototype.generateStream,
    );

    expect(guards).toContain(ServiceTokenGuard);
  });

  it('streams the stream variant through generateOnceStream and ends with the result line', async () => {
    const generateOnceStream = vi.fn().mockResolvedValue(RESULT);
    const controller = new ChatInternalController(
      { generateOnceStream } as unknown as ChatExecutionManager,
      {} as unknown as ModelAuthorizationMetricsService,
    );
    const response = new FakeResponse();

    // The Express response is structurally an NdjsonResponse; the double is too.
    await controller.generateStream(DTO, response as never);

    expect(generateOnceStream).toHaveBeenCalledWith(
      DTO,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        onActivity: expect.any(Function),
      }),
    );
    expect(response.written.join('')).toBe(`${JSON.stringify({ type: 'result', data: RESULT })}\n`);
  });

  it('leaves the old endpoint on generateOnce', async () => {
    const generateOnce = vi.fn().mockResolvedValue(RESULT);
    const controller = new ChatInternalController(
      { generateOnce } as unknown as ChatExecutionManager,
      {} as unknown as ModelAuthorizationMetricsService,
    );

    await expect(controller.generate(DTO)).resolves.toBe(RESULT);
    expect(generateOnce).toHaveBeenCalledWith(DTO);
  });
});
