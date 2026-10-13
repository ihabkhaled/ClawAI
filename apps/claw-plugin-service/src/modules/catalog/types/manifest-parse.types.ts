import type { PluginManifest } from '../schemas/plugin-manifest.schema';

export type ManifestParseResult =
  { ok: true; manifest: PluginManifest } | { ok: false; errors: string[] };
