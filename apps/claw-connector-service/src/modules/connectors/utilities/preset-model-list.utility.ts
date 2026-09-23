import {
  CLOUDFLARE_TEXT_GENERATION_TASK,
  COHERE_CHAT_ENDPOINT,
  CONNECTOR_PRESET_CHAT_MODEL_TYPES,
  CONNECTOR_PRESET_CHAT_TAGS,
  CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN,
  CONNECTOR_PRESET_TOOL_TAGS,
  CONNECTOR_PRESET_VISION_TAGS,
} from '@claw/shared-utilities';
import { ConnectorModelsResponseFormat, type ConnectorPreset } from '@claw/shared-types';
import { ModelLifecycle } from '../../../generated/prisma';
import {
  bareModelListSchema,
  cloudflareModelEntrySchema,
  cloudflareModelListSchema,
  cohereModelEntrySchema,
  cohereModelListSchema,
  type OpenAICompatibleModelEntry,
  openAICompatibleModelEntrySchema,
  openAICompatibleModelListSchema,
} from '../dto/provider-model-list.dto';
import { type NormalizedModel } from '../types/connectors.types';
import { type PresetModelListEntry } from '../types/provider-api.types';
import { formatModelDisplayName } from './model-display-name.utility';

/**
 * Flattens any preset's model-list body into one entry shape (ADR-116).
 *
 * Throws when the envelope itself is wrong — a provider that changed its
 * response shape must fail the sync loudly rather than "succeed" with zero
 * models and silently unexpose everything. Individual malformed entries are
 * skipped instead, so one odd model cannot hide the rest.
 */
export function parsePresetModelList(
  format: ConnectorModelsResponseFormat,
  body: unknown,
): PresetModelListEntry[] {
  switch (format) {
    case ConnectorModelsResponseFormat.OPENAI_LIST: {
      return parseOpenAIEntries(
        expectEnvelope(openAICompatibleModelListSchema.safeParse(body)).data,
      );
    }
    case ConnectorModelsResponseFormat.BARE_ARRAY: {
      return parseOpenAIEntries(expectEnvelope(bareModelListSchema.safeParse(body)));
    }
    case ConnectorModelsResponseFormat.COHERE_MODELS: {
      return parseCohereEntries(expectEnvelope(cohereModelListSchema.safeParse(body)).models);
    }
    case ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH: {
      return parseCloudflareEntries(
        expectEnvelope(cloudflareModelListSchema.safeParse(body)).result,
      );
    }
  }
}

/** True when a listed model can answer a chat turn. Any explicit signal wins over the id. */
export function isPresetChatModel(entry: PresetModelListEntry): boolean {
  if (entry.active === false || entry.completionChat === false) {
    return false;
  }
  if (entry.outputModalities.length > 0 && !entry.outputModalities.includes('text')) {
    return false;
  }
  if (entry.type !== undefined) {
    if (!CONNECTOR_PRESET_CHAT_MODEL_TYPES.includes(entry.type.toLowerCase())) {
      return false;
    }
  } else if (entry.tags.length > 0 && !hasAny(entry.tags, CONNECTOR_PRESET_CHAT_TAGS)) {
    // Tags decide only when no `type` does: DeepInfra's tags ARE its type
    // (`chat`, `embed`, `tts`), while Vercel's (`reasoning`, `vision`) are
    // features of a model whose `type` already said it chats.
    return false;
  }
  if (entry.endpoints !== undefined && !entry.endpoints.includes(COHERE_CHAT_ENDPOINT)) {
    return false;
  }
  return entry.taskName !== undefined && entry.taskName !== CLOUDFLARE_TEXT_GENERATION_TASK
    ? false
    : !CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN.test(entry.id);
}

/**
 * Whether a model accepts images. The provider's own report wins; the preset's
 * narrow id pattern is the fallback for providers that report no modality.
 */
export function presetModelSupportsVision(
  entry: PresetModelListEntry,
  preset: ConnectorPreset,
): boolean {
  return entry.vision === true ||
    entry.inputModalities.includes('image') ||
    hasAny(entry.tags, CONNECTOR_PRESET_VISION_TAGS)
    ? true
    : (preset.visionModelPattern?.test(entry.id.toLowerCase()) ?? false);
}

