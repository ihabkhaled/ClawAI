import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  type ResearchUsageFeature,
} from '@claw/shared-entitlements';

@Injectable()
export class ResearchUsageService {
  private readonly logger = new Logger(ResearchUsageService.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter) {}

  async record(userId: string, feature: ResearchUsageFeature, requestId: string): Promise<void> {
    try {
      await this.entitlements.recordFeatureUsage({ userId, feature, requestId });
    } catch (error) {
      this.logger.warn(
        `record: feature=${feature} request=${requestId} failed: ${(error as Error).message}`,
      );
    }
  }
}
