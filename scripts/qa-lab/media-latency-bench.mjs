// Live latency / reliability bench for speech-to-text, text-to-speech and video
// processing through the real stack (nginx → chat-service / file-service).
//
//   QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… node scripts/qa-lab/media-latency-bench.mjs
//
// Every speech fixture is REAL speech produced by the product's own read-aloud
// (TTS) route — never a tone. Flow:
//   1. TTS  — fresh assistant replies of ~200 / ~1000 / ~4000 chars (the model is
//             asked to repeat a text verbatim), POST /chat-messages/:id/speech
//             timed per run, plus one cached replay.
//   2. Fixtures — the TTS WAVs are downloaded (owner route), concatenated inside
//             the file-service container with ffmpeg and cut into ~5 / ~30 /
//             ~120 s voice notes (audio/webm opus, like the composer) and
//             10 / 60 s mp4s (testsrc + the speech track). Each run gets its own
//             start offset so no two uploads carry identical bytes.
//   3. STT  — upload each voice note (/files/upload), poll GET /files/:id every
//             500 ms until COMPLETED with a real transcript (deadline 180 s).
//   4. Video — upload each mp4, poll until COMPLETED with `[00:` timestamps.
//   5. Logs — file-service + chat-service logs since the run start: queue wait,
//             provider time, videoProcessed processingMs, failures by reason.
// Output: Markdown to stdout, JSON to QA_BENCH_OUT (default the 2026-09-25
// multimodal evidence folder). Every wait is bounded. Knobs: QA_BENCH_N (3).
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE, api, apiLogin } from './multimodal-ui-accounts.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const OUT =
  process.env.QA_BENCH_OUT ??
  path.join(
    REPO,
    'docs/16-quality-engineering/evidence/2026-09-25-multimodal/latency-before.json',
  );
const N = Number(process.env.QA_BENCH_N ?? 3);
const FILE_CONTAINER = process.env.QA_FILE_CONTAINER ?? 'claw-file-service';
const POLL_MS = 500;
const STT_DEADLINE_MS = 180_000;
const VIDEO_DEADLINE_MS = 300_000;
const CHAT_DEADLINE_MS = 240_000;
const TTS_CLIENT_TIMEOUT_MS = 90_000;
const TTS_SIZES = [200, 1000, 4000];
const STT_SECONDS = [5, 30, 120];
const VIDEO_SECONDS = [10, 60];
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-media-bench-'));
const RUN_START = new Date();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (line) => process.stderr.write(`${line}\n`);

// ─── text corpus (plain prose, no Markdown, so the speakable text == reply) ──

const SENTENCES = [
  'The morning train left the station a few minutes after seven.',
  'A light rain had fallen overnight, and the streets were still wet.',
  'Most of the passengers were reading or looking quietly out of the window.',
  'Near the back, a small group of students talked about their exams.',
  'The conductor walked slowly down the aisle, checking every ticket.',
  'Outside, the fields slowly gave way to houses and then to tall buildings.',
  'By the time the train reached the city, the sun had come out.',
  'People hurried across the platform toward the exits and the buses.',
  'A street musician was playing an old song near the main entrance.',
  'The smell of fresh bread drifted from a bakery across the road.',
  'Office workers queued for coffee while checking messages on their phones.',
  'A delivery van stopped outside the market to unload boxes of fruit.',
  'In the park, an elderly man was feeding the pigeons from a paper bag.',
  'Two children raced each other to the fountain and laughed loudly.',
  'The library opened its doors exactly at nine, as it did every day.',
  'Inside, the reading room was calm, bright and almost completely silent.',
  'A librarian arranged new books on a wooden cart near the front desk.',
  'Someone had left a handwritten note inside a book about old maps.',
  'At noon, the square filled with people looking for a place to eat.',
  'The afternoon passed quickly, and the shadows grew long across the pavement.',
];

function proseOf(targetChars, seed) {
  const out = [];
  let len = 0;
  let i = seed;
  while (len < targetChars) {
    const s = SENTENCES[i % SENTENCES.length];
    out.push(s);
    len += s.length + 1;
    i += 7;
  }
  return out.join(' ');
}

// ─── helpers ────────────────────────────────────────────────────────────────

function stats(values) {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (v.length === 0) return { min: null, median: null, max: null };
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
  return { min: v[0], median, max: v[v.length - 1] };
}

