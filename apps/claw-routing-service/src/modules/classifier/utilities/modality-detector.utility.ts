import { ModalityKind } from '../../../generated/prisma';
import {
  IMAGE_GEN_REGEX,
  MIME_TO_MODALITY,
  STRUCTURED_OUT_REGEX,
  URL_REGEX,
  YOUTUBE_REGEX,
} from '../constants/domain-keywords.constants';
import { type ModalityDetection } from '../types/classification.types';

export function detectModalities(message: string, attachedMimeTypes?: string[]): ModalityDetection {
  const inSet = new Set<ModalityKind>([ModalityKind.TEXT]);
  const outSet = new Set<ModalityKind>([ModalityKind.TEXT]);
  const reasons: string[] = [];

  if (attachedMimeTypes !== undefined && attachedMimeTypes.length > 0) {
    for (const mime of attachedMimeTypes) {
      const hit = MIME_TO_MODALITY.find((entry) => entry.pattern.test(mime));
      if (hit !== undefined) {
        const modality = ModalityKind[hit.modalityIn];
        inSet.add(modality);
        reasons.push(`mime:${hit.modalityIn}`);
      } else {
        inSet.add(ModalityKind.FILE_INPUT);
        reasons.push('mime:file_unknown');
      }
    }
  }

  if (YOUTUBE_REGEX.test(message)) {
    inSet.add(ModalityKind.YOUTUBE_INPUT);
    reasons.push('youtube_url_detected');
  } else if (URL_REGEX.test(message)) {
    inSet.add(ModalityKind.WEB_INPUT);
    reasons.push('web_url_detected');
  }

  if (IMAGE_GEN_REGEX.test(message)) {
    outSet.add(ModalityKind.IMAGE_OUTPUT);
    reasons.push('image_generation_intent');
  }

  if (STRUCTURED_OUT_REGEX.test(message)) {
    outSet.add(ModalityKind.STRUCTURED_OUTPUT);
    reasons.push('structured_output_intent');
  }

  return {
    modalityIn: [...inSet],
    modalityOut: [...outSet],
    modalityReasons: reasons,
  };
}
