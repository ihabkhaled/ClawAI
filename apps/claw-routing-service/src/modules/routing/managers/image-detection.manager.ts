import { Injectable, Logger } from '@nestjs/common';
import { IMAGE_KEYWORDS } from '../constants/routing.constants';
import {
  ART_STYLE_INDICATORS,
  IMAGE_REFERENCE_NOUNS,
  IMAGE_REFERENCE_VERBS,
  IMAGE_VERBS,
  IMAGE_WORDS,
  STRONG_IMAGE_NOUNS,
} from '../constants/image-detection.constants';
import type { ImageDetectionResult } from '../types/image-detection.types';

/**
 * Pure classifier that decides whether a user message is asking for an
 * image to be generated. Extracted from routing.manager.ts where the
 * inline `detectImageRequest` had grown to 123 lines / complexity 22.
 *
 * This manager owns ONLY the keyword scan. Routing.manager keeps the
 * "which provider should serve the image" decision because that needs
 * connector health + fallback chain plumbing, which lives there already.
 */
@Injectable()
export class ImageDetectionManager {
  private readonly logger = new Logger(ImageDetectionManager.name);

  detect(message: string): ImageDetectionResult {
    this.logger.debug('detect: scanning message for image keywords');
    const lower = message.toLowerCase();

    const exactKeyword = IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
    const verbPlusImageWord = this.hasVerbPlusImageWord(lower);
    const strongImageNoun = this.hasStrongImageNoun(lower);
    const artStyle = this.hasArtStyle(lower);
    const reference = this.hasReferencePhrase(lower);

    const matched = exactKeyword || verbPlusImageWord || strongImageNoun || artStyle || reference;

    this.logger.debug(
      `detect: matched=${String(matched)} exact=${String(exactKeyword)} verb+word=${String(
        verbPlusImageWord,
      )} strongNoun=${String(strongImageNoun)} artStyle=${String(artStyle)} ref=${String(
        reference,
      )}`,
    );

    return {
      matched,
      exactKeyword,
      verbPlusImageWord,
      strongImageNoun,
      artStyle,
      reference,
    };
  }

  private hasVerbPlusImageWord(lower: string): boolean {
    const hasVerb = IMAGE_VERBS.some((v) => lower.includes(v));
    const hasImageWord = IMAGE_WORDS.some((w) => lower.includes(w));
    return hasVerb && hasImageWord;
  }

  private hasStrongImageNoun(lower: string): boolean {
    const hasStrongNoun = STRONG_IMAGE_NOUNS.some((n) => lower.includes(n));
    if (!hasStrongNoun) {
      return false;
    }
    const hasSupportingWord =
      IMAGE_WORDS.some((w) => lower.includes(w)) || IMAGE_VERBS.some((v) => lower.includes(v));
    return hasSupportingWord;
  }

  private hasArtStyle(lower: string): boolean {
    return ART_STYLE_INDICATORS.some((s) => lower.includes(s));
  }

  private hasReferencePhrase(lower: string): boolean {
    const hasRefVerb = IMAGE_REFERENCE_VERBS.some((v) => lower.includes(v));
    if (!hasRefVerb) {
      return false;
    }
    return IMAGE_REFERENCE_NOUNS.some((n) => lower.includes(n));
  }
}
