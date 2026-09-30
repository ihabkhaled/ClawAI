import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  IMAGE_ASSISTANT_MESSAGE_LINK_PATH,
  IMAGE_ASSISTANT_MESSAGE_LINK_TIMEOUT_MS,
} from '../constants/image-generation-link.constants';

/**
 * Tells image-service which assistant message shows a generation's card.
 *
 * The generation is dispatched BEFORE the assistant message exists (the
 * message is stored from the dispatch answer), so its row cannot carry the id
 * at creation; this link fills it afterwards. image-service owner-checks every
 * row and only fills an unset id. Never throws: a failed link leaves the
 * column null, exactly as before — the card itself reads `generationId` from
 * the message metadata and does not depend on it.
 */
@Injectable()
export class ImageGenerationLinkClient {
  private readonly logger = new Logger(ImageGenerationLinkClient.name);

  async linkAssistantMessage(
    generationId: string,
    userId: string,
    assistantMessageId: string,
  ): Promise<boolean> {
    try {
      const response = await httpRequest<{ linked: number }>({
        url: `${AppConfig.get().IMAGE_SERVICE_URL}${IMAGE_ASSISTANT_MESSAGE_LINK_PATH.replace(
          '{GENERATION_ID}',
          encodeURIComponent(generationId),
        )}`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { userId, assistantMessageId },
        timeoutMs: IMAGE_ASSISTANT_MESSAGE_LINK_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `linkAssistantMessage: image-service refused generation=${generationId} status=${String(response.status)}`,
        );
        return false;
      }
      this.logger.debug(
        `linkAssistantMessage: generation=${generationId} message=${assistantMessageId} rows=${String(response.data.linked)}`,
      );
      return response.data.linked > 0;
    } catch (error: unknown) {
      this.logger.warn(
        `linkAssistantMessage: generation=${generationId} unavailable — ${error instanceof Error ? error.name : 'error'}`,
      );
      return false;
    }
  }
}
