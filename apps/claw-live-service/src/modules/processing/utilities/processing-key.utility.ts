import { sha256Hex } from '../../../common/utilities/hash.utility';
import type { LiveMode, LiveSourceKind } from '../../../generated/prisma';

/**
 * `sha256(sourceKind | normalizedSourceIdentity | accessScope | mode | PIPELINE_VERSION)`
 * (architecture section 2). Viewers with the same key share one run.
 */
export function computeProcessingKey(
  sourceKind: LiveSourceKind,
  sourceIdentity: string,
  accessScope: string,
  mode: LiveMode,
  pipelineVersion: number,
): string {
  return sha256Hex(
    [sourceKind, sourceIdentity, accessScope, mode, String(pipelineVersion)].join('|'),
  );
}
