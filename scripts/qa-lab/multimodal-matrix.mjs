// Multimodal capability matrix — pure builder + renderer (no I/O).
//
// Every cell is DERIVED from runtime data (pack §124): the connector
// models-snapshot (what chat-service's ModelCapabilityClient and file-service's
// TranscriptionCapabilityClient read) plus routing's assistant-model roles
// (VISION_HELPER, TTS_VOICE). Nothing here is a hand-authored model list.
//
// The CLI that fetches that data lives in multimodal-capability-matrix.mjs;
// the test is tools/__tests__/multimodal-capability-matrix.test.mjs.
// Runbook: skills/verify-multimodal-routing-live.md.

/** Snapshot modality spellings (connector-service models-snapshot.manager.ts). */
export const MODALITY = Object.freeze({
  IMAGE_INPUT: 'IMAGE_INPUT',
  AUDIO: 'AUDIO',
  VIDEO_INPUT: 'VIDEO_INPUT',
  IMAGE_OUTPUT: 'IMAGE',
});

/**
 * file-service walks these providers in this order for speech-to-text, one
 * candidate per provider, regardless of snapshot order
 * (transcription-capability.client.ts `TRANSCRIPTION_PROVIDER_PRIORITY`).
 */
export const TRANSCRIPTION_PROVIDER_PRIORITY = Object.freeze(['GEMINI', 'OPENAI']);

export const ROLE = Object.freeze({ VISION_HELPER: 'VISION_HELPER', TTS_VOICE: 'TTS_VOICE' });

export const COLUMNS = Object.freeze([
  ['model', 'Model'],
  ['exposure', 'Exposure'],
  ['image', 'Image in'],
  ['audio', 'Audio in'],
  ['video', 'Video in'],
  ['imageGeneration', 'Image generation'],
  ['tts', 'Read aloud (TTS)'],
]);

const hasModality = (model, modality) =>
  Array.isArray(model.modalitiesIn) && model.modalitiesIn.includes(modality);

const isChatModel = (model) =>
  model.kind === undefined || model.kind === null || model.kind === 'CHAT';

const label = (entry) => `${entry.provider}/${entry.modelAlias ?? entry.modelKey ?? entry.model}`;

/** The first enabled entry of a role, in the order chat-service tries them. */
export function firstEnabled(records) {
  const list = Array.isArray(records) ? [...records] : [];
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list.find((r) => r.enabled !== false) ?? null;
}

/** The speech-to-text engine file-service would pick, or null. */
export function transcriptionEngine(models) {
  for (const provider of TRANSCRIPTION_PROVIDER_PRIORITY) {
    const match = models.find(
      (m) =>
        m.provider === provider && (m.supportsAudio === true || hasModality(m, MODALITY.AUDIO)),
    );
    if (match !== undefined) return { provider, model: match.modelKey };
  }
  return null;
}

/**
 * `GET /connectors/available-models` rows (ConnectorModel) → snapshot shape,
 * using the same flag → modality mapping as models-snapshot.manager.ts. Lets
 * the matrix run through nginx when the internal snapshot port is not reachable.
 */
export function fromAvailableModels(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const modalitiesIn = ['TEXT'];
    if (row.supportsVision === true) modalitiesIn.push(MODALITY.IMAGE_INPUT);
    if (row.supportsAudio === true) modalitiesIn.push(MODALITY.AUDIO);
    if (row.supportsVideoInput === true) modalitiesIn.push(MODALITY.VIDEO_INPUT);
    return {
      provider: row.provider,
      modelKey: row.modelKey,
      displayName: row.displayName,
      modalitiesIn,
      modalitiesOut: ['TEXT'],
      exposure: row.exposure,
      kind: row.kind,
    };
  });
}

function imageCell(model, helper) {
  if (hasModality(model, MODALITY.IMAGE_INPUT)) return 'native';
  return helper === null ? 'OCR + note (no helper)' : `helper ${label(helper)}`;
}

