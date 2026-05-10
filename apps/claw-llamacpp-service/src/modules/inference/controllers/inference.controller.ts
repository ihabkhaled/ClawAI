import { Body, Controller, Post, Req, Res, UsePipes } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { Public } from '../../../app/decorators/public.decorator';
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

  @Public()
  @SkipLogging()
  @SkipThrottle()
  @Post('chat/completions')
  @UsePipes(new ZodValidationPipe(ChatCompletionSchema))
  async chatCompletions(
    @Body() body: ChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { port } = this.inferenceService.assertReady();
    await this.proxy.proxyChat(req, res, port, body);
  }

  @Public()
  @SkipLogging()
  @SkipThrottle()
  @Post('completions')
  @UsePipes(new ZodValidationPipe(ChatCompletionSchema))
  async completions(
    @Body() body: ChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { port } = this.inferenceService.assertReady();
    await this.proxy.proxyChat(req, res, port, body);
  }
}
