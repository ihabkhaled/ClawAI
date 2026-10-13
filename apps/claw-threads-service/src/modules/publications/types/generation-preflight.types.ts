import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type { ThreadGenerationRoleKind } from '../../../common/enums/thread-generation-role-kind.enum';

/** One model the generation will call, with the seat it fills. */
export type PreflightRole = {
  kind: ThreadGenerationRoleKind;
  /** The request's own role id (`author-1`, `judge`, ...). */
  roleId: string;
  /** 1-based position among the authors; 1 for judge and critic. */
  position: number;
  provider: string;
  model: string;
  /** True for a fallback behind the role's primary model. */
  isFallback: boolean;
};

/** One model seat as it arrives in the request (judge and critic share the author shape). */
export type PreflightRoleRequest = StartThreadGenerationDto['judge'];

/** A provider/model pair, used for the catalog lookup. */
export type ModelRef = { provider: string; model: string };
