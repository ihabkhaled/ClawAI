import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types';
import {
  type VscodeAuthorizationExchangeDto,
  vscodeAuthorizationExchangeSchema,
  type VscodeAuthorizationInitDto,
  vscodeAuthorizationInitSchema,
  type VscodeAuthorizationRequestDto,
  vscodeAuthorizationRequestSchema,
} from '../dto/vscode-authorization.dto';
import { VscodeAuthorizationService } from '../services/vscode-authorization.service';
import type {
  VscodeAuthorizationApproval,
  VscodeAuthorizationDetails,
  VscodeAuthorizationExchangeResult,
  VscodeAuthorizationInitResult,
} from '../types/vscode-authorization.types';

@Controller('auth/vscode')
export class VscodeAuthorizationController {
  constructor(private readonly authorization: VscodeAuthorizationService) {}

  @Public()
  @Post('authorize/init')
  @HttpCode(HttpStatus.CREATED)
  async initialize(
    @Body(new ZodValidationPipe(vscodeAuthorizationInitSchema)) dto: VscodeAuthorizationInitDto,
  ): Promise<VscodeAuthorizationInitResult> {
    return this.authorization.initialize(dto);
  }

  @Post('authorize/details')
  @HttpCode(HttpStatus.OK)
  async details(
    @Body(new ZodValidationPipe(vscodeAuthorizationRequestSchema))
    dto: VscodeAuthorizationRequestDto,
  ): Promise<VscodeAuthorizationDetails> {
    return this.authorization.details(dto.requestId);
  }

  @Post('authorize/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Body(new ZodValidationPipe(vscodeAuthorizationRequestSchema))
    dto: VscodeAuthorizationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VscodeAuthorizationApproval> {
    return this.authorization.approve(dto.requestId, user.id);
  }

  @Public()
  @Post('authorize/exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body(new ZodValidationPipe(vscodeAuthorizationExchangeSchema))
    dto: VscodeAuthorizationExchangeDto,
  ): Promise<VscodeAuthorizationExchangeResult> {
    return this.authorization.exchange(dto.code, dto.codeVerifier);
  }
}
