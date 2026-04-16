import type { ModelCatalogEntry } from '../../../generated/prisma';
import {
  OLLAMA_LIBRARY_BASE_URL,
  OLLAMA_REGISTRY_MANIFEST_PATH_PREFIX,
} from '../constants/catalog.constants';
import type {
  CatalogReferenceInput,
  OllamaModelNameParts,
  OllamaModelReference,
} from '../types/catalog-reference.types';

export function parseOllamaModelName(ollamaName: string): OllamaModelNameParts {
  const [rawModelName, ...tagParts] = ollamaName.split(':');
  const modelName = rawModelName?.trim().toLowerCase() ?? ollamaName.trim().toLowerCase();
  return {
    modelName,
    tag: tagParts.join(':') || 'latest',
  };
}

export function buildOllamaSlugCandidates(modelName: string): string[] {
  const baseName = modelName.trim().toLowerCase();
  const candidates = [
    baseName,
    baseName.replaceAll(/([a-z])(?=\d)/g, '$1-'),
    baseName.replaceAll(/([a-z]+)(\d+(?:\.\d+)?)/g, '$1-$2'),
  ];

  return [...new Set(candidates.filter((candidate) => candidate.length > 0))];
}

function buildOllamaLibraryUrl(modelName: string): string {
  const { modelName: parsedName } = parseOllamaModelName(modelName);
  const [slug] = buildOllamaSlugCandidates(parsedName);
  return `${OLLAMA_LIBRARY_BASE_URL}/${slug ?? parsedName}`;
}

function buildComfyUiReference(name: string): string {
  return `https://www.comfy.org/models/${name.toLowerCase()}`;
}

export function resolveCatalogSourceUrl(entry: CatalogReferenceInput): string | null {
  if (entry.sourceUrl !== undefined && entry.sourceUrl !== null && entry.sourceUrl.length > 0) {
    return entry.sourceUrl;
  }

  if (entry.ollamaName !== undefined && entry.ollamaName !== null && entry.ollamaName.length > 0) {
    return buildOllamaLibraryUrl(entry.ollamaName);
  }

  if (entry.runtime === 'COMFYUI') {
    return buildComfyUiReference(entry.name);
  }

  return null;
}

export function resolveOllamaModelReference(ollamaName: string): OllamaModelReference {
  const { modelName, tag } = parseOllamaModelName(ollamaName);
  const [slug] = buildOllamaSlugCandidates(modelName);
  const resolvedSlug = slug ?? modelName;

  return {
    slug: resolvedSlug,
    tag,
    pullName: `${resolvedSlug}:${tag}`,
    sourceUrl: `${OLLAMA_LIBRARY_BASE_URL}/${resolvedSlug}`,
    manifestPath: `${OLLAMA_REGISTRY_MANIFEST_PATH_PREFIX}/${resolvedSlug}/manifests/${encodeURIComponent(tag)}`,
  };
}

export function ensureCatalogEntryHasReference(entry: CatalogReferenceInput): void {
  const sourceUrl = resolveCatalogSourceUrl(entry);
  if (sourceUrl === null) {
    throw new Error(`Catalog entry ${entry.name}:${entry.tag} is missing a source reference`);
  }
}

export function enrichCatalogEntryReference<T extends ModelCatalogEntry>(
  entry: T,
): T & { sourceUrl: string | null } {
  return {
    ...entry,
    sourceUrl: resolveCatalogSourceUrl({
      name: entry.name,
      tag: entry.tag,
      runtime: entry.runtime,
      ollamaName: entry.ollamaName,
      sourceUrl: entry.sourceUrl,
    }),
  };
}
