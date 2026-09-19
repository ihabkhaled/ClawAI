import { Injectable, Logger } from '@nestjs/common';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { OpsTokenScope } from '../../../common/enums';
import {
  MS_PER_DAY,
  OPS_TOKEN_INVALID,
  OPS_TOKEN_MAX_ACTIVE_PER_USER,
  OPS_TOKEN_PREFIX,
} from '../constants/ops-token.constants';
import type { CreateOpsTokenDto } from '../dto/ops-token.dto';
import { OpsTokenRepository } from '../repositories/ops-token.repository';
import type { CreatedOpsToken, OpsTokenVerification, OpsTokenView } from '../types/ops-token.types';
import {
  displayPrefix,
  generateOpsToken,
  hashOpsToken,
  isOpsTokenActive,
  toOpsTokenView,
} from '../utilities/ops-token.utility';

/**
 * Read-only operator tokens for production logs and health (ADR-102).
 *
 * Created by an admin, shown once, stored as a hash, scoped, expiring,
 * revocable, and every use is counted. Nothing here ever logs a token.
 */
@Injectable()
export class OpsTokenService {
  private readonly logger = new Logger(OpsTokenService.name);

  constructor(private readonly repository: OpsTokenRepository) {}

  async create(userId: string, dto: CreateOpsTokenDto, now = new Date()): Promise<CreatedOpsToken> {
    const active = await this.repository.countActiveForUser(userId, now);
    if (active >= OPS_TOKEN_MAX_ACTIVE_PER_USER) {
      throw new BusinessException(
        `At most ${String(OPS_TOKEN_MAX_ACTIVE_PER_USER)} active ops tokens per admin`,
        'OPS_TOKEN_LIMIT_REACHED',
      );
    }
    const token = generateOpsToken();
    const row = await this.repository.create({
      name: dto.name,
      tokenHash: hashOpsToken(token),
      tokenPrefix: displayPrefix(token),
      scopes: [...new Set(dto.scopes)],
      createdByUserId: userId,
      expiresAt: new Date(now.getTime() + dto.ttlDays * MS_PER_DAY),
    });
    this.logger.log(`create: ops token ${row.id} "${row.name}" by user=${userId}`);
    return { token, view: toOpsTokenView(row, now) };
  }

  async list(now = new Date()): Promise<OpsTokenView[]> {
    return (await this.repository.listAll()).map((row) => toOpsTokenView(row, now));
  }

  async revoke(id: string, userId: string, now = new Date()): Promise<OpsTokenView> {
    const row = await this.repository.revoke(id, now);
    if (row === null) {
      throw new EntityNotFoundException('OpsAccessToken', id);
    }
    this.logger.log(`revoke: ops token ${id} by user=${userId}`);
    return toOpsTokenView(row, now);
  }

  /**
   * Is this token live and does it carry the scope? A wrong, expired,
   * revoked or unscoped token all answer the same `valid: false`, so a caller
   * learns nothing about which it was.
   */
  async verify(
    token: string,
    scope: OpsTokenScope,
    now = new Date(),
  ): Promise<OpsTokenVerification> {
    if (!token.startsWith(OPS_TOKEN_PREFIX)) {
      return OPS_TOKEN_INVALID;
    }
    const row = await this.repository.findByHash(hashOpsToken(token));
    if (row === null || !isOpsTokenActive(row, now) || !row.scopes.includes(scope)) {
      return OPS_TOKEN_INVALID;
    }
    await this.repository.recordUse(row.id, now);
    return { valid: true, tokenId: row.id, scopes: toOpsTokenView(row, now).scopes };
  }
}
