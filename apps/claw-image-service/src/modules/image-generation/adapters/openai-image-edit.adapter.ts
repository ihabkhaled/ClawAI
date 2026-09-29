import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { ImageFailureCode } from '../../../common/enums';
import {
  extractProviderErrorMessage,
  imageFailure,
  toImageProviderException,
} from '../adapter.utilities/provider-error.utility';
import { buildOpenAIEditForm } from '../adapter.utilities/openai-image-edit-form.utility';
import {
  OPENAI_EDIT_PATH,
  OPENAI_EDIT_TIMEOUT_MS,
  PNG_MIME_TYPE,
} from '../constants/image-edit.constants';
import { type OpenAIImageEditRequest } from '../types/image-edit.types';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { OpenAIImageResponse } from '../types/openai-image.types';

const logger = new Logger('OpenAIImageEditAdapter');

/**
 * One OpenAI image EDIT: `POST /v1/images/edits` (gpt-image family) with the
 * attached image as `image[]` and, when given, a PNG alpha mask. Metered exactly
 * like a generation (one image, sized price row). Built 2026-09-26; live
 * verification deferred — the dev key has no OpenAI credit (owner).
 */
export const editWithOpenAI = async (
  request: OpenAIImageEditRequest,
): Promise<ImageProviderResponse> => {
  const baseUrl = request.baseUrl.replace(/\/+$/u, '');
  logger.log(
    `editWithOpenAI: starting — model=${request.model} size=${String(request.width)}x${String(request.height)} mask=${String(request.maskBase64 !== undefined)}`,
  );
  let response: OpenAIImageResponse;
  try {
    response = await httpPost<OpenAIImageResponse>(
      `${baseUrl}${OPENAI_EDIT_PATH}`,
      buildOpenAIEditForm(request),
      { headers: { Authorization: `Bearer ${request.apiKey}` }, timeout: OPENAI_EDIT_TIMEOUT_MS },
      declaredHost(baseUrl),
    );
  } catch (error: unknown) {
    logger.error(
      `editWithOpenAI: OpenAI refused model=${request.model} — ${extractProviderErrorMessage(error)}`,
    );
    throw toImageProviderException(error, 'OpenAI');
  }
  const first = response.data[0];
  if (first?.b64_json === undefined && first?.url === undefined) {
    logger.error('editWithOpenAI: response carried no image payload');
    throw imageFailure(ImageFailureCode.NO_IMAGE_RETURNED, 'OpenAI edit returned no image');
  }
  logger.log(`editWithOpenAI: image edited — hasBase64=${String(first.b64_json !== undefined)}`);
  return {
    imageUrl: first.url,
    imageBase64: first.b64_json,
    revisedPrompt: first.revised_prompt,
    mimeType: PNG_MIME_TYPE,
  };
};
