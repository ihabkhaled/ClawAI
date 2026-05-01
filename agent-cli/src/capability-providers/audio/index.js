/**
 * AUDIO capability provider (Stream 24).
 *
 * Real implementation via shell-out to whisper.cpp + Piper. Both are
 * native binaries; the provider lazy-checks them at first use and
 * throws a typed install-instructions error if missing.
 *
 *     # whisper.cpp (STT)
 *     # macOS:    brew install whisper-cpp
 *     # Linux:    apt-get install whisper-cpp  (or build from source)
 *     # Windows:  scoop install whisper-cpp    (or download release)
 *
 *     # Piper (TTS) — single binary download per OS
 *     # See: https://github.com/rhasspy/piper#installation
 *
 * Operations:
 *   TRANSCRIBE  — input audio file → text. Whisper runs locally; never
 *                 calls a cloud STT service unless `routesToCloud=true`
 *                 is explicitly set on the policy.
 *   SYNTHESIZE  — input text → output audio file (PCM/WAV). Piper
 *                 voice file must be on disk; supplied via target.voice.
 *
 * Per the local-first-by-default rule, audio blobs never leave the
 * machine; the provider returns a base64 inline payload but the policy
 * gate may still mark routesToCloud=false to refuse cloud-bound network
 * recipes that include this output.
 */

import { exec } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const AUDIO_MAX_BYTES = 32 * 1024 * 1024; // 32 MB
const AUDIO_MAX_TEXT_CHARS = 50_000;

export const audioProvider = {
  async execute({ operation, target, payload }) {
    switch (operation) {
      case 'TRANSCRIBE':
        return transcribeOp(target);
      case 'SYNTHESIZE':
        return synthesizeOp(target, payload);
      default:
        throw new Error(`AUDIO provider received unsupported operation: ${operation}`);
    }
  },
};

async function transcribeOp(target) {
  const audioPath = requireAbsolutePath(target?.audioPath, 'audioPath');
  const language = typeof target?.language === 'string' ? target.language : 'en';
  await assertBinary('whisper', 'STT');
  const dir = await mkdtemp(join(tmpdir(), 'claw-stt-'));
  try {
    // whisper-cpp: `whisper-cli -m model.bin -f input.wav -of out -otxt`
    // We assume the user has set up a default model; the binary respects
    // WHISPER_MODEL_PATH or falls back to the bundled tiny.en model.
    await execAsync(
      `whisper-cli -m ${process.env.WHISPER_MODEL_PATH ?? '${HOME}/whisper-models/ggml-base.en.bin'} -f ${quote(audioPath)} -l ${quote(language)} -of ${quote(join(dir, 'out'))} -otxt`,
      { maxBuffer: AUDIO_MAX_BYTES },
    );
    const text = await readFile(join(dir, 'out.txt'), 'utf8');
    return {
      output: { text: text.slice(0, AUDIO_MAX_TEXT_CHARS), language },
      noUndoReason: 'read_only_no_state_change',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function synthesizeOp(target, payload) {
  const text = typeof payload?.text === 'string' ? payload.text : '';
  if (text.length === 0 || text.length > AUDIO_MAX_TEXT_CHARS) {
    throw new Error(`AUDIO.SYNTHESIZE: payload.text required (1..${String(AUDIO_MAX_TEXT_CHARS)})`);
  }
  const voicePath = requireAbsolutePath(target?.voicePath, 'voicePath');
  await assertBinary('piper', 'TTS');
  const dir = await mkdtemp(join(tmpdir(), 'claw-tts-'));
  try {
    const inputTxt = join(dir, 'in.txt');
    const outputWav = join(dir, 'out.wav');
    await writeFile(inputTxt, text, 'utf8');
    await execAsync(
      `piper --model ${quote(voicePath)} --output_file ${quote(outputWav)} < ${quote(inputTxt)}`,
      { maxBuffer: AUDIO_MAX_BYTES },
    );
    const audio = await readFile(outputWav);
    if (audio.length > AUDIO_MAX_BYTES) {
      throw new Error('AUDIO.SYNTHESIZE: output exceeds 32MB');
    }
    return {
      output: {
        contentBase64: Buffer.from(audio).toString('base64'),
        mimeType: 'audio/wav',
        size: audio.length,
      },
      noUndoReason: 'audio_synthesis_irreversible',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function assertBinary(name, label) {
  try {
    await execAsync(`${name} --help`, { timeout: 5_000 });
  } catch {
    throw new Error(
      `AUDIO.${label}: '${name}' binary not found on PATH. Install: ` +
        (name === 'whisper'
          ? "macOS 'brew install whisper-cpp' / Linux 'apt-get install whisper-cpp' / Windows 'scoop install whisper-cpp'"
          : 'see https://github.com/rhasspy/piper#installation'),
    );
  }
}

function requireAbsolutePath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`AUDIO: target.${label} required (string)`);
  }
  if (!isAbsolute(value)) {
    throw new Error(`AUDIO: target.${label} must be absolute`);
  }
  if (value.length > 4096) {
    throw new Error(`AUDIO: target.${label} exceeds max length`);
  }
  return value;
}

function quote(s) {
  return `"${s.replace(/"/g, '\\"')}"`;
}
