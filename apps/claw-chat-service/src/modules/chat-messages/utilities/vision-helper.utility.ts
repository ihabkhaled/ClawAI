import { APPROX_CHARS_PER_TOKEN } from '../../../common/constants/execution.constants';
import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { VisionHelperOutcome } from '../../../common/enums/vision-helper-outcome.enum';
import {
  DELIVERY_REASON_NO_VISION,
  DELIVERY_REASON_VISION_HELPER_FAILED,
  DELIVERY_REASON_VISION_HELPER_LIMIT,
  DELIVERY_REASON_VISION_HELPER_REFUSED,
} from '../constants/attachment-delivery.constants';
import { FILE_FIT_BUDGET_SHARE } from '../constants/evidence-fit.constants';
import { ROUTING_TO_CHAT_PROVIDER } from '../constants/file-writer.constants';
import { IMAGE_MIME_PREFIX } from '../constants/file-delivery.constants';
import {
  DERIVED_OBSERVATIONS_BEGIN,
  DERIVED_OBSERVATIONS_END,
  DERIVED_OBSERVATIONS_GUIDANCE,
  DERIVED_OBSERVATIONS_HEADER,
  DERIVED_OBSERVATIONS_MARKER_PATTERN,
  DERIVED_OBSERVATIONS_MARKER_REPLACEMENT,
  VISION_HELPER_DEFAULT_TIMEOUT_MS,
  VISION_HELPER_IMAGE_REJECTION_PATTERN,
  VISION_HELPER_LOCAL_PROVIDERS,
  VISION_HELPER_REFUSED_NOTE,
} from '../constants/vision-helper.constants';
import type {
  AttachmentDeliveryDecision,
  AttachmentDeliveryPlan,
} from '../types/attachment-delivery.types';
import type { AssembledContext } from '../types/context.types';
import type {
  DerivedImageObservation,
  LaneFileShareFit,
  VisionHelperCandidate,
  VisionHelperCandidateWire,
  VisionHelperResult,
} from '../types/vision-helper.types';
import { fitTextsToBudget } from './text-budget.utility';

/**
 * The hold key for one helper attempt. The first attempt is
 * `${turn}:vision:${fileId}` — stable, so every lane of the turn that reaches
 * it reuses one reservation; a fall-through to the next candidate is a second
 * paid call and gets its own key (rule 37 item 15).
 */
export function visionHelperRequestId(turnKey: string, fileId: string, attempt: number): string {
  return attempt === 0
    ? `${turnKey}:vision:${fileId}`
    : `${turnKey}:vision:${fileId}:attempt:${String(attempt + 1)}`;
}

/** routing-service rows in chat-service's provider vocabulary, local-only when the turn demands it. */
export function toVisionHelperCandidates(
  wire: readonly VisionHelperCandidateWire[],
  localOnly: boolean,
): VisionHelperCandidate[] {
  return wire
    .map((candidate) => ({
      provider: ROUTING_TO_CHAT_PROVIDER[candidate.provider] ?? candidate.provider,
      model: candidate.modelAlias,
      timeoutMs: candidate.timeoutMs > 0 ? candidate.timeoutMs : VISION_HELPER_DEFAULT_TIMEOUT_MS,
      maxTokens: candidate.maxTokens,
    }))
    .filter((candidate) => !localOnly || VISION_HELPER_LOCAL_PROVIDERS.has(candidate.provider));
}

/** Images this lane was NOT sent because its model cannot see — the seam the helper upgrades. */
export function blindImageDecisions(plan: AttachmentDeliveryPlan): AttachmentDeliveryDecision[] {
  return plan.decisions.filter(
    (decision) =>
      decision.mode === FileDeliveryMode.OMITTED_NO_VISION &&
      decision.reason === DELIVERY_REASON_NO_VISION &&
      decision.mimeType.toLowerCase().startsWith(IMAGE_MIME_PREFIX),
  );
}

/** A provider error about the image itself, which the next candidate may accept. */
export function isImageRejectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return VISION_HELPER_IMAGE_REJECTION_PATTERN.test(message);
}

/**
 * The lane's file text after the helper ran, fitted to ONE budget: the
 * window's file share (rule 51 item 4, `FILE_FIT_BUDGET_SHARE`). The
 * descriptions and the other files' extracted text are fitted together,
 * descriptions ranked first — the image is what this turn is about, and it was
 * paid for — so the total never exceeds the share the files had before. A
 * described image's OCR text is replaced by its description, so it is not
 * counted twice.
 */
