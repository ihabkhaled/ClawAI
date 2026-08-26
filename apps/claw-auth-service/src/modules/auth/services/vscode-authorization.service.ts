import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import { UserStatus } from '../../../common/enums';
import {
  VSCODE_AUTHORIZATION_CLIENT_KIND,
  VSCODE_AUTHORIZATION_CODE_PREFIX,
  VSCODE_AUTHORIZATION_CODE_TTL_SECONDS,
  VSCODE_AUTHORIZATION_PATH,
  VSCODE_AUTHORIZATION_REQUEST_PREFIX,
  VSCODE_AUTHORIZATION_REQUEST_TTL_SECONDS,
} from '../constants/vscode-authorization.constants';
import {
  vscodeAuthorizationCodeRecordSchema,
  vscodeAuthorizationInitSchema,
} from '../dto/vscode-authorization.dto';
import { TokenSessionManager } from '../managers/token-session.manager';
import { AuthRepository } from '../repositories/auth.repository';
import type {
  VscodeAuthorizationApproval,
  VscodeAuthorizationCodeRecord,
  VscodeAuthorizationDetails,
  VscodeAuthorizationExchangeResult,
  VscodeAuthorizationInitResult,
  VscodeAuthorizationRequestRecord,
} from '../types/vscode-authorization.types';
import {
  isAllowedVscodeCallback,
  matchesPkceChallenge,
} from '../utilities/vscode-authorization.utility';

@Injectable()
export class VscodeAuthorizationService {
  constructor(
    private readonly redis: RedisService,
    private readonly authRepository: AuthRepository,
    private readonly tokenSessionManager: TokenSessionManager,
  ) {}

  async initialize(
    input: VscodeAuthorizationRequestRecord,
  ): Promise<VscodeAuthorizationInitResult> {
    if (!isAllowedVscodeCallback(input.callbackUri)) {
      throw new BadRequestException('Unsupported VS Code callback URI.');
    }
    const requestId = randomBytes(32).toString('base64url');
    await this.redis.set(
      `${VSCODE_AUTHORIZATION_REQUEST_PREFIX}${requestId}`,
      JSON.stringify(input),
      VSCODE_AUTHORIZATION_REQUEST_TTL_SECONDS,
    );
    return {
      authorizationPath: `${VSCODE_AUTHORIZATION_PATH}?requestId=${requestId}`,
      expiresIn: VSCODE_AUTHORIZATION_REQUEST_TTL_SECONDS,
      requestId,
    };
  }

  async details(requestId: string): Promise<VscodeAuthorizationDetails> {
    const request = await this.getRequest(requestId);
    return {
      clientName: request.clientName,
      expiresIn: VSCODE_AUTHORIZATION_REQUEST_TTL_SECONDS,
    };
  }

  async approve(requestId: string, userId: string): Promise<VscodeAuthorizationApproval> {
    const requestKey = `${VSCODE_AUTHORIZATION_REQUEST_PREFIX}${requestId}`;
    const serialized = await this.redis.getClient().getdel(requestKey);
    if (serialized === null) {
      throw new GoneException('This VS Code authorization request has expired.');
    }
    const request = this.parseRequest(serialized);
    const code = randomBytes(32).toString('base64url');
    const codeRecord: VscodeAuthorizationCodeRecord = {
      clientName: request.clientName,
      codeChallenge: request.codeChallenge,
      userId,
    };
    await this.redis.set(
      `${VSCODE_AUTHORIZATION_CODE_PREFIX}${code}`,
      JSON.stringify(codeRecord),
      VSCODE_AUTHORIZATION_CODE_TTL_SECONDS,
    );
    const redirect = new URL(request.callbackUri);
    redirect.searchParams.set('code', code);
    redirect.searchParams.set('state', request.state);
    return { redirectUri: redirect.toString() };
  }

  async exchange(code: string, verifier: string): Promise<VscodeAuthorizationExchangeResult> {
    const serialized = await this.redis
      .getClient()
      .getdel(`${VSCODE_AUTHORIZATION_CODE_PREFIX}${code}`);
    if (serialized === null) {
      throw new UnauthorizedException('The VS Code authorization code is invalid or expired.');
    }
    const record = this.parseCode(serialized);
    if (!matchesPkceChallenge(verifier, record.codeChallenge)) {
      throw new UnauthorizedException('The VS Code authorization code could not be verified.');
    }
    const user = await this.authRepository.findUserById(record.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('The ClawAI account is not active.');
    }
    const tokens = await this.tokenSessionManager.issue(user, {
      kind: VSCODE_AUTHORIZATION_CLIENT_KIND,
      name: record.clientName,
    });
    // The account travels with the tokens so the extension can tell a second
    // window of the SAME user from a different account taking over the shared
    // session slot. Only the id: nothing here needs the email or the name.
    return { tokens, accountId: user.id };
  }

  private async getRequest(requestId: string): Promise<VscodeAuthorizationRequestRecord> {
    const serialized = await this.redis.get(`${VSCODE_AUTHORIZATION_REQUEST_PREFIX}${requestId}`);
    if (serialized === null) {
      throw new NotFoundException('VS Code authorization request not found.');
    }
    return this.parseRequest(serialized);
  }

  private parseRequest(serialized: string): VscodeAuthorizationRequestRecord {
    const value: unknown = JSON.parse(serialized);
    const parsed = vscodeAuthorizationInitSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException('Invalid VS Code authorization request.');
    }
    return parsed.data;
  }

  private parseCode(serialized: string): VscodeAuthorizationCodeRecord {
    const value: unknown = JSON.parse(serialized);
    const parsed = vscodeAuthorizationCodeRecordSchema.safeParse(value);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid VS Code authorization code.');
    }
    return parsed.data;
  }
}
