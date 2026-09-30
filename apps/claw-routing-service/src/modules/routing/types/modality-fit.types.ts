import type { RequiredModality } from '@claw/shared-types';

import type { ModalityFit } from '../../../common/enums/modality-fit.enum';
import type { RoutableDeploymentRecord } from './model-deployment.types';
import type { RoutingDecisionResult } from './routing.types';

/** The validated attachment fields of one `message.created` (multimodal batch 8). */
export type AttachmentModalityContext = {
  attachmentMimeTypes: string[];
  requiredModalities: RequiredModality[];
  transformableModalities: RequiredModality[];
};

/** What modality fit reads from one catalog row. */
export type ModalityFitSource = Pick<RoutableDeploymentRecord, 'modalitiesIn' | 'supportsVision'>;

/** A decision re-ordered by modality fit, plus what changed (for the log line). */
export type ModalityFitRanking = {
  decision: RoutingDecisionResult;
  reordered: boolean;
  /** Fit of the pick the path made before ranking. */
  originalFit: ModalityFit;
  /** Fit of the pick after ranking. */
  fit: ModalityFit;
};
