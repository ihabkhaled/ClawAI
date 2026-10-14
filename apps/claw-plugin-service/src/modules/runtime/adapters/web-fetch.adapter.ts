import { Injectable } from '@nestjs/common';

import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { EgressError } from '../../egress/errors/egress.error';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import {
  WEB_FETCH_ACCEPT,
  WEB_FETCH_MAX_BYTES,
  WEB_FETCH_PORTS,
  WEB_FETCH_REDIRECTS,
  WEB_FETCH_USER_AGENT,
} from '../constants/runtime.constants';
import { WEB_FETCH_TOOL, WEB_FETCH_UNREACHABLE } from '../constants/web-fetch.constants';
import { AdapterError } from '../errors/adapter.error';
import {
  type AdapterContext,
  type AdapterResult,
  type PluginAdapter,
} from '../types/plugin-adapter.types';
import { extractPageText } from '../utilities/extract-page-text.utility';

/**
 * Reads the text of a public web page. The URL comes from the model, so everything the egress
 * guard does applies: https only, public addresses only (every DNS answer checked, the
 * connection pinned), and each redirect hop re-checked. A refusal and a network failure read the
 * same to the model, so the tool cannot be used to map our network.
 */
@Injectable()
export class WebFetchAdapter implements PluginAdapter {
  constructor(private readonly egress: SafeEgressManager) {}

  async execute(
    context: AdapterContext,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<AdapterResult> {
    const url = args['url'];
    if (toolName !== WEB_FETCH_TOOL || typeof url !== 'string') {
      throw new AdapterError(AdapterFailureKind.BAD_INPUT, 'Unknown tool or missing url');
    }
    try {
      const response = await this.egress.request({
        url,
        method: 'GET',
        headers: { Accept: WEB_FETCH_ACCEPT, 'User-Agent': WEB_FETCH_USER_AGENT },
        timeoutMs: context.timeoutMs,
        maxResponseBytes: WEB_FETCH_MAX_BYTES,
        signal: context.signal,
        allowedPorts: WEB_FETCH_PORTS,
        maxRedirects: WEB_FETCH_REDIRECTS,
      });
      const text = extractPageText(
        response.status,
        response.headers['content-type'] ?? '',
        response.body,
      );
      return { content: text, truncated: response.truncated };
    } catch (error) {
      throw this.refine(error);
    }
  }

  private refine(error: unknown): Error {
    if (error instanceof AdapterError) return error;
    return error instanceof EgressError && error.code === EgressErrorCode.TIMEOUT
      ? new AdapterError(AdapterFailureKind.TIMEOUT, 'The page took too long to answer')
      : new AdapterError(AdapterFailureKind.UNAVAILABLE, WEB_FETCH_UNREACHABLE);
  }
}
