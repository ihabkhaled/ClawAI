import { Body, Controller, Header, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import { type Response } from 'express';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { INVOKE_CACHE_CONTROL } from '../constants/runtime.constants';
import {
  type InternalInvokeBody,
  internalInvokeBodySchema,
  type InternalResolveBody,
  internalResolveBodySchema,
} from '../dto/internal-plugin.dto';
import { PluginInvokeService } from '../services/plugin-invoke.service';
import { PluginResolveService } from '../services/plugin-resolve.service';
import { type InvokeResponse } from '../types/invoke.types';
import { type ResolveResponse } from '../types/resolve.types';

/**
 * The service-to-service face of the runtime: chat-service resolves the tools of the plugins a
 * message mentioned and runs them for the message's owner. The credential is the shared service
 * token; the owner is named in the body and every lookup is scoped by it, exactly like the user
 * route scopes by the JWT user.
 */
@Controller('internal/plugins')
@Public()
@UseGuards(ServiceTokenGuard)
export class PluginInternalController {
  constructor(
    private readonly resolveService: PluginResolveService,
    private readonly invokeService: PluginInvokeService,
  ) {}

  @Post('resolve')
  @HttpCode(200)
  @Header('Cache-Control', INVOKE_CACHE_CONTROL)
  resolve(
    @Body(new ZodValidationPipe(internalResolveBodySchema)) body: InternalResolveBody,
  ): Promise<ResolveResponse> {
    return this.resolveService.resolve(body);
  }

  @Post('invoke')
  @HttpCode(200)
  @Header('Cache-Control', INVOKE_CACHE_CONTROL)
  invoke(
    @Body(new ZodValidationPipe(internalInvokeBodySchema)) body: InternalInvokeBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<InvokeResponse> {
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) controller.abort();
    });
    const { userId, ...call } = body;
    return this.invokeService.invoke(userId, call, controller.signal);
  }
}