/**
 * Whether a model accepts native tools — only when the provider says so. No
 * report means "unknown", recorded as false: routing an agent run to a model
 * that silently ignores `tools` is worse than not routing it there.
 */
export function presetModelSupportsTools(
  entry: PresetModelListEntry,
  preset: ConnectorPreset,
): boolean {
  return !preset.supportsNativeTools
    ? false
    : entry.functionCalling === true ||
        entry.supportedParameters.includes('tools') ||
        hasAny(entry.tags, CONNECTOR_PRESET_TOOL_TAGS);
}

/** One listed chat model as a ConnectorModel row. */
export function toNormalizedPresetModel(
  entry: PresetModelListEntry,
  preset: ConnectorPreset,
): NormalizedModel {
  const supportsTools = presetModelSupportsTools(entry, preset);
  return {
    modelKey: entry.id,
    displayName: entry.name ?? formatModelDisplayName(entry.id),
    lifecycle: entry.isDeprecated === true ? ModelLifecycle.DEPRECATED : ModelLifecycle.ACTIVE,
    capabilities: {
      supportsStreaming: true,
      supportsTools,
      supportsVision: presetModelSupportsVision(entry, preset),
      supportsAudio: false,
      supportsStructuredOutput: supportsTools,
      ...(entry.contextWindow === undefined ? {} : { maxContextTokens: entry.contextWindow }),
    },
  };
}

/** The documented catalogue of a preset with no usable list endpoint. */
export function staticPresetModels(preset: ConnectorPreset): NormalizedModel[] {
  return preset.staticModels.map((id) =>
    toNormalizedPresetModel(
      { id, tags: [], inputModalities: [], outputModalities: [], supportedParameters: [] },
      preset,
    ),
  );
}

function expectEnvelope<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) {
    throw new Error('Provider model list has an unexpected shape');
  }
  return result.data;
}

function parseOpenAIEntries(rows: readonly unknown[]): PresetModelListEntry[] {
  return rows.flatMap((row) => {
    const parsed = openAICompatibleModelEntrySchema.safeParse(row);
    return parsed.success ? [fromOpenAIEntry(parsed.data)] : [];
  });
}

function fromOpenAIEntry(entry: OpenAICompatibleModelEntry): PresetModelListEntry {
  const contextWindow =
    entry.context_length ?? entry.context_window ?? entry.metadata?.context_length ?? undefined;
  return {
    id: entry.id,
    name: entry.name ?? entry.display_name ?? undefined,
    type: entry.type ?? undefined,
    tags: [...(entry.tags ?? []), ...(entry.metadata?.tags ?? [])],
    contextWindow,
    inputModalities: entry.architecture?.input_modalities ?? entry.modalities?.input ?? [],
    outputModalities: entry.architecture?.output_modalities ?? entry.modalities?.output ?? [],
    supportedParameters: entry.supported_parameters ?? [],
    completionChat: entry.capabilities?.completion_chat ?? undefined,
    functionCalling: entry.capabilities?.function_calling ?? undefined,
    vision: entry.capabilities?.vision ?? undefined,
    active: entry.active ?? undefined,
  };
}

function parseCohereEntries(rows: readonly unknown[]): PresetModelListEntry[] {
  return rows.flatMap((row) => {
    const parsed = cohereModelEntrySchema.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    const features = parsed.data.features ?? [];
    return [
      {
        id: parsed.data.name,
        tags: [],
        contextWindow: parsed.data.context_length ?? undefined,
        inputModalities: features.includes('vision') ? ['text', 'image'] : [],
        outputModalities: [],
        supportedParameters: features.includes('tools') ? ['tools'] : [],
        endpoints: parsed.data.endpoints ?? [],
        isDeprecated: parsed.data.is_deprecated ?? undefined,
      },
    ];
  });
}

function parseCloudflareEntries(rows: readonly unknown[]): PresetModelListEntry[] {
  return rows.flatMap((row) => {
    const parsed = cloudflareModelEntrySchema.safeParse(row);
    return !parsed.success
      ? []
      : [
          {
            id: parsed.data.name,
            tags: [],
            inputModalities: [],
            outputModalities: [],
            supportedParameters: [],
            taskName: parsed.data.task?.name ?? undefined,
          },
        ];
  });
}

function hasAny(values: readonly string[], wanted: readonly string[]): boolean {
  return values.some((value) => wanted.includes(value.toLowerCase()));
}
