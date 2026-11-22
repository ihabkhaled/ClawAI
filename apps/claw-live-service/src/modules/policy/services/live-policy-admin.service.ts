import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { POLICY_HISTORY_LIMIT, UNIQUE_VIOLATION } from '../constants/live-policy-admin.constants';
import { LIVE_POLICY_ACTIVE_KEY } from '../constants/live-policy.constants';
import { LivePolicyAdminRepository } from '../repositories/live-policy-admin.repository';
import { livePolicySchema } from '../schemas/live-policy.schema';
import type {
  PolicyOverviewView,
  PolicyVersionView,
  StoredPolicyVersion,
} from '../types/live-policy-admin.types';
import { LivePolicyService } from './live-policy.service';

/**
 * Admin writes of the versioned policy. History is immutable: every change, and every rollback,
 * is a NEW version row; finalized charges keep the version they were priced under.
 */
@Injectable()
export class LivePolicyAdminService {
  constructor(
    private readonly repository: LivePolicyAdminRepository,
    private readonly policy: LivePolicyService,
  ) {}

  async overview(): Promise<PolicyOverviewView> {
    const [active, versions] = await Promise.all([
      this.repository.findActive(),
      this.repository.listRecent(POLICY_HISTORY_LIMIT),
    ]);
    return {
      active: active === null ? null : this.toView(active),
      versions: versions.map((row) => this.toView(row)),
    };
  }

  async publish(
    adminId: string,
    config: unknown,
    note: string | undefined,
  ): Promise<PolicyVersionView> {
    const parsed = livePolicySchema.safeParse(config);
    if (!parsed.success) {
      throw new BadRequestException({
        message: LiveHistoryErrorCode.POLICY_INVALID,
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || '<root>',
          message: issue.message,
        })),
      });
    }
    return this.activate(parsed.data, note ?? null, adminId);
  }

  async rollback(
    adminId: string,
    version: number,
    note: string | undefined,
  ): Promise<PolicyVersionView> {
    const source = await this.repository.findVersion(version);
    if (source === null) throw new NotFoundException(LiveHistoryErrorCode.POLICY_VERSION_NOT_FOUND);
    const parsed = livePolicySchema.safeParse(source.config);
    if (!parsed.success) {
      throw new UnprocessableEntityException(LiveHistoryErrorCode.POLICY_INVALID);
    }
    return this.activate(parsed.data, note ?? `Rollback to version ${String(version)}`, adminId);
  }

  private async activate(
    config: unknown,
    note: string | null,
    adminId: string,
  ): Promise<PolicyVersionView> {
    try {
      const row = await this.repository.createAndActivate(config, note, adminId);
      this.policy.invalidate();
      return this.toView(row);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(LiveHistoryErrorCode.POLICY_CONFLICT);
      }
      throw error;
    }
  }

  private toView(row: StoredPolicyVersion): PolicyVersionView {
    return {
      version: row.version,
      active: row.activeKey === LIVE_POLICY_ACTIVE_KEY,
      config: row.config,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
