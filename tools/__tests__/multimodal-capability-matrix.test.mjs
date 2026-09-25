import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildMatrix,
  firstEnabled,
  fromAvailableModels,
  renderMatrix,
  transcriptionEngine,
} from '../../scripts/qa-lab/multimodal-matrix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE = path.join(ROOT, 'scripts', 'qa-lab', 'multimodal-matrix.fixture.json');
const CLI = path.join(ROOT, 'scripts', 'qa-lab', 'multimodal-capability-matrix.mjs');

const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const matrix = buildMatrix({ models: fixture.snapshot.models, roles: fixture.roles });
const rowOf = (m, id) => m.rows.find((r) => r.model === id);

test('only CHAT models become rows, sorted by provider/model', () => {
  assert.deepEqual(
    matrix.rows.map((r) => r.model),
    ['GEMINI/gemini-2.5-flash', 'OLLAMA/llama3.1:8b', 'OPENAI/gpt-4.1-mini'],
  );
});

test('image: native when the snapshot says IMAGE_INPUT, else the first enabled helper, else OCR', () => {
  assert.equal(rowOf(matrix, 'OPENAI/gpt-4.1-mini').image, 'native');
  assert.equal(rowOf(matrix, 'OLLAMA/llama3.1:8b').image, 'helper GEMINI/gemini-2.5-flash');
  const noHelper = buildMatrix({ models: fixture.snapshot.models, roles: {} });
  assert.equal(rowOf(noHelper, 'OLLAMA/llama3.1:8b').image, 'OCR + note (no helper)');
});

test('audio: transcript engine follows file-service priority (GEMINI before OPENAI), never native', () => {
  assert.deepEqual(transcriptionEngine(fixture.snapshot.models), {
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
  });
  const openAiOnly = fixture.snapshot.models.filter((m) => m.provider !== 'GEMINI');
  assert.deepEqual(transcriptionEngine(openAiOnly), { provider: 'OPENAI', model: 'whisper-1' });
  assert.equal(transcriptionEngine([]), null);
  for (const row of matrix.rows) assert.match(row.audio, /^transcript via /);
  assert.ok(matrix.notes.some((n) => /Native audio .* NOT IMPLEMENTED/.test(n)));
});

test('video: native on VIDEO_INPUT, frames when the model sees, helper frames when blind', () => {
  assert.equal(rowOf(matrix, 'GEMINI/gemini-2.5-flash').video, 'native');
  assert.equal(rowOf(matrix, 'OPENAI/gpt-4.1-mini').video, 'frames + transcript');
  assert.equal(rowOf(matrix, 'OLLAMA/llama3.1:8b').video, 'frames via helper + transcript');
  const bare = buildMatrix({ models: [fixture.snapshot.models[3]], roles: {} });
  assert.equal(bare.rows[0].video, 'metadata only');
});

test('TTS and helper roles skip disabled entries and respect order', () => {
  assert.equal(firstEnabled(fixture.roles.TTS_VOICE).modelAlias, 'tts-1');
  assert.equal(firstEnabled([]), null);
  assert.deepEqual(matrix.ttsVoice, { provider: 'OPENAI', model: 'tts-1' });
  for (const row of matrix.rows) {
    assert.equal(row.tts, 'OPENAI/tts-1');
    assert.equal(row.imageGeneration, 'delegated to image-service');
  }
});

test('available-models rows map to the snapshot modality spellings', () => {
  const [mapped] = fromAvailableModels([
    {
      provider: 'GEMINI',
      modelKey: 'g',
      supportsVision: true,
      supportsAudio: false,
      supportsVideoInput: true,
      kind: 'CHAT',
      exposure: 'EXPOSED',
    },
  ]);
  assert.deepEqual(mapped.modalitiesIn, ['TEXT', 'IMAGE_INPUT', 'VIDEO_INPUT']);
  assert.deepEqual(fromAvailableModels(null), []);
});

test('renderer prints the summary, one table row per chat model, escaped cells, notes', () => {
  const out = renderMatrix(matrix);
  assert.match(out, /Speech-to-text engine: GEMINI\/gemini-2\.5-flash/);
  assert.match(out, /VISION_HELPER: GEMINI\/gemini-2\.5-flash/);
  assert.equal(
    out.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---')).length,
    4,
  );
  const piped = renderMatrix(
    buildMatrix({
      models: [{ provider: 'X', modelKey: 'a|b', modalitiesIn: ['TEXT'] }],
      roles: {},
    }),
  );
  assert.match(piped, /X\/a\\\|b/);
  assert.match(renderMatrix(buildMatrix({ models: [] })), /_No chat models in the snapshot\._/);
});

test('CLI --fixture renders offline and --json emits the matrix', () => {
  const md = execFileSync(process.execPath, [CLI, `--fixture=${FIXTURE}`], { encoding: 'utf8' });
  assert.match(md, /^# Multimodal capability matrix/);
  const json = JSON.parse(
    execFileSync(process.execPath, [CLI, `--fixture=${FIXTURE}`, '--json'], { encoding: 'utf8' }),
  );
  assert.equal(json.rows.length, 3);
});
