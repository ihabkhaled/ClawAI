import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';
import type { ImageProviderResponse } from '../types/image-generation.types';
import type { OpenAIImageResponse } from '../types/openai-image.types';
import { ImageFailureCode } from '../../../common/enums';
import {
  extractProviderErrorMessage,
  imageFailure,
  toImageProviderException,
} from '../adapter.utilities/provider-error.utility';

const logger = new Logger('OpenAIImageAdapter');

export const generateWithOpenAI = async (
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
  width: number,
  height: number,
  quality?: string,
  style?: string,
): Promise<ImageProviderResponse> => {
  const size = `${String(width)}x${String(height)}` as string;
  logger.log(
    `generateWithOpenAI: starting — model=${model} size=${size} quality=${quality ?? 'default'} style=${style ?? 'default'}`,
  );

  // NO `response_format`. OpenAI removed it from /images/generations and now
  // rejects the whole request with "Unknown parameter: 'response_format'" —
  // which is why every OpenAI image generation was failing with a bare 400.
  //
  // Without it each model returns its own default: dall-e-2/3 a URL,
  // gpt-image-1 always base64. Both are handled below.
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
  };

  if (quality) {
    logger.debug(`generateWithOpenAI: applying quality=${quality}`);
    body['quality'] = quality;
  }
  // `style` is a dall-e-3-only parameter; gpt-image-1 and dall-e-2 reject it
  // the same way they rejected response_format.
  if (style && model === 'dall-e-3') {
    logger.debug(`generateWithOpenAI: applying style=${style}`);
    body['style'] = style;
  }

  logger.debug(`generateWithOpenAI: sending POST to ${baseUrl}/images/generations`);
  let response: OpenAIImageResponse;
  try {
    // `baseUrl` is the admin-configured OpenAI connector base URL, so the
    // shared guard cannot know it from the environment — declare it.
    response = await httpPost<OpenAIImageResponse>(
      `${baseUrl}/images/generations`,
      body,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 120_000,
      },
      declaredHost(baseUrl),
    );
  } catch (error: unknown) {
    // OpenAI says exactly what it did not like — an unsupported size for this
    // model, an organisation that is not verified for image output, a
    // parameter the model does not accept. Swallowing that and reporting
    // "status code 400" leaves an operator with a failure and no way to tell
    // which of those it was, on a call that costs money to retry blindly.
    const detail = extractProviderErrorMessage(error);
    logger.error(`generateWithOpenAI: OpenAI refused model=${model} size=${size} — ${detail}`);
    throw toImageProviderException(error, 'OpenAI');
  }

  logger.debug(
    `generateWithOpenAI: response received — imageCount=${String(response.data.length)}`,
  );
  const firstImage = response.data[0];
  if (!firstImage) {
    logger.error('generateWithOpenAI: OpenAI returned no image data');
    throw imageFailure(ImageFailureCode.NO_IMAGE_RETURNED, 'OpenAI returned no image data');
  }

  // gpt-image-1 returns ONLY base64 and never a URL, so reading `url` alone
  // would treat a perfectly good image as an empty response.
  if (!firstImage.url && !firstImage.b64_json) {
    logger.error('generateWithOpenAI: response carried neither a URL nor base64 data');
    throw imageFailure(ImageFailureCode.NO_IMAGE_RETURNED, 'OpenAI returned no image payload');
  }

  logger.log(
    `generateWithOpenAI: image generated — hasUrl=${String(Boolean(firstImage.url))} hasBase64=${String(Boolean(firstImage.b64_json))}`,
  );
  return {
    imageUrl: firstImage.url,
    imageBase64: firstImage.b64_json,
    revisedPrompt: firstImage.revised_prompt,
    mimeType: 'image/png',
  };
};
