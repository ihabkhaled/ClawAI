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

import { dep, osFamily, probeHealthy, whichBinary } from '../probe-helpers.js';

const execAsync = promisify(exec);

const AUDIO_MAX_BYTES = 32 * 1024 * 1024; // 32 MB
const AUDIO_MAX_TEXT_CHARS = 50_000;

export const audioProvider = {
  async probe() {
    const whisperBin = process.env.WHISPER_CLI_PATH ?? 'whisper-cli';
    const piperBin = process.env.PIPER_BIN_PATH ?? 'piper';
    const whisperOk = await whichBinary(whisperBin);
    const piperOk = await whichBinary(piperBin);
    const dependencies = [
      dep({
        name: whisperBin,
        installed: whisperOk,
        required: false,
        notes: 'Required only for TRANSCRIBE operation',
        fix: whisperOk
          ? null
          : 'macOS: brew install whisper-cpp; Linux: build from source; Windows: download release from ggerganov/whisper.cpp',
      }),
      dep({
        name: piperBin,
        installed: piperOk,
        required: false,
        notes: 'Required only for SYNTHESIZE operation',
        fix: piperOk
          ? null
          : 'Download from https://github.com/rhasspy/piper/releases — set PIPER_BIN_PATH env var if not on PATH',
      }),
    ];
    return {
      class: 'AUDIO',
      healthy: probeHealthy(dependencies),
      dependencies,
      notes: `${osFamily()} — STT via whisper, TTS via Piper; both binaries optional. Voice models must also be downloaded.`,
    };
  },
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
  const whisperBin = process.env.WHISPER_CLI_PATH ?? 'whisper-cli';
  await assertBinary(whisperBin, 'STT');
  const modelPath = process.env.WHISPER_MODEL_PATH;
  if (typeof modelPath !== 'string' || modelPath.length === 0) {
    throw new Error(
      'AUDIO.TRANSCRIBE: set WHISPER_MODEL_PATH to a downloaded ggml model (e.g. ggml-base.en.bin from huggingface.co/ggerganov/whisper.cpp)',
    );
  }
  const dir = await mkdtemp(join(tmpdir(), 'claw-stt-'));
  try {
    await execAsync(
      `${quote(whisperBin)} -m ${quote(modelPath)} -f ${quote(audioPath)} -l ${quote(language)} -of ${quote(join(dir, 'out'))} -otxt`,
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
  const piperBin = process.env.PIPER_BIN_PATH ?? 'piper';
  await assertBinary(piperBin, 'TTS');
  const dir = await mkdtemp(join(tmpdir(), 'claw-tts-'));
  try {
    const inputTxt = join(dir, 'in.txt');
    const outputWav = join(dir, 'out.wav');
    await writeFile(inputTxt, text, 'utf8');
    await execAsync(
      `${quote(piperBin)} --model ${quote(voicePath)} --output_file ${quote(outputWav)} < ${quote(inputTxt)}`,
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

async function assertBinary(binPath, label) {
  try {
    await execAsync(`${quote(binPath)} --help`, { timeout: 5_000 });
  } catch {
    throw new Error(
      `AUDIO.${label}: binary at '${binPath}' not runnable. Install: ` +
        (label === 'STT'
          ? "macOS 'brew install whisper-cpp' / Linux 'apt-get install whisper-cpp' / Windows: download from https://github.com/ggml-org/whisper.cpp/releases (whisper-bin-x64.zip), extract, set WHISPER_CLI_PATH"
          : "Download from https://github.com/rhasspy/piper/releases (piper_<os>_<arch>.zip), extract, set PIPER_BIN_PATH"),
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
  // Escape backslashes first, then double-quotes — order matters: if you do
  // it the other way round, the `\` you inserted to escape `"` gets escaped
  // again and the whole string ends up unquoted.
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
