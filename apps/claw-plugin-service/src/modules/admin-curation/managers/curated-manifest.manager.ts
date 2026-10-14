import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { EGRESS_ALLOWED_PORTS } from '../../egress/constants/egress.constants';
import { EgressError } from '../../egress/errors/egress.error';
import { assertPublicUrl } from '../../egress/utilities/assert-public-url.utility';
import { MANIFEST_VERSION } from '../../catalog/constants/catalog.constants';
import {
  type PluginManifest,
  type PluginManifestInput,
} from '../../catalog/schemas/plugin-manifest.schema';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { CURATED_DEFAULT_INPUT_SCHEMA } from '../constants/curation.constants';
import { type CuratedAuthBody } from '../dto/curation.dto';
import { type CuratedManifestInput } from '../types/curation.types';

/**
 * Turns the admin form into a manifest and holds it to the same strict schema every stored manifest
 * is re-parsed with. The URL goes through the egress syntax guard first so a private or odd address
 * is refused with its own code before anything tries to connect.
 */
@Injectable()
export class CuratedManifestManager {
  private readonly logger = new Logger(CuratedManifestManager.name);

  /** The checked URL, or 422 PLUGIN_CURATION_URL_BLOCKED. The reason stays in the log. */
  checkUrl(raw: string): URL {
    try {
      return assertPublicUrl(raw, { allowedPorts: EGRESS_ALLOWED_PORTS }).url;
    } catch (error) {
      if (!(error instanceof EgressError)) throw error;
      this.logger.warn(`checkUrl: refused (${error.detail})`);
      throw new UnprocessableEntityException({
        message: 'That URL cannot be used for a curated server',
        errorCode: CurationErrorCode.URL_BLOCKED,
      });
    }
  }

  build(input: CuratedManifestInput): PluginManifest {
    const url = this.checkUrl(input.server.url);
    const candidate: PluginManifestInput = {
      manifestVersion: MANIFEST_VERSION,
      slug: input.slug,
      version: input.version,
      publisher: input.publisher,
      category: input.category,
      iconKey: input.iconKey,
      ...(input.homepageUrl === undefined || input.homepageUrl === ''
        ? {}
        : { homepageUrl: input.homepageUrl }),
      translations: input.translations,
      runtime: {
        kind: RuntimeKind.MCP_REMOTE,
        server: { url: url.href, transport: input.server.transport },
      },
      network: { hosts: [], publicWeb: false },
      auth: this.authFor(input.auth),
      tools: input.tools.map((tool) => ({
        name: tool.name,
        title: tool.title ?? tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema ?? CURATED_DEFAULT_INPUT_SCHEMA,
        riskLevel: tool.riskLevel,
      })),
    } as PluginManifestInput;
    const parsed = parsePluginManifest(candidate);
    if (!parsed.ok) {
      throw new UnprocessableEntityException({
        message: 'The entry does not pass manifest validation',
        errorCode: CurationErrorCode.MANIFEST_INVALID,
        errors: parsed.errors.slice(0, 20),
      });
    }
    return parsed.manifest;
  }

  private authFor(auth: CuratedAuthBody): PluginManifestInput['auth'] {
    switch (auth.kind) {
      case AuthKind.NONE:
        return { kind: AuthKind.NONE };
      case AuthKind.API_KEY:
        return { kind: AuthKind.API_KEY, headerName: auth.headerName };
      case AuthKind.BEARER_TOKEN:
        return { kind: AuthKind.BEARER_TOKEN, headerName: auth.headerName };
      case AuthKind.OAUTH2_PKCE:
        return { kind: AuthKind.OAUTH2_PKCE, oauth: { ...auth.oauth, pkce: true } };
    }
  }
}
