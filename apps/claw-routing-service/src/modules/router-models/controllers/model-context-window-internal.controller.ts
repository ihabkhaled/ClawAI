import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { RouterModelsService } from '../services/router-models.service';
import { type ModelContextWindowSnapshot } from '../types/model-context-window.types';

/**
 * The model's real context window, for a sibling SERVICE.
 *
 * chat-service budgets every prompt from this. Before it existed, chat-service
 * had no access to a context window at all — `contextWindowTokens` appeared in
 * routing-service, connector-service and the frontend, and in zero files of the
 * service that decides how much conversation to send. It used the thread's
 * `maxTokens` (an OUTPUT length, default 4096) as the size of the whole prompt,
 * so a 256k model was handed roughly 16k characters of everything combined.
 * ADR-084.
 *
 * `@Public()` lifts the user JWT guard only; `ServiceTokenGuard` still does the
 * real check. Same shape as the model-cost internal route next to it.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/router-models/context-window')
export class ModelContextWindowInternalController {
  constructor(private readonly service: RouterModelsService) {}

  @Get(':provider/:model')
  async get(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ModelContextWindowSnapshot> {
    return this.service.getContextWindowSnapshot(provider, model);
  }
}
