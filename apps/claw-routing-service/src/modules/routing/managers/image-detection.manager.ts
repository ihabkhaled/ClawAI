import { Injectable, Logger } from '@nestjs/common';
import { detectImageGenerationSignals } from '@claw/shared-utilities';
import type { ImageDetectionResult } from '../types/image-detection.types';

/**
 * Decides whether a user message asks for an image to be GENERATED.
 *
 * The keyword tables and the scan live in `@claw/shared-utilities`
 * (`detectImageGenerationSignals`, image-intent/) since 2026-09-26, so the
 * generation decision here and the edit decision (`classifyImageIntent`, used
 * by routing and chat-service) read ONE table. This manager keeps the log line.
 *
 * Routing.manager keeps the "which provider should serve the image" decision
 * because that needs connector health + fallback chain plumbing.
 */
@Injectable()
export class ImageDetectionManager {
  private readonly logger = new Logger(ImageDetectionManager.name);

  detect(message: string): ImageDetectionResult {
    const result = detectImageGenerationSignals(message);
    this.logger.debug(
      `detect: matched=${String(result.matched)} exact=${String(result.exactKeyword)} verb+word=${String(
        result.verbPlusImageWord,
      )} strongNoun=${String(result.strongImageNoun)} artStyle=${String(result.artStyle)} ref=${String(
        result.reference,
      )}`,
    );
    return result;
  }
}
