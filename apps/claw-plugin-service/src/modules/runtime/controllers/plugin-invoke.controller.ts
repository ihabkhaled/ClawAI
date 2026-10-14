import { Body, Controller, Header, HttpCode, Post, Res } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';
import { type Response } from 'express';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { INVOKE_CACHE_CONTROL } from '../constants/runtime.constants';
import { type InvokeBody, invokeBodySchema } from '../dto/invoke.dto';
import { PluginInvokeService } from '../services/plugin-invoke.service';
import { type InvokeResponse } from '../types/invoke.types';

/**
 * Runs one plugin tool for the signed-in user. The user is the JWT user; the body never names one.
 * When the caller disconnects (Stop in the chat) the running tool is aborted.
 */
@Controller('plugins/invoke')
export class PluginInvokeController {
  constructor(private readonly invokeService: PluginInvokeService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', INVOKE_CACHE_CONTROL)
  @RequirePermissions(Permission.PLUGINS_USE)
  invoke(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(invokeBodySchema)) body: InvokeBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<InvokeResponse> {
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) controller.abort();
    });
    return this.invokeService.invoke(user.id, body, controller.signal);
  }
}
