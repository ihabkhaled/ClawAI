import { MANIFEST_MAX_BYTES } from '../constants/catalog.constants';
import { pluginManifestSchema } from '../schemas/plugin-manifest.schema';
import { type ManifestParseResult } from '../types/manifest-parse.types';

function byteSize(input: unknown): number | null {
  try {
    const serialised = JSON.stringify(input);
    return serialised === undefined ? null : Buffer.byteLength(serialised, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Validates untrusted manifest JSON. Refuses oversized or non-serialisable
 * input before the schema walks it, then returns either the parsed manifest
 * (defaults applied) or a flat list of "path: message" problems.
 */
export function parsePluginManifest(input: unknown): ManifestParseResult {
  const bytes = byteSize(input);
  if (bytes === null) return { ok: false, errors: ['manifest is not serialisable JSON'] };
  if (bytes > MANIFEST_MAX_BYTES) return { ok: false, errors: ['manifest is too large'] };
  const result = pluginManifestSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`,
      ),
    };
  }
  return { ok: true, manifest: result.data };
}
