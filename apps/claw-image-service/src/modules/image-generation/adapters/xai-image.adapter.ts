import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { ImageFailureCode } from '../../../common/enums';
import {
  extractProviderErrorMessage,
  imageFailure,
  toImageProviderException,
} from '../adapter.utilities/provider-error.utility';
import {
  XAI_DEFAULT_IMAGE_MIME_TYPE,
  XAI_IMAGE_TIMEOUT_MS,
} from '../constants/xai-image.constants';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { XaiImageRequest, XaiImageResponse } from '../types/xai-image.types';

const logger = new Logger('XaiImageAdapter');

/**
 * One Grok Imagine image through xAI's dedicated image endpoint.
 *
 * Grok image models are NOT reachable through `/chat/completions` — xAI answers
 * that route with `invalid-argument: "The model grok-imagine-image is an image
 * model and is therefore not available on this endpoint"`, which is exactly the
 * error every Grok image request in chat used to show the user raw.
 *
 * `response_format: 'b64_json'` keeps the bytes in the response, so no second
 * download from an xAI blob host is needed and the only outbound host is the
 * connector's own base URL, declared to the SSRF guard below.
 */
export const generateWithXai = async (
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
): Promise<ImageProviderResponse> => {
  const cleanBaseUrl = baseUrl.replace(/\/+$/u, '');
  const body: XaiImageRequest = { model, prompt, n: 1, response_format: 'b64_json' };
  logger.log(`generateWithXai: starting — model=${model} promptLen=${String(prompt.length)}`);

  let response: XaiImageResponse;
  try {
    response = await httpPost<XaiImageResponse>(
      `${cleanBaseUrl}/images/generations`,
      body,
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: XAI_IMAGE_TIMEOUT_MS },
      declaredHost(cleanBaseUrl),
    );
  } catch (error: unknown) {
    logger.error(
      `generateWithXai: xAI refused model=${model} — ${extractProviderErrorMessage(error)}`,
    );
    throw toImageProviderException(error, 'xAI');
  }

  const first = response.data?.[0];
  if (first?.b64_json === undefined && first?.url === undefined) {
    logger.error(`generateWithXai: model=${model} returned no image payload`);
    throw imageFailure(ImageFailureCode.NO_IMAGE_RETURNED, 'xAI returned no image payload');
  }
  logger.log(
    `generateWithXai: image generated — model=${model} hasBase64=${String(first.b64_json !== undefined)} costTicks=${String(response.usage?.cost_in_usd_ticks ?? 'n/a')}`,
  );
  const costTicks = response.usage?.cost_in_usd_ticks;
  return {
    imageBase64: first.b64_json,
    imageUrl: first.url,
    revisedPrompt: first.revised_prompt,
    mimeType: first.mime_type ?? XAI_DEFAULT_IMAGE_MIME_TYPE,
    // Reconciliation only: the charge comes from the seeded per-image row.
    ...(costTicks === undefined ? {} : { providerCostTicks: costTicks }),
  };
};
