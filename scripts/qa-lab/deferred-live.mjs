// Cheap live proof for the once-deferred multimodal items: OpenAI STT
// (gpt-4o-mini-transcribe, metered), LOCAL STT (free), OpenAI masked edit.
// Cloud connectors are toggled off/on through the admin API and always restored.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0';
const { ensureAccounts, apiLogin, api } = await import('./multimodal-ui-accounts.mjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const TTS = 'speaches-ai/Kokoro-82M-v1.0-ONNX';

const { paid } = await ensureAccounts();
const admin = await apiLogin(process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD);
const paidToken = await apiLogin(paid.email, paid.password);
const conRes = await api('GET', '/connectors', admin);
const cons = Array.isArray(conRes.json) ? conRes.json : (conRes.json.data ?? conRes.json.items ?? []);
const byProv = (p) => cons.filter((c) => c.provider === p);
const gemini = byProv('GEMINI');
const openai = byProv('OPENAI');
console.log('connectors gemini=%d openai=%d', gemini.length, openai.length);
const setEnabled = async (list, on) => {
  for (const c of list) await api('PATCH', `/connectors/${c.id}`, admin, { isEnabled: on });
};
const restore = async () => {
  for (const c of cons.filter((x) => ['GEMINI', 'OPENAI'].includes(x.provider))) {
    await api('PATCH', `/connectors/${c.id}`, admin, { isEnabled: c.isEnabled });
  }
};

const wav = path.join(os.tmpdir(), 'deferred-voice.wav');
sh(`docker exec claw-file-service sh -c "wget -qO /tmp/v.wav --header='Content-Type: application/json' --post-data='{\\"model\\":\\"${TTS}\\",\\"voice\\":\\"af_heart\\",\\"input\\":\\"The quick brown fox jumps over the lazy dog near the river.\\",\\"response_format\\":\\"wav\\"}' http://speech:8000/v1/audio/speech"`);
sh(`docker cp claw-file-service:/tmp/v.wav "${wav}"`);
const b64 = fs.readFileSync(wav).toString('base64');
console.log('voice fixture bytes', fs.statSync(wav).size);

async function stt(label) {
  const since = new Date().toISOString();
  const up = await api('POST', '/files/upload', paidToken, { filename: `${label}.wav`, mimeType: 'audio/wav', sizeBytes: fs.statSync(wav).size, content: b64 });
  const id = up.json.id;
  let file;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    file = (await api('GET', `/files/${id}`, paidToken)).json;
    if (!(file.extractedText ?? '').startsWith('[Audio file: ') || file.extractionError) break;
  }
  const logs = sh(`docker logs claw-file-service --since ${since} 2>&1`).split('\n').filter((l) => l.includes(id) && /provider=|model=|finalize|reserve|release/.test(l)).map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 260));
  console.log(`\n[${label}] text=${JSON.stringify((file.extractedText ?? '').slice(0, 120))} err=${file.extractionError ?? ''}`);
  logs.slice(-6).forEach((l) => console.log('  log:', l));
}

function png(w, h, rgba) {
  const bpp = rgba ? 4 : 3; const raw = Buffer.alloc((w * bpp + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * bpp + 1) + 1 + x * bpp; if (rgba) { const hole = x > 20 && x < 44 && y > 20 && y < 44; raw[o] = 0; raw[o + 1] = 0; raw[o + 2] = 0; raw[o + 3] = hole ? 0 : 255; } else { raw[o] = x < 32 ? 220 : 20; raw[o + 1] = 40; raw[o + 2] = y < 32 ? 30 : 200; } }
  const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = rgba ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]).toString('base64');
}
async function upPng(name, b) { const r = await api('POST', '/files/upload', paidToken, { filename: name, mimeType: 'image/png', sizeBytes: Buffer.from(b, 'base64').length, content: b }); return r.json.id; }

async function maskedEdit() {
  const ref = await upPng('ref.png', png(64, 64, false));
  const mask = await upPng('mask.png', png(64, 64, true));
  const t = await api('POST', '/chat-threads', paidToken, { title: 'mask edit', routingMode: 'AUTO' });
  await api('POST', '/chat-messages', paidToken, { threadId: t.json.id, routingMode: 'AUTO', content: 'Edit this image: fill the masked area with a small red circle', fileIds: [ref], maskFileId: mask });
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const m = await api('GET', `/chat-messages/thread/${t.json.id}?limit=10`, paidToken);
    const rows = Array.isArray(m.json) ? m.json : (m.json.items ?? m.json.data ?? []);
    const a = rows.find((x) => x.role === 'ASSISTANT');
    if (a) {
      const gid = a.metadata?.generationId; let st = '-'; let prov = '-';
      if (gid) for (let j = 0; j < 40; j++) { await sleep(3000); const g = (await api('GET', `/images/${gid}`, paidToken)).json; st = g.latest?.status ?? g.status; prov = g.latest?.provider ?? g.provider; if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(st)) break; }
      console.log(`\n[masked edit] job=${gid ? 'YES' : 'NO'} status=${st} provider=${prov} reply=${(a.content ?? '').slice(0, 140).replace(/\n/g, ' ')}`);
      return;
    }
  }
  console.log('[masked edit] TIMEOUT');
}

try {
  await setEnabled(gemini, false);
  console.log('gemini disabled; waiting for capability cache');
  await sleep(70000);
  await stt('openai-stt');
  await maskedEdit();
  await setEnabled(openai, false);
  console.log('\nopenai disabled too; waiting');
  await sleep(70000);
  await stt('local-stt');
} finally {
  await restore();
  console.log('\nconnectors restored');
}