export function fitLaneFileShare(
  context: Pick<AssembledContext, 'modelBudget' | 'fileContents'>,
  observations: readonly DerivedImageObservation[],
): LaneFileShareFit {
  const inputTokens = Math.max(
    0,
    context.modelBudget.contextWindowTokens - context.modelBudget.reservedOutputTokens,
  );
  const share = Math.floor(inputTokens * APPROX_CHARS_PER_TOKEN * FILE_FIT_BUDGET_SHARE);
  const describedIds = new Set(observations.map((observation) => observation.fileId));
  const others = context.fileContents.filter(
    (file) => !describedIds.has(file.id) && (file.extractedText ?? '').length > 0,
  );
  const fitted = fitTextsToBudget(
    [
      ...observations.map((observation) => observation.text),
      ...others.map((file) => file.extractedText ?? ''),
    ],
    share,
  );
  const derivedImages = observations
    .slice(0, Math.min(observations.length, fitted.texts.length))
    .map((observation, index) => ({ ...observation, text: fitted.texts.at(index) ?? '' }));
  const otherTexts = new Map(
    others.map((file, index) => [file.id, fitted.texts.at(observations.length + index) ?? '']),
  );
  return {
    derivedImages,
    fileContents: context.fileContents.map((file) => {
      const text = otherTexts.get(file.id);
      return text === undefined ? file : { ...file, extractedText: text };
    }),
  };
}

/**
 * The lane's plan after the helper ran: images in `derivedImages` (already
 * fitted by `fitLaneFileShare`) become DERIVED_IMAGE_TEXT naming the helper;
 * the rest keep OMITTED_NO_VISION with the reason they were not described.
 */
export function applyVisionHelperResults(
  plan: AttachmentDeliveryPlan,
  results: readonly VisionHelperResult[],
  overLimitFileIds: readonly string[],
  derivedImages: readonly DerivedImageObservation[],
): AttachmentDeliveryPlan {
  return {
    ...plan,
    decisions: plan.decisions.map((decision) =>
      upgradeDecision(decision, results, derivedImages, overLimitFileIds),
    ),
    derivedImages: [...derivedImages],
    helperExecutions: results.flatMap((result) => result.executions),
  };
}

function upgradeDecision(
  decision: AttachmentDeliveryDecision,
  results: readonly VisionHelperResult[],
  derivedImages: readonly DerivedImageObservation[],
  overLimitFileIds: readonly string[],
): AttachmentDeliveryDecision {
  const derived = derivedImages.find((observation) => observation.fileId === decision.fileId);
  if (derived !== undefined) {
    const { reason: _reason, ...rest } = decision;
    return {
      ...rest,
      mode: FileDeliveryMode.DERIVED_IMAGE_TEXT,
      helperProvider: derived.helperProvider,
      helperModel: derived.helperModel,
    };
  }
  const result = results.find((candidate) => candidate.fileId === decision.fileId);
  if (result !== undefined) {
    return { ...decision, reason: notDescribedReason(result) };
  }
  return overLimitFileIds.includes(decision.fileId)
    ? { ...decision, reason: DELIVERY_REASON_VISION_HELPER_LIMIT }
    : decision;
}

function notDescribedReason(result: VisionHelperResult): string {
  if (result.outcome === VisionHelperOutcome.REFUSED) {
    return DELIVERY_REASON_VISION_HELPER_REFUSED;
  }
  // Described, but the window's file share could not hold it beside the rest.
  return result.observation === undefined
    ? DELIVERY_REASON_VISION_HELPER_FAILED
    : DELIVERY_REASON_VISION_HELPER_LIMIT;
}

/** The helper's text with any delimiter it wrote removed, so it cannot close the block early. */
export function sanitizeObservations(text: string): string {
  return text.replace(DERIVED_OBSERVATIONS_MARKER_PATTERN, DERIVED_OBSERVATIONS_MARKER_REPLACEMENT);
}

/** The framed block a blind lane receives in place of the image. */
export function formatDerivedImageBlock(observation: DerivedImageObservation): string {
  return [
    DERIVED_OBSERVATIONS_HEADER.replace('{PROVIDER}', observation.helperProvider).replace(
      '{MODEL}',
      observation.helperModel,
    ),
    `Image: ${observation.filename}`,
    DERIVED_OBSERVATIONS_BEGIN,
    sanitizeObservations(observation.text),
    DERIVED_OBSERVATIONS_END,
    DERIVED_OBSERVATIONS_GUIDANCE,
  ].join('\n');
}

/** This lane's description of one image, when the helper produced one. */
export function derivedObservationFor(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
  fileId: string,
): DerivedImageObservation | undefined {
  return context.attachmentDelivery?.derivedImages?.find(
    (observation) => observation.fileId === fileId,
  );
}

/** The extra sentence a blind lane gets when the helper was refused for credit. */
export function visionHelperNoteFor(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
  fileId: string,
): string | undefined {
  const decision = context.attachmentDelivery?.decisions.find(
    (candidate) => candidate.fileId === fileId,
  );
  return decision?.reason === DELIVERY_REASON_VISION_HELPER_REFUSED
    ? VISION_HELPER_REFUSED_NOTE
    : undefined;
}
