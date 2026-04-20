import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Query } from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { PairingService } from '../services/pairing.service';
import { DeviceCodeService } from '../services/device-code.service';
import { RefreshService } from '../services/refresh.service';
import { type PairInitDto, pairInitSchema } from '../dto/pair-init.dto';
import { type PairApproveDto, pairApproveSchema } from '../dto/pair-approve.dto';
import { type PairDenyDto, pairDenySchema } from '../dto/pair-deny.dto';
import { type PairPollQueryDto, pairPollQuerySchema } from '../dto/pair-poll.dto';
import { type DeviceCodeCreateDto, deviceCodeCreateSchema } from '../dto/device-code-create.dto';
import { type DeviceCodeTokenDto, deviceCodeTokenSchema } from '../dto/device-code-token.dto';
import {
  type DeviceCodeApproveDto,
  deviceCodeApproveSchema,
  type DeviceCodeDenyDto,
  deviceCodeDenySchema,
} from '../dto/device-code-approve.dto';
import { type RefreshDto, refreshSchema } from '../dto/refresh.dto';
import type {
  DeviceCodeCreateResult,
  DeviceCodeTokenResponse,
  DeviceCodeTokenResult,
  IssuedTokenPair,
  PairApproveResult,
  PairInitResult,
  PairPollResult,
} from '../types/agent.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/auth')
export class AgentAuthController {
  constructor(
    private readonly pairingService: PairingService,
    private readonly deviceCodeService: DeviceCodeService,
    private readonly refreshService: RefreshService,
  ) {}

  @Post('pair/init')
  @HttpCode(HttpStatus.OK)
  @Public()
  async pairInit(
    @Body(new ZodValidationPipe(pairInitSchema)) dto: PairInitDto,
  ): Promise<PairInitResult> {
    return this.pairingService.initiate(dto);
  }

  @Post('pair/approve')
  async pairApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pairApproveSchema)) dto: PairApproveDto,
  ): Promise<PairApproveResult> {
    return this.pairingService.approve(user.id, dto.pairingCode, dto.scopes, dto.deviceName);
  }

  @Post('pair/deny')
  @HttpCode(HttpStatus.OK)
  async pairDeny(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pairDenySchema)) dto: PairDenyDto,
  ): Promise<{ ok: true }> {
    await this.pairingService.deny(user.id, dto.pairingCode);
    return { ok: true };
  }

  @Post('pair/poll')
  @HttpCode(HttpStatus.OK)
  @Public()
  async pairPoll(
    @Ip() ip: string,
    @Query(new ZodValidationPipe(pairPollQuerySchema)) query: PairPollQueryDto,
  ): Promise<PairPollResult> {
    return this.pairingService.poll(query.pairingCode, ip ?? null);
  }

  @Post('device-code/create')
  @HttpCode(HttpStatus.OK)
  @Public()
  async deviceCodeCreate(
    @Body(new ZodValidationPipe(deviceCodeCreateSchema)) dto: DeviceCodeCreateDto,
  ): Promise<DeviceCodeCreateResult> {
    return this.deviceCodeService.create(dto);
  }

  @Post('device-code/token')
  @HttpCode(HttpStatus.OK)
  @Public()
  async deviceCodeToken(
    @Ip() ip: string,
    @Body(new ZodValidationPipe(deviceCodeTokenSchema)) dto: DeviceCodeTokenDto,
  ): Promise<DeviceCodeTokenResponse> {
    const result: DeviceCodeTokenResult = await this.deviceCodeService.exchange(
      dto.deviceCode,
      ip ?? null,
    );
    if (result.success) return result.tokens;
    return { error: result.code };
  }

  @Post('device-code/approve')
  async deviceCodeApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(deviceCodeApproveSchema)) dto: DeviceCodeApproveDto,
  ): Promise<PairApproveResult> {
    return this.deviceCodeService.approve(user.id, dto.userCode, dto.scopes, dto.deviceName);
  }

  @Post('device-code/deny')
  @HttpCode(HttpStatus.OK)
  async deviceCodeDeny(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(deviceCodeDenySchema)) dto: DeviceCodeDenyDto,
  ): Promise<{ ok: true }> {
    await this.deviceCodeService.deny(user.id, dto.userCode);
    return { ok: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  async refresh(
    @Ip() ip: string,
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
  ): Promise<IssuedTokenPair> {
    return this.refreshService.refresh(dto.refreshToken, ip ?? null);
  }
}
