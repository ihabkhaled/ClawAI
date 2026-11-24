import { BadGatewayException } from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { PinnedRequestError } from '../../../common/utilities/pinned-request.utility';
import { HLS_MAX_REDIRECTS } from '../constants/sources.constants';
import type { HlsHostPin } from '../types/hls-proxy.types';

/** The next URL of a redirect a CDN pin may follow, else null. */
export function followableRedirect(
  error: unknown,
  from: URL,
  pin: HlsHostPin,
  hop: number,
): URL | null {
  if (typeof pin === 'string' || hop >= HLS_MAX_REDIRECTS) return null;
  if (!(error instanceof PinnedRequestError) || error.location === null) return null;
  try {
    const next = new URL(error.location, from);
    return next.protocol === 'https:' ? next : null;
  } catch {
    return null;
  }
}

export function upstreamError(error: unknown): BadGatewayException {
  const tooLarge = error instanceof PinnedRequestError && error.code === 'TOO_LARGE';
  return new BadGatewayException(
    tooLarge ? LiveSourceErrorCode.UPSTREAM_TOO_LARGE : LiveSourceErrorCode.UPSTREAM_FAILED,
  );
}