function videoCell(model, helper, stt) {
  if (hasModality(model, MODALITY.VIDEO_INPUT)) return 'native';
  const transcript = stt === null ? 'no transcript' : 'transcript';
  if (hasModality(model, MODALITY.IMAGE_INPUT)) return `frames + ${transcript}`;
  if (helper !== null) return `frames via helper + ${transcript}`;
  return stt === null ? 'metadata only' : 'transcript only';
}

/**
 * @param {{models: object[], roles?: Record<string, object[]>, generatedAt?: string}} input
 * @returns {{generatedAt: string|null, transcription: object|null, visionHelper: object|null,
 *   ttsVoice: object|null, rows: object[], notes: string[]}}
 */
export function buildMatrix(input) {
  const models = Array.isArray(input?.models) ? input.models : [];
  const roles = input?.roles ?? {};
  const helper = firstEnabled(roles[ROLE.VISION_HELPER]);
  const tts = firstEnabled(roles[ROLE.TTS_VOICE]);
  const stt = transcriptionEngine(models);

  const rows = models
    .filter(isChatModel)
    .map((model) => ({
      model: `${model.provider}/${model.modelKey}`,
      exposure: model.exposure ?? 'UNKNOWN',
      image: imageCell(model, helper),
      audio:
        stt === null ? 'unavailable (no STT model)' : `transcript via ${stt.provider}/${stt.model}`,
      video: videoCell(model, helper, stt),
      imageGeneration: (model.modalitiesOut ?? []).includes(MODALITY.IMAGE_OUTPUT)
        ? 'native'
        : 'delegated to image-service',
      tts: tts === null ? 'unavailable (no TTS_VOICE)' : label(tts),
    }))
    .sort((a, b) => a.model.localeCompare(b.model));

  const notes = [
    'Native audio into a chat model is NOT IMPLEMENTED: every model receives the transcript.',
    'Helper vision, image generation and TTS are plan-gated (ADR-122): free plans get OCR + note, a notice, and 403.',
    'Video "native" needs the processed duration within 60 min and within the plan maxVideoSeconds, else frames + transcript.',
  ];
  return {
    generatedAt: input?.generatedAt ?? null,
    transcription: stt,
    visionHelper: helper === null ? null : { provider: helper.provider, model: helper.modelAlias },
    ttsVoice: tts === null ? null : { provider: tts.provider, model: tts.modelAlias },
    rows,
    notes,
  };
}

const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Markdown rendering: summary lines, the table, then the notes. */
export function renderMatrix(matrix) {
  const lines = [
    '# Multimodal capability matrix',
    '',
    `- Snapshot generated: ${matrix.generatedAt ?? 'unknown'}`,
    `- Speech-to-text engine: ${matrix.transcription === null ? 'none' : `${matrix.transcription.provider}/${matrix.transcription.model}`}`,
    `- VISION_HELPER: ${matrix.visionHelper === null ? 'none enabled' : `${matrix.visionHelper.provider}/${matrix.visionHelper.model}`}`,
    `- TTS_VOICE: ${matrix.ttsVoice === null ? 'none enabled' : `${matrix.ttsVoice.provider}/${matrix.ttsVoice.model}`}`,
    `- Chat models: ${String(matrix.rows.length)}`,
    '',
    `| ${COLUMNS.map(([, title]) => title).join(' | ')} |`,
    `| ${COLUMNS.map(() => '---').join(' | ')} |`,
    ...matrix.rows.map((row) => `| ${COLUMNS.map(([key]) => cell(row[key])).join(' | ')} |`),
    '',
    ...matrix.notes.map((note) => `> ${note}`),
  ];
  if (matrix.rows.length === 0)
    lines.splice(lines.length - matrix.notes.length, 0, '_No chat models in the snapshot._', '');
  return `${lines.join('\n')}\n`;
}