function docker(args, opts = {}) {
  return execFileSync('docker', args, {
    encoding: opts.binary ? 'buffer' : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: opts.timeout ?? 180_000,
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
}

async function withTimeout(promise, ms, label) {
  let timer;
  const t = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(`${label} client timeout ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, t]);
  } finally {
    clearTimeout(timer);
  }
}

async function download(token, fileId) {
  const res = await fetch(`${BASE}/files/download/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status >= 300) throw new Error(`download ${fileId} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── account: fresh paid user (own, so another lane's cache is untouched) ───

async function paidAccount() {
  const adminEmail = process.env.QA_ADMIN_EMAIL;
  const adminPassword = process.env.QA_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD not set');
  const admin = await apiLogin(adminEmail, adminPassword);
  const suffix = `bench${Date.now()}${crypto.randomInt(1000)}`;
  const email = `qa-mmbench-${suffix}@claw.local`;
  const password = `Qa1!${crypto.randomBytes(8).toString('hex')}Zz`;
  const created = await api('POST', '/users', admin, {
    email,
    username: `qammb${suffix}`.slice(0, 32),
    password,
    firstName: 'QA',
    lastName: 'MediaBench',
    role: 'USER',
  });
  const id = created.json?.id ?? created.json?.user?.id;
  if (!id) throw new Error(`create user → ${created.status} ${created.text.slice(0, 200)}`);
  let token = await apiLogin(email, password);
  const next = `Qa2!${crypto.randomBytes(8).toString('hex')}Zz`;
  const change = await api('PATCH', '/users/me/password', token, {
    currentPassword: password,
    newPassword: next,
  });
  if (change.status >= 300) throw new Error(`rotate password → ${change.status}`);
  const plans = await api('GET', '/admin/plans', admin);
  const rows = Array.isArray(plans.json) ? plans.json : (plans.json?.data ?? plans.json?.items ?? []);
  const slug = process.env.QA_PAID_PLAN_SLUG ?? 'pro';
  const plan = rows.find((p) => p.slug === slug);
  if (!plan) throw new Error(`plan ${slug} not found`);
  const assign = await api('POST', `/admin/plans/users/${id}/assign`, admin, {
    planId: plan.id,
    durationMonths: 1,
    grantReason: 'qa media latency bench',
  });
  if (assign.status >= 300) throw new Error(`assign plan → ${assign.status}`);
  const topup = await api('POST', `/admin/credit/wallets/${id}/adjust`, admin, {
    amountMicroUsd: 5_000_000,
    reason: 'qa media latency bench top-up',
  });
  if (topup.status >= 300) throw new Error(`wallet top-up → ${topup.status}`);
  token = await apiLogin(email, next);
  return { token, id, plan: slug };
}

// ─── chat: an assistant reply whose text we (nearly) control ────────────────

async function pickEchoModel(token) {
  const r = await api('GET', '/connectors/available-models', token);
  const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
  const chat = rows.filter(
    (m) => (m.kind ?? 'CHAT') === 'CHAT' && (m.lifecycle ?? 'ACTIVE') === 'ACTIVE',
  );
  const pref = [/gemini-2\.5-flash$/, /gemini-2\.5-flash(?!-lite)/, /gemini.*flash/, /gemini/];
  for (const re of pref) {
    const hit = chat.find((m) => m.provider === 'GEMINI' && re.test(m.modelKey));
    if (hit) return { provider: hit.provider, model: hit.modelKey };
  }
  return null;
}

async function assistantReply(token, text, echo) {
  const thread = await api(
    'POST',
    '/chat-threads',
    token,
    echo
      ? { title: 'QA media bench', routingMode: 'MANUAL_MODEL', preferredProvider: echo.provider, preferredModel: echo.model }
      : { title: 'QA media bench', routingMode: 'AUTO' },
  );
  const threadId = thread.json?.id;
  if (!threadId) throw new Error(`create thread → ${thread.status}`);
  const content =
    'Repeat the following text exactly, word for word. Output only that text, with no ' +
    `introduction, no quotes and no formatting:\n\n${text}`;
  const send = await api('POST', '/chat-messages', token, {
    threadId,
    content,
    ...(echo
      ? { routingMode: 'MANUAL_MODEL', provider: echo.provider, model: echo.model }
      : { routingMode: 'AUTO' }),
  });
  if (send.status >= 300) throw new Error(`send → ${send.status} ${send.text.slice(0, 160)}`);
  const deadline = Date.now() + CHAT_DEADLINE_MS;
  while (Date.now() < deadline) {
    const r = await api('GET', `/chat-messages/thread/${threadId}?limit=20`, token);
    const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
    const a = rows.find((m) => m.role === 'ASSISTANT' && (m.content ?? '').length > 0);
    if (a) return { id: a.id, chars: a.content.length, provider: a.provider, model: a.model };
    await sleep(1500);
  }
  throw new Error(`no assistant reply within ${CHAT_DEADLINE_MS}ms`);
}

// ─── 1. TTS ─────────────────────────────────────────────────────────────────

async function timeSpeech(token, messageId) {
  const t0 = performance.now();
  try {
    const r = await withTimeout(
      api('POST', `/chat-messages/${messageId}/speech`, token),
      TTS_CLIENT_TIMEOUT_MS,
      'speech',
    );
    const ms = Math.round(performance.now() - t0);
    if (r.status >= 300 || !r.json?.fileId) {
      return { ok: false, ms, status: r.status, reason: `${r.status} ${(r.json?.code ?? r.json?.errorCode ?? r.text).toString().slice(0, 120)}` };
    }
    return { ok: true, ms, status: r.status, fileId: r.json.fileId, mimeType: r.json.mimeType, characters: r.json.characters, cached: r.json.cached === true };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), status: 0, reason: e.message };
  }
}

async function ttsLane(token, echo) {
  const runs = [];
  let lastOk = null;
  for (const size of TTS_SIZES) {
    for (let run = 1; run <= N; run++) {
      const text = proseOf(size, run * 3 + size);
      const row = { size, run, requestedChars: text.length };
      try {
        const reply = await assistantReply(token, text, echo);
        Object.assign(row, { messageId: reply.id, replyChars: reply.chars, replyModel: `${reply.provider}/${reply.model}` });
        Object.assign(row, await timeSpeech(token, reply.id));
        if (row.ok) lastOk = row;
      } catch (e) {
        Object.assign(row, { ok: false, reason: `setup: ${e.message}` });
      }
      log(`tts size=${size} run=${run} ok=${row.ok} ms=${row.ms ?? '-'} chars=${row.characters ?? row.replyChars ?? '-'} ${row.reason ?? ''}`);
      runs.push(row);
    }
  }
  let replay = null;
  if (lastOk) {
    replay = { size: lastOk.size, messageId: lastOk.messageId, ...(await timeSpeech(token, lastOk.messageId)) };
    log(`tts replay ok=${replay.ok} cached=${replay.cached} ms=${replay.ms}`);
  }
  return { runs, replay };
}

// ─── 2. fixtures from the TTS audio ─────────────────────────────────────────

async function buildFixtures(token, ttsRuns) {
  const ok = ttsRuns.filter((r) => r.ok && r.fileId).sort((a, b) => b.size - a.size);
  if (ok.length === 0) throw new Error('no TTS audio to build speech fixtures from');
  const cdir = '/tmp/qa-mmbench';
  docker(['exec', FILE_CONTAINER, 'sh', '-c', `rm -rf ${cdir} && mkdir -p ${cdir}`]);
  const list = [];
  for (const [i, r] of ok.entries()) {
    const bytes = await download(token, r.fileId);
    const ext = (r.mimeType ?? '').includes('mpeg') ? 'mp3' : 'wav';
    const local = path.join(WORK, `tts-${i}.${ext}`);
    fs.writeFileSync(local, bytes);
    docker(['cp', local, `${FILE_CONTAINER}:${cdir}/tts-${i}.${ext}`]);
    list.push(`file '${cdir}/tts-${i}.${ext}'`);
  }
  const concatList = path.join(WORK, 'list.txt');
  fs.writeFileSync(concatList, `${list.join('\n')}\n`);
  docker(['cp', concatList, `${FILE_CONTAINER}:${cdir}/list.txt`]);
  docker(['exec', FILE_CONTAINER, 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', `${cdir}/list.txt`, '-ac', '1', '-ar', '24000', `${cdir}/speech.wav`]);
  const totalS = Number(
    docker(['exec', FILE_CONTAINER, 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${cdir}/speech.wav`]).trim(),
  );
  log(`fixtures: ${ok.length} TTS clips → ${totalS.toFixed(1)}s of speech`);

  const probe = (f) =>
    Number(docker(['exec', FILE_CONTAINER, 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
  const fixtures = { voice: [], video: [] };
  for (const secs of STT_SECONDS) {
    for (let run = 1; run <= N; run++) {
      const offset = Math.max(0, Math.min((run - 1) * 3, totalS - secs));
      const name = `voice-${secs}s-r${run}.webm`;
      docker(['exec', FILE_CONTAINER, 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', String(offset),
        '-t', String(secs), '-i', `${cdir}/speech.wav`, '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '32k',
        '-metadata', `comment=bench-${Date.now()}-${run}`, `${cdir}/${name}`]);
      const local = path.join(WORK, name);
      docker(['cp', `${FILE_CONTAINER}:${cdir}/${name}`, local]);
      fixtures.voice.push({ target: secs, run, path: local, durationS: probe(`${cdir}/${name}`), bytes: fs.statSync(local).size });
    }
  }
  for (const secs of VIDEO_SECONDS) {
    for (let run = 1; run <= N; run++) {
      const offset = Math.max(0, Math.min((run - 1) * 4, totalS - secs));
      const name = `video-${secs}s-r${run}.mp4`;
      docker(['exec', FILE_CONTAINER, 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', `testsrc=duration=${secs}:size=320x240:rate=10`,
        '-ss', String(offset), '-t', String(secs), '-i', `${cdir}/speech.wav`,
        '-map', '0:v', '-map', '1:a', '-t', String(secs), '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '150k',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart',
        '-metadata', `comment=bench-${Date.now()}-${run}`, `${cdir}/${name}`], { timeout: 300_000 });
      const local = path.join(WORK, name);
      docker(['cp', `${FILE_CONTAINER}:${cdir}/${name}`, local]);
      fixtures.video.push({ target: secs, run, path: local, durationS: probe(`${cdir}/${name}`), bytes: fs.statSync(local).size });
    }
  }
  docker(['exec', FILE_CONTAINER, 'rm', '-rf', cdir]);
  return { speechSecondsAvailable: totalS, sourceClips: ok.length, ...fixtures };
}

// ─── 3/4. upload + poll ─────────────────────────────────────────────────────

async function uploadAndWait(token, fixture, mimeType, placeholder, deadlineMs, isDone) {
  const bytes = fs.readFileSync(fixture.path);
  const t0 = performance.now();
  const up = await api('POST', '/files/upload', token, {
    filename: path.basename(fixture.path),
    mimeType,
    sizeBytes: bytes.length,
    content: bytes.toString('base64'),
  });
  const uploadMs = Math.round(performance.now() - t0);
  const fileId = up.json?.id;
  if (!fileId) return { ok: false, uploadMs, reason: `upload ${up.status} ${up.text.slice(0, 120)}` };
  const deadline = Date.now() + deadlineMs;
  let last = null;
  let polls = 0;
  while (Date.now() < deadline) {
    const r = await api('GET', `/files/${fileId}`, token);
    polls++;
    last = r.json;
    const text = last?.extractedText ?? '';
    const err = last?.extractionError ?? '';
    const status = last?.ingestionStatus;
    if (status === 'FAILED' || err) {
      return { ok: false, fileId, uploadMs, totalMs: Math.round(performance.now() - t0), polls, status, reason: `extraction: ${(err || status).slice(0, 160)}`, transcriptChars: text.length };
    }
    if (status === 'COMPLETED' && !text.startsWith(placeholder)) {
      const verdict = isDone(last);
      return { ok: verdict.ok, fileId, uploadMs, totalMs: Math.round(performance.now() - t0), polls, status, transcriptChars: text.length, nonEmpty: text.trim().length > 0, ...(verdict.ok ? {} : { reason: verdict.reason }), sample: text.slice(0, 100) };
    }
    await sleep(POLL_MS);
  }
  return { ok: false, fileId, uploadMs, totalMs: Math.round(performance.now() - t0), polls, status: last?.ingestionStatus, reason: `deadline ${deadlineMs}ms (status ${last?.ingestionStatus}, text ${(last?.extractedText ?? '').slice(0, 60)})` };
}

async function sttLane(token, voice) {
  const runs = [];
  for (const f of voice) {
    const row = { target: f.target, run: f.run, durationS: Number(f.durationS.toFixed(1)), bytes: f.bytes };
    Object.assign(
      row,
      await uploadAndWait(token, f, 'audio/webm', '[Audio file: ', STT_DEADLINE_MS, (file) => {
        const t = (file.extractedText ?? '').trim();
        if (t.length === 0) return { ok: false, reason: 'empty transcript' };
        if (/^\[(Audio|Video) file: /.test(t) || /transcription failed/i.test(t)) return { ok: false, reason: `placeholder/failure text: ${t.slice(0, 80)}` };
        return { ok: true };
      }),
    );
    log(`stt ${f.target}s run=${f.run} ok=${row.ok} total=${row.totalMs ?? '-'}ms chars=${row.transcriptChars ?? '-'} ${row.reason ?? ''}`);
    runs.push(row);
  }
  return runs;
}

async function videoLane(token, video) {
  const runs = [];
  for (const f of video) {
    const row = { target: f.target, run: f.run, durationS: Number(f.durationS.toFixed(1)), bytes: f.bytes };
    Object.assign(
      row,
      await uploadAndWait(token, f, 'video/mp4', '[Video file: ', VIDEO_DEADLINE_MS, (file) =>
        (file.extractedText ?? '').includes('[00:')
          ? { ok: true }
          : { ok: false, reason: `no [00: timestamps: ${(file.extractedText ?? '').slice(0, 100)}` },
      ),
    );
    log(`video ${f.target}s run=${f.run} ok=${row.ok} total=${row.totalMs ?? '-'}ms ${row.reason ?? ''}`);
    runs.push(row);
  }
  return runs;
}

// ─── 5. logs ────────────────────────────────────────────────────────────────

// docker logs replays the app's stdout AND stderr; keep both, strip ANSI colour.
function logsBoth(name) {
  const r = spawnSync('docker', ['logs', '--timestamps', '--since', RUN_START.toISOString(), name], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: 60_000,
  });
  return `${r.stdout ?? ''}
${r.stderr ?? ''}`.replaceAll(/[[0-9;]*m/g, '');
}

// A real rate-limit hit — not the x-ratelimit-* headers every Gemini response logs.
const HTTP_429 = /(status|HTTP|code)["\s=:]*429\b|RESOURCE_EXHAUSTED|Too Many Requests/i;

const tsOf = (line) => Date.parse(line.slice(0, 30).trim().split(' ')[0]);

function analyseLogs(sttRuns, videoRuns, ttsRuns, replay) {
  const file = logsBoth(FILE_CONTAINER).split('\n');
  let chatNames = [];
  try {
    chatNames = docker(['ps', '--filter', 'label=claw.service=chat-service', '--format', '{{.Names}}']).trim().split('\n').filter(Boolean);
  } catch {
    chatNames = [];
  }
  if (chatNames.length === 0) chatNames = ['claw-chat-service-1'];
  const chat = chatNames.flatMap((n) => logsBoth(n).split('\n'));

  const firstTs = (lines, re) => {
    const l = lines.find((x) => re.test(x));
    return l ? tsOf(l) : null;
  };
  // Per-upload queue wait (queued → metering hold taken ≈ job picked up) and job time.
  for (const r of [...sttRuns, ...videoRuns]) {
    if (!r.fileId) continue;
    const queued = firstTs(file, new RegExp(`request(Transcription|VideoProcessing): queued .*fileId=${r.fileId}`));
    const held = firstTs(file, new RegExp(`reserve: held fileId=${r.fileId} `));
    r.queueWaitMs = queued && held ? held - queued : null;
    const run = file.find((l) => l.includes(`runTranscription: fileId=${r.fileId} `));
    const m = run?.match(/durationMs=(\d+)/);
    r.jobMs = m ? Number(m[1]) : null;
    const vp = file.find((l) => l.includes(`videoProcessed: fileId=${r.fileId} `));
    if (vp) {
      r.processingMs = Number(vp.match(/processingMs=(\d+)/)?.[1] ?? NaN);
      r.audioStatus = vp.match(/audioStatus=(\S+)/)?.[1];
      r.segments = Number(vp.match(/segments=(\d+)/)?.[1] ?? NaN);
      r.videoQueueWaitMs = queued ? tsOf(vp) - queued - r.processingMs : null;
    }
    const derived = file.find((l) => l.includes(`transcribeDerivedAudio: fileId=${r.fileId} `) && /chars=|status=/.test(l));
    if (derived) r.derivedAudio = derived.slice(derived.indexOf('transcribeDerivedAudio')).slice(0, 160);
  }
  // TTS provider time vs our overhead.
  for (const r of ttsRuns) {
    if (!r.messageId) continue;
    const attempts = chat
      .filter((l) => l.includes('ttsAttempt {') && l.includes(`"messageId":"${r.messageId}"`))
      .map((l) => {
        try {
          return JSON.parse(l.slice(l.indexOf('{')).trim());
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    r.ttsAttempts = attempts.map((a) => ({ provider: a.provider, model: a.model, outcome: a.outcome, latencyMs: a.latencyMs }));
    const providerMs = attempts.reduce((s, a) => s + (a.latencyMs ?? 0), 0);
    if (attempts.length > 0) {
      r.providerMs = providerMs;
      if (r.ok) r.overheadMs = r.ms - providerMs;
    }
  }
  if (replay?.messageId) replay.logged = chat.some((l) => l.includes(`synthesize: replay messageId=${replay.messageId}`));

  const count = (lines, re) => lines.filter((l) => re.test(l)).length;
  const gemini = file
    .filter((l) => l.includes('transcribeWithGemini: received'))
    .map((l) => {
      const m = l.match(/received (\d+) characters(?: — prompt=(\d+) completion=(\d+))?/);
      return m ? { chars: Number(m[1]), prompt: Number(m[2] ?? NaN), completion: Number(m[3] ?? NaN) } : null;
    })
    .filter(Boolean);
  const reasons = {};
  for (const l of file.filter((x) => /runCandidates: .* failed — /.test(x))) {
    const reason = l.slice(l.indexOf('failed — ') + 9).trim().slice(0, 100);
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  }
  const ttsOutcomes = {};
  for (const l of chat.filter((x) => x.includes('ttsAttempt {'))) {
    const o = l.match(/"outcome":"(\w+)"/)?.[1] ?? 'UNKNOWN';
    ttsOutcomes[o] = (ttsOutcomes[o] ?? 0) + 1;
  }
  return {
    fileService: {
      emptyTranscript: count(file, /empty transcript/i),
      http429: count(file, HTTP_429),
      timeouts: count(file, /timed? ?out|TIMEOUT|AbortError|deadline/i),
      transcriptionFailedStatus: count(file, /status=FAILED|TRANSCRIPTION_FAILED/),
      videoFailed: count(file, /videoFailed: /),
      candidateFailureReasons: reasons,
      geminiReceived: gemini,
      geminiZeroCharWithCompletionTokens: gemini.filter((g) => g.chars === 0 && g.completion > 0).length,
    },
    chatService: {
      ttsAttemptOutcomes: ttsOutcomes,
      ttsFailed: count(chat, /TTS_FAILED/),
      ttsHoldRefused: count(chat, /TTS hold refused/),
      http429: count(chat, HTTP_429),
      ttsReleased: count(chat, /ttsSettlement .*outcome=RELEASED/),
    },
  };
}

// ─── report ─────────────────────────────────────────────────────────────────

function summarise(label, rows, field = 'ms') {
  const ok = rows.filter((r) => r.ok);
  const s = stats(ok.map((r) => r[field]));
  return { label, n: rows.length, ok: ok.length, successRate: rows.length ? ok.length / rows.length : 0, ...s, failures: rows.filter((r) => !r.ok).map((r) => r.reason ?? 'unknown') };
}

function markdown(summary) {
  const fmt = (v) => (v === null || v === undefined ? '—' : `${(v / 1000).toFixed(1)}s`);
  const lines = [
    '| Lane | N | OK | min | median | max | notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const s of summary) {
    lines.push(`| ${s.label} | ${s.n} | ${s.ok} | ${fmt(s.min)} | ${fmt(s.median)} | ${fmt(s.max)} | ${s.notes ?? ''} |`);
  }
  return lines.join('\n');
}

async function main() {
  log(`bench start ${RUN_START.toISOString()} base=${BASE} N=${N}`);
  const acct = await paidAccount();
  log(`paid throwaway user created on plan ${acct.plan} (wallet +$5)`);
  const avail = await api('GET', '/chat-messages/speech/availability', acct.token);
  log(`speech availability: ${avail.text.slice(0, 120)}`);
  const echo = await pickEchoModel(acct.token);
  log(`echo model: ${echo ? `${echo.provider}/${echo.model}` : 'AUTO'}`);

  const tts = await ttsLane(acct.token, echo);
  let fixtures = null;
  let stt = [];
  let video = [];
  let fixtureError = null;
  try {
    fixtures = await buildFixtures(acct.token, tts.runs);
    stt = await sttLane(acct.token, fixtures.voice);
    video = await videoLane(acct.token, fixtures.video);
  } catch (e) {
    fixtureError = e.message;
    log(`fixtures/STT/video aborted: ${e.message}`);
  }
  const logs = analyseLogs(stt, video, tts.runs, tts.replay);

  const summary = [];
  for (const size of TTS_SIZES) {
    const rows = tts.runs.filter((r) => r.size === size);
    const s = summarise(`TTS ~${size} chars`, rows);
    const prov = stats(rows.filter((r) => r.ok).map((r) => r.providerMs));
    const chars = stats(rows.map((r) => r.characters ?? r.replyChars));
    s.providerMs = prov;
    s.notes = `spoken chars med ${chars.median ?? '—'}; provider med ${prov.median === null ? '—' : `${(prov.median / 1000).toFixed(1)}s`}`;
    summary.push(s);
  }
  if (tts.replay) {
    summary.push({ label: 'TTS cached replay', n: 1, ok: tts.replay.ok && tts.replay.cached ? 1 : 0, min: tts.replay.ms, median: tts.replay.ms, max: tts.replay.ms, failures: tts.replay.ok ? [] : [tts.replay.reason], notes: `cached=${tts.replay.cached}` });
  }
  for (const secs of STT_SECONDS) {
    const rows = stt.filter((r) => r.target === secs);
    const s = summarise(`STT ~${secs}s voice note`, rows, 'totalMs');
    const q = stats(rows.map((r) => r.queueWaitMs));
    const job = stats(rows.map((r) => r.jobMs));
    const chars = stats(rows.map((r) => r.transcriptChars));
    s.queueWaitMs = q;
    s.jobMs = job;
    s.notes = `audio ${[...new Set(rows.map((r) => r.durationS))].join('/')}s; transcript chars med ${chars.median ?? '—'}; queue→hold med ${q.median ?? '—'}ms; job med ${job.median ?? '—'}ms`;
    summary.push(s);
  }
  for (const secs of VIDEO_SECONDS) {
    const rows = video.filter((r) => r.target === secs);
    const s = summarise(`Video ${secs}s mp4`, rows, 'totalMs');
    const p = stats(rows.map((r) => r.processingMs));
    s.processingMs = p;
    s.notes = `processingMs med ${p.median ?? '—'}; audio ${[...new Set(rows.map((r) => r.audioStatus).filter(Boolean))].join('/') || '—'}`;
    summary.push(s);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    runStart: RUN_START.toISOString(),
    base: BASE,
    n: N,
    plan: acct.plan,
    echoModel: echo,
    speechAvailability: avail.json,
    fixtureError,
    fixtures: fixtures && {
      speechSecondsAvailable: fixtures.speechSecondsAvailable,
      sourceClips: fixtures.sourceClips,
      voice: fixtures.voice.map(({ path: _p, ...rest }) => rest),
      video: fixtures.video.map(({ path: _p, ...rest }) => rest),
    },
    summary,
    tts,
    stt,
    video,
    logs,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  fs.rmSync(WORK, { recursive: true, force: true });

  process.stdout.write(`\n## Media latency bench (${RUN_START.toISOString()}, N=${N})\n\n${markdown(summary)}\n\n`);
  const fails = summary.flatMap((s) => s.failures.map((f) => `- ${s.label}: ${f}`));
  process.stdout.write(`### Failures\n\n${fails.length ? fails.join('\n') : '- none'}\n\n`);
  process.stdout.write(`### Log counts\n\n\`\`\`json\n${JSON.stringify({ fileService: { ...logs.fileService, geminiReceived: undefined }, chatService: logs.chatService }, null, 2)}\n\`\`\`\n\nJSON: ${path.relative(REPO, OUT)}\n`);
}

main().catch((e) => {
  log(`bench failed: ${e.stack ?? e.message}`);
  process.exit(1);
});
