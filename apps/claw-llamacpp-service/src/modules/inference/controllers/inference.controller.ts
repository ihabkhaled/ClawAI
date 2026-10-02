import { Body, Controller, Post, Req, Res, UsePipes } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { AllowServiceToken } from '../../../app/decorators/allow-service-token.decorator';
import { SkipLogging } from '../../../app/decorators/skip-logging.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type ChatCompletionDto, ChatCompletionSchema } from '../dto/chat-completion.dto';
import { InferenceProxyManager } from '../managers/inference-proxy.manager';
import { InferenceService } from '../services/inference.service';

@Controller('v1')
export class InferenceController {
  constructor(
    private readonly inferenceService: InferenceService,
    private readonly proxy: InferenceProxyManager,
  ) {}

  // ADR-144: inference costs compute, so it needs a user JWT or the
  // inter-service token (chat-service). It used to be public, so anyone who
  // reached nginx could run the resident frontier model. @SkipThrottle stays:
  // these are long-lived streams, like every other SSE route.
  @AllowServiceToken()
  @SkipLogging()
  @SkipThrottle()
  @Post('chat/completions')
  @UsePipes(new ZodValidationPipe(ChatCompletionSchema))
  async chatCompletions(
    @Body() body: ChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { port } = await this.inferenceService.ensureReady(body.model);
    await this.proxy.proxyChat(req, res, port, body);
  }

  @AllowServiceToken()
  @SkipLogging()
  @SkipThrottle()
  @Post('completions')
  @UsePipes(new ZodValidationPipe(ChatCompletionSchema))
  async completions(
    @Body() body: ChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { port } = await this.inferenceService.ensureReady(body.model);
    await this.proxy.proxyChat(req, res, port, body);
  }
}
